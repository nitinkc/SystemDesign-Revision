# Key Value Store

> **Interview Time:** 60-90 min | **Difficulty:** Hard  
> **Key Focus:** Partitioning, replication, consistency models, compression

---

## Step 1: Functional & Non-Functional Requirements

### Functional Requirements

- GET(key) → value
- PUT(key, value) → write confirmation
- DELETE(key)
- Batch operations (multi-get, multi-put)
- Conditional writes (CAS: compare-and-swap)
- TTL support (keys auto-expire)
- Atomic operations (increment, append)
- Range queries (scan key prefix)
- Transaction support (eventual consistency versions)

### Non-Functional Requirements

| Requirement | Target | Notes |
|:-----------|:-------|:------|
| **Scale** | 1B keys, 100 TB data, 1M ops/sec | Distributed across 100+ servers |
| **Throughput** | Read: 10M QPS, Write: 1M QPS | Peak: 2x nominal |
| **Latency** | p99 <10ms (local), <50ms (remote) | Write durability vs speed trade-off |
| **Consistency** | Eventual (AP in CAP) | Tolerate network partitions |
| **Availability** | 99.99% uptime | Survive node failures transparently |
| **Durability** | Zero data loss | Write-ahead log + replication |
| **Fault Tolerance** | Tolerate up to N-1 node failures | Replication factor N |

---

## Step 2: API Design, Data Model & High-Level Design

### Core API Endpoints

```http
GET /cache/{key}
  → {value, version: 1, ttl_remaining_sec: 3600}

PUT /cache/{key}
  {value, ttl_sec: 3600, condition: NONE|CAS_V2}
  → {version: 2, success: true}

DELETE /cache/{key}
  → {success: true}

GET /cache/{prefix}?scan=true
  ?start_key=user:100&max_results=1000
  → {keys: [...], next_token: "..."}

POST /cache/batch
  {operations: [{op: GET|PUT|DEL, key, value?}]}
  → {results: {...}}

POST /cache/{key}/cas
  {old_version: 2, new_value, new_ttl: 3600}
  → {success: true|false, current_version: 3}
```

### Entity Data Model

```
KEY_VALUE_STORE
├─ key (PK, hash for sharding)
├─ value (BLOB)
├─ version (monotonic, for CAS)
├─ ttl_expiry (unix timestamp)
├─ last_modified_at
├─ replicas: [server1:version2, server2:version2, server3:version1]

REPLICATION_LOG
├─ server_id, operation_id (PK)
├─ key, value, operation (PUT|DELETE)
├─ version, timestamp
├─ replicas_acked: 1-3

WAL (Write-Ahead Log, durable storage)
├─ server_id, log_sequence_number (PK)
├─ operation (PUT, DELETE)
├─ key, value, version
├─ timestamp_ms
```

### High-Level Architecture

```mermaid
graph TB
    Client["Client"]
    LB["Load Balancer<br/>(shard coordinator)"]
    
    Server1["KV Server 1<br/>(shard 1)"]
    Server2["KV Server 2<br/>(shard 2)"]
    ServerN["KV Server N<br/>(shard N)"]
    
    MemCache["In-Memory Cache<br/>(hot data)"]
    WAL["Write-Ahead Log<br/>(durability)"]
    
    Replica1["Replica Server 1"]
    Replica2["Replica Server 2"]
    
    Replication["Replication Queue<br/>(async)"]
    
    Coordinator["Cluster Coordinator<br/>(shard info)"]
    Monitoring["Monitoring<br/>(consistency)"]

    Client -->|hash(key)| LB
    LB --> Server1
    LB --> Server2
    LB --> ServerN
    
    Server1 --> MemCache
    Server1 --> WAL
    Server1 --> Replication
    
    Replication --> Replica1
    Replication --> Replica2
    
    Server1 -.->|sync_state| Coordinator
    Coordinator -.->|node_mapping| LB
    
    Server1 --> Monitoring
```

---

## Step 3: Concurrency, Consistency & Scalability

### 🔴 Problem: Consistency Across Replicas During Writes

**Scenario:** Write key=X to primary server 1. Replicate to servers 2&3. But server 2 crashes mid-write. Replicas have different values.

**Solutions:**

| Approach | Implementation | Pros | Cons |
|:---------|:---------------|:-----|:-----|
| **Eventual Consistency** | Write returns before replicas confirm | Fast, resilient | Reads might see old data |
| **Quorum Writes** | Write succeeds if N/2+1 nodes ack | Strong consistency | Slower (wait for majority) |
| **Two-Phase Commit** | Prepare phase (lock), Commit phase | ACID-like | Blocks on any failure, slow |
| **Vector Clocks** | Track causality of updates for merge | Detects conflicts | Complex, resolution logic needed |

**Recommended:** **Quorum-based replication (N=3, W=2, R=2)**

```python
class KVServer:
    def put_with_quorum(self, key: str, value: str, ttl_sec: int, replication_factor=3):
        """Write with quorum consistency (N=3, W=2)"""
        
        # 1. Write locally with WAL
        version = self.write_local(key, value, ttl_sec)
        self.wal.write(f"PUT {key}={value} v{version}")
        
        # 2. Replicate to other servers asynchronously
        target_replicas = self.select_replicas(key, num=replication_factor)
        acks_received = 1  # We (primary) already wrote
        
        futures = []
        for replica_server in target_replicas:
            future = self.replicate_async(replica_server, key, value, version)
            futures.append(future)
        
        # 3. Wait for quorum (W=2: us + 1 other)
        required_acks = self.quorum_size(replication_factor)  # ceil((replication_factor + 1) / 2)
        start_time = time.time()
        timeout_ms = 100
        
        while acks_received < required_acks:
            # Check which replicas have acked
            for future in futures:
                if future.ready() and future.success:
                    acks_received += 1
                    futures.remove(future)
            
            if time.time() - start_time > timeout_ms / 1000:
                # Timeout: we have quorum if acks >= required
                if acks_received >= required_acks:
                    break
                else:
                    raise QuorumWriteError(f"Only {acks_received}/{required_acks} acks")
        
        # 4. Return success after quorum
        return {'version': version, 'success': True}
    
    def get_with_read_repair(self, key: str, replication_factor=3, read_quorum=2):
        """Read with quorum consistency (R=2) + repair"""
        
        # Fetch from multiple replicas in parallel
        target_servers = self.select_replicas(key, num=replication_factor)
        values = []
        latencies = []
        
        for server in target_servers:
            try:
                value, version, timestamp = self.read_remote(server, key, timeout_ms=50)
                values.append((value, version, timestamp, server))
            except TimeoutError:
                latencies.append(('timeout', server))
        
        # Wait for quorum (R=2)
        if len(values) < read_quorum:
            raise QuorumReadError(f"Only {len(values)}/{read_quorum} replicas responded")
        
        # Use highest version (causally consistent)
        latest_entry = max(values, key=lambda x: (x[1], x[2]))  # max by (version, timestamp)
        latest_value, latest_version, _, _ = latest_entry
        
        # Read repair: update replicas with stale versions
        for value, version, timestamp, server in values:
            if version < latest_version:
                # This replica is stale; update in background
                self.write_async(server, key, latest_value, latest_version)
        
        return latest_value
```

**Quorum Sizes:**

```
Replication factor: 3 nodes
Write Quorum (W): ceil(3/2) = 2 → wait for us + 1 replica
Read Quorum (R): ceil(3/2) = 2  → read from 2, pick highest version
Result: W + R = 2 + 2 = 4 > N=3 → Strong consistency guaranteed

Replication factor: 5 nodes
Write Quorum (W): ceil(5/2) = 3
Read Quorum (R): ceil(5/2) = 3
Result: W + R = 6 > 5 → Strong consistency guaranteed
```

---

### 🟡 Problem: Hot Keys & Uneven Load

**Scenario:** Key "global_config" accessed 100K times/sec. One server overloaded, becomes bottleneck.

**Solution:** Local caching + read replicas for hot keys

```python
class KVCluster:
    def replicate_hot_key(self, key: str):
        """Detect and replicate hot keys to more servers"""
        
        # Monitor: if key accessed >50K/sec, replicate
        access_rate = self.metric_tracker.get_rate(f"access:{key}")
        
        if access_rate > 50000:
            # This is a hot key; create additional replicas
            current_server = self.get_primary_server(key)
            
            # Create copy on secondary servers (not in primary's replica set)
            for _ in range(5):  # 5 additional replicas
                replica_server = self.select_hot_replica_server(exclude=[current_server])
                self.create_hot_key_replica(key, current_server, replica_server)
            
            # Reads now fan-out to all replicas (round-robin)
            # Writes still go to primary
    
    def handle_hot_key_read(self, key: str, replication_factor=3):
        """Read hot key from least-loaded replica"""
        
        # Get ALL servers holding this key (primary + hot replicas)
        all_servers = self.get_all_replicas(key)
        
        # Pick least-loaded server
        server_loads = [(s, s.current_connections) for s in all_servers]
        least_loaded = min(server_loads, key=lambda x: x[1])
        
        return self.read_from_server(least_loaded[0], key)
```

---

### 💾 Problem: Handling Temporary Failures (Node Down)

**Scenario:** Server 2 of 3 dies. Replica factor drops from 3 to 2. If server 1 fails, we lose data forever.

**Solution:** Hinted handoff + anti-entropy

```python
class ReplicationManager:
    def handle_replica_failure(self, failed_server_id: str):
        """Maintain replication factor when node fails"""
        
        # Find keys that lost a replica
        affected_keys = self.find_keys_on_server(failed_server_id)
        
        # For each key, if replicas < replication_factor:
        for key in affected_keys:
            current_replicas = self.get_replicas(key)
            
            if len(current_replicas) < self.replication_factor:
                # Find new server for replica
                new_server = self.select_replica_server(exclude=current_replicas)
                
                # Re-replicate this key to new server
                self.replicate_key_to_server(key, new_server)
                
                # Update replica list
                self.update_replicas(key, current_replicas + [new_server])
    
    def hinted_handoff(self, failed_server_id: str):
        """Temporarily route writes to backup server (hints)"""
        
        # When writing to failed_server, send via temporary "hint" server
        hint_key = f"hint:{failed_server_id}:{key}"
        
        # Hint server stores: (original_target, key, value, version, timestamp)
        # When failed_server comes back online:
        #   - Hint server re-sends all hint data to original server
        #   - Confirms delivery, deletes hints
        # This prevents version conflicts and maintains consistency
```

---

## Step 4: Persistence Layer, Caching & Monitoring

### Database Design

```sql
-- Main key-value store (in-memory)
CREATE TABLE kv_store (
    key TEXT PRIMARY KEY,  -- Hash partitioned
    value BLOB,
    version INT,
    ttl_expiry INT,  -- Unix timestamp, NULL if no expiry
    last_modified_ms INT,
    flags INT  -- For CAS, type info, etc.
);

-- Write-Ahead Log (durable on disk)
CREATE TABLE wal (
    server_id TEXT,
    log_sequence_number BIGINT,
    operation TEXT,  -- PUT, DELETE, etc.
    key TEXT,
    value BLOB,
    version INT,
    timestamp_ms INT,
    PRIMARY KEY (server_id, log_sequence_number DESC)  -- Recent first
) WITH TTL 604800;  -- Keep 7 days then expire

-- Replication queue (async)
CREATE TABLE replication_queue (
    server_id TEXT,
    op_sequence INT PRIMARY KEY,
    key TEXT,
    value BLOB,
    operation TEXT,
    version INT,
    replicas_acked INT,
    timestamp_ms INT
);

-- Index for TTL expiry
CREATE INDEX idx_kv_ttl ON kv_store(ttl_expiry) 
WHERE ttl_expiry IS NOT NULL;
```

### Caching Strategy

```
TIER 1: In-Memory Hash Table (primary data)
├─ All active keys + values
├─ Bloom filter for non-existent keys (prevent reads)
└─ Fast access: ~100 nanoseconds

TIER 2: L2 Cache (disk-backed, for recovery)
├─ Persistent storage (RocksDB or similar)
├─ Survives restarts
└─ Read on cache miss

Invalidation:
- TTL: background job deletes expired keys every 5 min
- Writes: update in-memory, log to WAL immediately
- Reads: always check memory, fall through to disk if missing
```

### Monitoring & Alerts

**Key Metrics:**

1. **Replication Lag** — Time for writes to reach all replicas (target: <10ms)
2. **Consistency** — Replica divergence (should be 0)
3. **Hot Keys** — Keys accessed >10K/sec (need replication)
4. **Availability** — Failed read/write rate (target: <0.01%)
5. **Durability** — WAL write latency (target: <1ms)

```yaml
- alert: ReplicationLagHigh
  expr: replication_lag_ms > 100
  for: 1m
  annotations: "Replication lag: {{$value}}ms (target: <10ms)"

- alert: HotKeyDetected
  expr: per_key_access_rate > 50000
  annotations: "Hot key detected: {{$labels.key}} ({{$value}}/sec access rate)"

- alert: ReplicaDivergence
  expr: count(replica_version_mismatch) > 0
  annotations: "{{$value}} keys diverged across replicas"

- alert: WriteFailureRate
  expr: rate(write_failures_total[5m]) / rate(write_requests_total[5m]) > 0.0001
  annotations: "Write failure rate: {{$value | humanizePercentage}}"

- alert: WALLatencyHigh
  expr: histogram_quantile(0.99, rate(wal_write_latency_seconds_bucket[5m])) > 0.001
  annotations: "WAL p99 latency: {{$value}}s (target: <1ms)"

- alert: ServerDown
  expr: up{job="kvstore"} == 0
  for: 1m
  annotations: "KV Server {{$labels.instance}} is down"
```

---

## ⚡ Quick Reference Cheat Sheet

### When to Use What

| Need | Technology | Why |
|:-----|:-----------|:----|
| **Strong consistency** | Quorum reads (R) + quorum writes (W) where W+R > N | Guarantees read-after-write |
| **High throughput** | In-memory hash table + async WAL | Avoid disk I/O on writes |
| **Durability** | Write-Ahead Log (local disk) + replication | Survive single node failure |
| **Hot keys** | Replicate to additional servers, round-robin reads | Prevent single-server bottleneck |
| **Failure recovery** | Hinted handoff + anti-entropy | Maintain replication factor during outages |
| **Version tracking** | Vector clocks or monotonic version numbers | Detect conflicts, read repair |

### Critical Design Decisions

- **Replication N=3, W=2, R=2:** Strong consistency, tolerates 1 node failure
- **Async replication queue:** High write throughput; eventual consistency for non-critical data
- **Quorum-based reads:** Pick highest version + read repair to maintain consistency
- **Write-Ahead Log:** Persist every write before returning to client (durability)
- **Hot key detection + replication:** Replicate to multiple servers, fan-out reads
- **TTL background cleanup:** Periodically delete expired keys (don't wait for read)

### Tech Stack Summary

```
In-Memory Store: RocksDB, Redis, Memcached
Replication: Quorum model (N/2+1 acks)
Durability: WAL (write-ahead log) + persistent storage
Partitioning: Consistent hashing by key
Monitoring: Prometheus + custom metrics
Cluster Coordinator: Zookeeper or custom
```

---

## 🎯 Interview Summary (5 Minutes)

1. **Distributed partitioning:** Hash(key) → server ID ensures keys go to same server always
2. **Quorum consistency:** N=3 replicas, W=2 writes, R=2 reads → strong consistency with fault tolerance
3. **Async replication:** Write returns after local WAL + primary replica acks; secondary lagging ok
4. **Hot key replication:** Detect keys >50K ops/sec, create additional replicas, fan-out reads
5. **Failure handling:** Hinted handoff (temp replicate to backup); anti-entropy (background sync)
6. **Durability:** Write-Ahead Log guarantees each write persists before returning to client
7. **Read repair:** On quorum read, detect stale replicas and update them in background

---

## Glossary & Abbreviations

--8<-- "_abbreviations.md"
