# Distributed Messaging System

> **Interview Time:** 60-90 min | **Difficulty:** Hard  
> **Key Focus:** Message ordering, exactly-once delivery, partitioning, replication, consumer groups

---

## Step 1: Functional & Non-Functional Requirements

### Functional Requirements

- Producers publish messages to topics (named channels)
- Consumers subscribe to topics and read messages
- Messages ordered per topic (FIFO queue semantics)
- Multiple consumers can read from same topic in parallel (partitioning)
- Consumer groups: multiple consumers share message load
- Offset management: consumers track position, can rewind
- Exactly-once delivery semantics (no duplicates, no losses)
- Re-playability: consumers can replay from any point in time
- Dead letter queues for failed messages
- Message TTL (time-to-live before cleanup)

### Non-Functional Requirements

| Requirement | Target | Notes |
|:-----------|:-------|:------|
| **Throughput** | 1M+ messages/sec | Partitioned for scalability |
| **Latency** | <10ms end-to-end (P99) | In-memory buffer + disk fsync |
| **Ordering** | Per-partition ordering guaranteed | Global order not required |
| **Reliability** | 99.99% availability | Replicated across 3+ brokers |
| **Delivery Semantics** | Exactly-once (within producer/consumer) | Handle idempotence |
| **Data Retention** | Configurable (24 hours - 30 days) | Disk-based, not in-memory |

---

## Step 2: API Design, Data Model & High-Level Design

### Core API Endpoints/Methods

```
PRODUCER API:

producer.send(topic, key, value)
  topic: "orders"
  key: user_id (determines partition)
  value: {order_id, total_price, timestamp}
  → {partition: 2, offset: 456789, timestamp}

Send is async, batches messages:
  Batch size: 100 messages or 100ms (whichever first)
  Destination: partition determined by hash(key)


CONSUMER API:

consumer.subscribe(["orders", "payments"])
  → Join consumer group, listen to 2 topics

message = consumer.poll(timeout_ms=1000)
  → {topic: orders, partition: 2, offset: 456789, key, value}

consumer.commit_offset()
  → Saves offset to offset store (Zookeeper/dedicated broker)
  → Next poll reads from saved offset

consumer.seek_to_offset(topic, partition, offset)
  → Jump to specific offset
  → For replaying history


BROKER (server) OPERATIONS:

Create topic:
  admin.create_topic("events", 
    num_partitions=12,
    replication_factor=3
  )
  → Topic with 12 partitions, each replicated 3x

Delete topic:
  admin.delete_topic("events")
  → Irreversible
```

### Entity Data Model

```
BROKERS (server nodes)
├─ broker_id (1, 2, 3, ...)
├─ hostname, port
├─ log_dir (disk storage for messages)
└─ status (HEALTHY, DEGRADED, DOWN)

TOPICS (named message channels)
├─ topic_id (PK)
├─ name (e.g., "orders", "payments")
├─ num_partitions (e.g., 12)
├─ replication_factor (e.g., 3)
├─ retention_ms (e.g., 86400000 = 1 day)
├─ config (compression, min_insync_replicas)
├─ created_at

PARTITIONS (shards within topic)
├─ topic_id (FK)
├─ partition_num (0, 1, 2, ... num_partitions-1)
├─ leader_broker_id (primary for writes)
├─ replicas (broker_ids where copied)
├─ isr (in-sync replicas, min_insync_replicas count)
├─ high_watermark (latest committed message)

MESSAGES (persisted to disk log)
├─ topic_id (FK)
├─ partition_num (part of PK)
├─ offset (sequence number in partition, PK)
├─ key (nullable, determines partition)
├─ value (binary payload)
├─ timestamp_ms
├─ checksum (for integrity)
├─ compression_type

-- Physically stored as:
-- /brokers/{broker_id}/logs/{topic}/{partition}/
-- Files: 00000000000000.log, 00000000000000.index (offset index)

CONSUMER_GROUPS
├─ group_id (e.g., "order-processing-service")
├─ members (consumer_ids in group)
├─ created_at

CONSUMER_OFFSETS (tracking read position)
├─ group_id (FK)
├─ topic_id (FK)
├─ partition_num
├─ offset (highest message consumed)
├─ timestamp
├─ PRIMARY KEY (group_id, topic_id, partition_num)

-- Special topic: __consumer_offsets (built-in)
-- Stores these records as messages for replication
```

### High-Level Architecture

```mermaid
graph TB
    Producer["📤 Producer<br/>(order service)"]
    
    BROKER1["Broker 1<br/>(Leader for P0, P1)"]
    BROKER2["Broker 2<br/>(Replica for P0, P1,<br/>Leader for P2)"]
    BROKER3["Broker 3<br/>(Replica for P2, P3,<br/>Leader for P3)"]
    
    ZK["Zookeeper<br/>(metadata,<br/>broker discovery)"]
    OFFSET_BROKER["Offset Manager<br/>(track consumer<br/>position)"]
    
    Consumer1["📥 Consumer 1<br/>(group-A)<br/>reads P0"]
    Consumer2["📥 Consumer 2<br/>(group-A)<br/>reads P1"]
    Consumer3["📥 Consumer 3<br/>(group-B)<br/>reads all"]

    Producer -->|hash(key) → P0| BROKER1
    Producer -->|hash(key) → P1| BROKER1
    Producer -->|hash(key) → P2| BROKER2
    Producer -->|hash(key) → P3| BROKER3
    
    BROKER1 -->|replicate P0,P1| BROKER2
    BROKER1 -->|replicate P0,P1| BROKER3
    
    BROKER2 -->|replicate P2| BROKER1
    BROKER2 -->|replicate P2| BROKER3
    
    BROKER3 -->|replicate P3| BROKER1
    BROKER3 -->|replicate P3| BROKER2
    
    BROKER1 --> ZK
    BROKER2 --> ZK
    BROKER3 --> ZK
    
    Consumer1 -->|subscribe orders| BROKER1
    Consumer2 -->|subscribe orders| BROKER1
    Consumer3 -->|subscribe orders, payments| BROKER1
    
    Consumer1 --> OFFSET_BROKER
    Consumer2 --> OFFSET_BROKER
    Consumer3 --> OFFSET_BROKER
```

---

## Step 3: Concurrency, Consistency & Scalability

### 🔴 Problem: Exactly-Once Delivery Semantics

**Scenario:** Message published, consumed, processed. Consumer crashes before committing offset. Message reprocessed = duplicate.

**Solution: Idempotent Processing + Offset Commits**

```
Three delivery guarantees:

1. At-Most-Once: Message may be lost, no duplicates
   → Fast, no replay
   → Use: non-critical events (impressions)

2. At-Least-Once: Message never lost, may duplicate
   → Default in Kafka
   → Use: most use cases (requires idempotent consumers)

3. Exactly-Once: Exactly one delivery, no loss, no dups
   → Requires application-level coordination
   → Use: financial transactions (payment)


Achieving Exactly-Once:

Step 1: Idempotent Producer
  producer.send(
    topic="payments",
    key="user_456",
    value={payment_id: "PAY_789", amount: 100},
    idempotence_enabled=True  ← KEY
  )
  
  Producer tracks: sequence_num per partition
  If send fails and retried:
    Broker sees same sequence_num
    Broker deduplicates: "Already have sequence 5"
    Returns: "OK (duplicate)"
  
  Result: Can safely retry without double-charging

Step 2: Exactly-once processing (transactional)
  
  consumer.poll() → {key: "user_456", value: {payment_id: "PAY_789"}}
  
  Transaction:
    BEGIN
    
    1. Process message (idempotent operation):
       UPDATE wallet SET balance = balance - 100
       WHERE user_id = 456
       AND payment_id = "PAY_789"  ← Idempotency key prevents double debit
    
    2. Commit offset:
       UPDATE __consumer_offsets 
       SET offset = 12345
       WHERE group_id = "payment-service" AND partition = 2
    
    3. Both happen atomically in same transaction
       → Either both succeed or both rollback
       → If consumer crashes after COMMIT:
         → Offset is saved
         → Next poll starts from 12345
         → No re-processing
    
    COMMIT

Result:
  - Message processed exactly once
  - No loss, no duplicates
  - Idempotent payment is safe even with producer retries
```

### 🟡 Problem: Message Ordering Within Topic

**Scenario:** Order messages: Create → Debit → Ship. If processed out of order, ship before debit = wrong logic.

**Solution: Single Partition per Key**

```
Topic: orders (12 partitions)
Producer sends:

Order#1: {user_id: 123, action: CREATE}
Order#1: {user_id: 123, action: DEBIT}
Order#1: {user_id: 123, action: SHIP}

Key = order_id (ensures all messages for same order go to same partition)

hash(order_id) → partition 5
hash(order_id) → partition 5  (same partition, same key)
hash(order_id) → partition 5  (guaranteed order!)

Result:
  Partition 5: [CREATE, DEBIT, SHIP] ← In order!
  Partition 3: [other orders' messages]
  Partition 7: [other orders' messages]

Global ordering NOT required (across all orders)
But per-order ordering IS guaranteed

Consumer with offset=100 reads:
  Message 100: CREATE
  Message 101: DEBIT
  Message 102: SHIP
  → Processed in order
```

### Solution: Rebalancing (Scaling Consumers)

**Scenario:**
- Consumer group "order-service" has 2 consumers
- Each reads 6 partitions (12 total)
- Scale to 4 consumers
- Need to redistribute partitions

```
BEFORE:
  Consumer A: [P0, P1, P2, P3, P4, P5]
  Consumer B: [P6, P7, P8, P9, P10, P11]

AFTER (rebalance triggered):
  Consumer A: [P0, P1, P2]
  Consumer B: [P3, P4, P5]
  Consumer C: [P6, P7, P8]
  Consumer D: [P9, P10, P11]

Steps:
1. Broker detects group membership change (new consumer joined)
2. Triggers rebalance: STOP all consumers
3. Coordinator assigns partitions:
   → Round-robin: C0:[P0,P4,P8], C1:[P1,P5,P9], C2:[P2,P6,P10], C3:[P3,P7,P11]
   → Or: RangeAssignor, StickyAssignor (minimize movement)
4. Consumers resume reading from new partitions
5. Downtime: ~5-10 seconds during rebalance

StOP_THE_WORLD issue:
  → All consumers stop, wait for rebalance
  → No progress for 10 seconds
  → Solution: Cooperative rebalancing (Kafka 2.4+)
    → Partitions gradually transition
    → Some progress during rebalance
    → Downtime reduced to 1-2 seconds
```

---

## Step 4: Persistence Layer, Caching & Monitoring

### Durability & Persistence

**Disk-based Log Architecture:**

```
Each partition stored as sequence of log segments:

/data/topic-orders/partition-5/
  ├─ 00000000000000000000.log (1GB, messages)
  ├─ 00000000000000000000.index (10MB, offset→position map)
  ├─ 00000000001073741824.log (next 1GB segment)
  └─ 00000000001073741824.index

Message format:
  [offset: 8B][size: 4B][CRC: 4B][magic: 1B][flags: 1B][key: var][value: var]

Index format (sparse, every 4KB):
  [relative_offset: 4B][file_position: 4B]

ACID Properties:

Atomicity: ✓
  Single append to log is atomic at OS level
  CRC checksum ensures integrity

Consistency: ✓
  Replicated across min_insync_replicas brokers
  Acknowledgment only after written to min quorum

Isolation: ✓
  Each consumer has own offset
  No interference between consumers

Durability: ✓
  Flushed to disk immediately (can configure interval)
  Multiple replicas on different servers

Flush modes:
  1. Flush every message (safest, slowest)
     → Latency: <3ms on SSDs
  
  2. Flush every 1000 messages or 1 second
     → Latency: High throughput, small loss risk
     → Most common
  
  3. OS filesystem cache (fastest, loss on crash)
     → Latency: <1ms
     → Risk: messages lost if broker crashes abruptly
```

### Replication Strategy

```
Leader-Follower Replication:

Topic: orders, 3 replicas (replication_factor=3)

BROKER-1 (Leader)
  ├─ Partition 0 (Leader)
  ├─ Partition 1 (Leader)
  ├─ Partition 5 (Replica)
  └─ Partition 8 (Replica)

BROKER-2 (Follower)
  ├─ Partition 0 (Replica) ← Follows Broker-1
  ├─ Partition 2 (Replica) ← Follows Broker-1
  ├─ Partition 1 (Leader)
  └─ Partition 5 (Replica)

BROKER-3 (Follower)
  ├─ Partition 0 (Replica)
  ├─ Partition 3 (Replica)
  ├─ Partition 2 (Leader)
  └─ Partition 8 (Replica)

Write Flow:
  1. Producer sends to Leader (Broker-1)
  2. Leader appends to log, responds ACK after min_insync_replicas replicas write
  3. Followers periodically fetch new messages from leader
  4. Followers append to their logs
  5. Leader tracks high_watermark (point all ISR replicas reached)

ISR (In-Sync Replicas):
  Replica is "in sync" if:
    - Lag < replica.lag.time.max.ms (default: 10 seconds)
    - Keeps up with leader
  
  If replica falls behind:
    → Drops from ISR
    → Leader no longer waits for it
    → Followers catch up in background
    → Re-join ISR when caught up

Connection drops:
  → Replica auto-removed from ISR
  → Group shrinks
  → If min_insync_replicas = 2 and only 1 replica left:
    → Producer gets exception: "Can't reach min_insync"
    → Retries until replica back online (< 10 seconds typical)
```

### Monitoring & Alerts

**Key Metrics:**

1. **Producer Performance**
   - Throughput (messages/sec)
   - P99 latency (ack receipt)
   - Failed sends (retry rate)
   - Batch size (messages batched together)

2. **Consumer Performance**
   - Lag (messages behind leader)
     - Per consumer group
     - Per partition
     - Alert if lag > 60,000 messages = can't keep up
   
   - Processing speed (messages consumed/sec)
   - Rebalancing frequency (should be rare)
   - Rebalancing duration (should be <10 sec)

3. **Broker Health**
   - Disk I/O latency (fsync time, P99 <100ms)
   - ISR size (should equal replication_factor)
   - Partition leader count (balanced across brokers)
   - Unclean leader election (loss risk indicator)

4. **Replication Lag**
   - Bytes behind leader per follower
   - Time behind (seconds, should be <1 sec)
   - Replica catch-up rate

5. **Data Integrity**
   - CRC mismatches (corruption detection)
   - Message loss events (emergency failovers)
   - Duplicate message count (should be rare with idempotence)

```yaml
- alert: ConsumerLagHigh
  expr: consumer_lag > 100000
  annotations: "Consumer group {{ group }} lagging by 100K msgs — scale consumers"

- alert: ProducerFailureRate
  expr: producer_failed_sends_ratio > 0.001
  annotations: "Producer failures > 0.1% — check broker health"

- alert: ISRShrunk
  expr: isr_size < replication_factor
  annotations: "ISR shrank to {{ isr_size }} — replica {{ replica_id }} not keeping up"

- alert: DiskLatencyHigh
  expr: fsync_latency_p99 > 500
  annotations: "Disk fsync > 500ms — I/O bottleneck or disk full"

- alert: UncleanLeaderElection
  expr: unclean_elections_count > 0
  annotations: "CRITICAL: Unclean leader election — data loss occurred"
```

---

## ⚡ Quick Reference Cheat Sheet

### Critical Design Decisions

1. **Partitioning by key** → guarantees ordering for same key (order_id → partition)
2. **Exactly-once semantics** → idempotent producers + transactional offset commits
3. **Leader-follower replication** → min_insync_replicas acknowledgment before ack to producer
4. **Offset tracking in ZK** → Consumer remembers position, survives crashes
5. **Disk-based persistence** → All messages written to log, replayed if needed
6. **Consumer group coordination** → Automatic rebalancing when members join/leave

### Trade-offs

| Guarantees | Throughput | Latency | Implementation |
|:-----------|:-----------|:--------|:---------------|
| **At-most-once** | Very high | <1ms | Fire and forget |
| **At-least-once** | High | <5ms | Commit offset after process |
| **Exactly-once** | Medium | <10ms | Idempotent + transaction |

### When to Use What

| Use Case | Guarantees | Reason |
|:---------|:-----------|:--------|
| Analytics, metrics | At-least-once | Duplicates OK, loss not acceptable |
| Payment transactions | Exactly-once | No double-charging |
| Event notifications | At-most-once | Latency critical, loss OK |
| Order processing | At-least-once | Process once, idempotent |

### Tech Stack

```
Broker: Custom or Kafka, Pulsar, RabbitMQ, AWS KinesisAPI Layer: Java/Go/Python client libs
Storage: POSIX filesystem (any language: Java, C++, Go)
Coordination: Zookeeper (Kafka <3.0) or KRaft (Kafka 3.0+)
Monitoring: Prometheus, Grafana, Burrow (consumer lag)
```

---

## 🎯 Interview Summary (5 Minutes)

1. **Partitioning** → Messages with same key go to same partition (order guarantees)
2. **Exactly-once semantics** → Idempotent producers + transactional offsets
3. **Replication** → Leader-follower with min_insync_replicas confirmation
4. **Offset management** → Consumers track position, stored in __consumer_offsets
5. **Consumer groups** → Multiple consumers parallelize, each reads different partitions
6. **Disk persistence** → All messages written to log, replayed on failure
7. **Rebalancing** → Automatic partition redistribution when group membership changes

---

## Glossary & Abbreviations

--8<-- "_abbreviations.md"

## ⚡ Quick Reference Cheat Sheet

[TODO: Fill this section]

---

## 🎯 Interview Summary (5 Minutes)

[TODO: Fill this section]

---

## Glossary & Abbreviations

--8<-- "_abbreviations.md"
