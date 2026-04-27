# System Design Glossary & Abbreviations

This glossary covers technical terms referenced across all system design materials. Each term has a quick definition and detailed explanation.

---

## Core Concepts

??? "ACID (Atomicity, Consistency, Isolation, Durability)"
    **Quick:** Database transaction guarantees.
    
    **Detailed:**
    - **Atomicity:** Transaction completes fully or not at all (no partial updates)
    - **Consistency:** Database moves from one valid state to another
    - **Isolation:** Concurrent transactions don't interfere
    - **Durability:** Committed data survives failures
    
    **Example:** Booking a room updates inventory AND creates booking record, or both fail — never just one.
    
    → **For Hotel Booking:** Use ACID for bookings to prevent double bookings.

??? "Eventual Consistency"
    **Quick:** Data becomes correct after some time, not immediately.
    
    **Detailed:** Different replicas may have different values momentarily, but all eventually agree. Weaker guarantee than strong consistency, but enables higher performance.
    
    **Example:** Availability cache shows 5 rooms, but by the time you book, 2 were taken. Refreshing inventory takes 30 seconds.
    
    → **Use for:** Caches, analytics, non-critical data. **Not for:** Bookings, payments.

??? "Strong Consistency"
    **Quick:** All readers see the same latest data immediately.
    
    **Detailed:** After a write completes, all subsequent reads reflect that write. No staleness. Achieved via locks or consensus protocols.
    
    **Trade-off:** Slower writes, but correct.
    
    → **For Hotel Booking:** Use for inventory checks before booking.

??? "Pessimistic Lock"
    **Quick:** Lock a resource before reading/modifying it to prevent conflicts.
    
    **Detailed:** 
    ```sql
    BEGIN;
    SELECT ... FROM table WHERE id = X FOR UPDATE;  -- Locks the row
    UPDATE table SET ... WHERE id = X;
    COMMIT;  -- Releases lock
    ```
    
    Other transactions block until lock released.
    
    **Pros:** Guaranteed no conflicts  
    **Cons:** Slower, risk of deadlocks
    
    → **For Hotel Booking:** Use `SELECT FOR UPDATE` on availability before decrementing.

??? "Optimistic Lock"
    **Quick:** Assume no conflict, retry if one occurs.
    
    **Detailed:**
    ```sql
    -- Version field prevents overwriting stale data
    SELECT inventory_count, version FROM availability WHERE room_id = X;
    
    UPDATE availability SET inventory_count = inventory_count - 1, version = version + 1
    WHERE room_id = X AND version = <old_version>;
    
    -- If WHERE clause returns 0 rows, another transaction changed it — retry
    ```
    
    **Pros:** Better performance under low contention  
    **Cons:** Retries needed under high contention
    
    → **For Hotel Booking:** Use when many bookings happen, but conflicts are rare.

??? "Idempotent Operation"
    **Quick:** Running the operation multiple times produces the same result as running it once.
    
    **Detailed:**
    - `GET /users/123` → always returns same user (idempotent)
    - `POST /pay` → runs twice → double charge (NOT idempotent)
    - `DELETE /bookings/456` with Idempotency-Key → runs twice → still canceled once (idempotent)
    
    **Implementation:**
    ```http
    POST /cancel-booking
    Header: Idempotency-Key: abc-123-def
    
    Server: If Key exists in log → return cached response
           If new Key → execute, cache result
    ```
    
    → **For Hotel Booking:** Cancellations must be idempotent (prevent double-refunds).

??? "Database Replication"
    **Quick:** Copying data from master DB to replica(s) for redundancy and read scaling.
    
    **Detailed:**
    - **Master (Leader):** Processes writes
    - **Replica (Follower):** Copies data, serves reads only
    - **Lag:** Time before replica catches up (typically <1 sec)
    
    **Types:**
    - Single leader + multiple replicas (most common)
    - Multi-leader replication (complex, conflicting writes)
    - Leaderless replication (e.g., DynamoDB, Cassandra)
    
    → **For Hotel Booking:** Master for bookings, replicas for historical queries.

??? "Sharding (Horizontal Partitioning)"
    **Quick:** Splitting data across multiple databases by a key (e.g., user_id, location).
    
    **Detailed:**
    ```
    Database 1: Users with IDs 0-999,999
    Database 2: Users with IDs 1,000,000-1,999,999
    Database 3: Users with IDs 2,000,000-2,999,999
    
    Shard key: user_id % 3 = database number
    ```
    
    **Pros:** Scales horizontally (add more shards)  
    **Cons:** Complex joins across shards, re-sharding overhead
    
    → **For Hotel Booking:** Shard by hotel_id or user_id for geographic scale.

??? "Bloom Filter"
    **Quick:** Space-efficient probabilistic data structure to check set membership.
    
    **Detailed:**
    - Can answer "Is X in the set?" → usually fast
    - False positives possible (says X present when it's not)
    - No false negatives (says X absent → definitely absent)
    - Space: O(n) bits (vs. O(n log n) for hash table)
    
    **Use case:** Check if user email is registered before querying database (saves DB hit on misses).
    
    → **For Hotel Booking:** Check availability before expensive Elasticsearch query.

??? "Cache-Aside Pattern"
    **Quick:** Application checks cache first; on miss, loads from DB and updates cache.
    
    **Detailed:**
    ```
    1. Request comes for key K
    2. Check cache: if K exists → return cached_value
    3. If not in cache → query database
    4. Update cache with DB result (TTL)
    5. Return to client
    ```
    
    **Pros:** Simple, app controls logic  
    **Cons:** Cache misses cause DB load (thundering herd)
    
    → **For Hotel Booking:** Cache hotel metadata and availability data.

??? "Write-Through Cache"
    **Quick:** Data written to cache AND database simultaneously.
    
    **Detailed:**
    ```
    1. Write to cache
    2. Wait for cache write
    3. Write to DB
    4. Wait for DB write
    5. Return success to client
    ```
    
    **Pros:** Cache always consistent with DB  
    **Cons:** Slower writes (must wait for both)
    
    → **For Hotel Booking:** Not recommended (too slow).

??? "Write-Behind Cache (Write-Back)"
    **Quick:** Write to cache immediately, update database asynchronously later.
    
    **Detailed:**
    ```
    1. Write to cache → return immediately to client
    2. Background job periodically flushes cache to DB
    3. On cache miss → load from DB
    
    Risk: Data loss if cache fails before flush
    ```
    
    **Pros:** Fast writes  
    **Cons:** Data loss risk, complex consistency issues
    
    → **For Hotel Booking:** Not recommended for bookings (data loss risk). Use for analytics.

??? "CDN (Content Delivery Network)"
    **Quick:** Geographically distributed servers caching static content, serving from nearest location.
    
    **Detailed:**
    - Origin server in US
    - CDN has edge nodes in: New York, London, Tokyo, Sydney, etc.
    - User in London → served from London edge node (milliseconds faster)
    - Static files: HTML, CSS, JS, images
    - Time to Live (TTL): 1 day to 1 month
    
    **Example:** CloudFront (AWS), Cloudflare, Akamai
    
    → **For Hotel Booking:** Cache hotel images, hotel list pages, search UI on CDN.

??? "Load Balancer"
    **Quick:** Distributes incoming requests across multiple servers.
    
    **Detailed:**
    - Layer 4 (TCP/UDP): Fast, no deep inspection
    - Layer 7 (HTTP): Smart, route by URL path, domain, etc.
    
    **Algorithms:**
    - Round-robin: Each server gets 1 request in turn
    - Least connections: Send to server with fewest active requests
    - IP hash: Same client always → same server (session affinity)
    
    **Example:** Nginx, HAProxy, Cloud LB (AWS/GCP/Azure)
    
    → **For Hotel Booking:** Layer 7 LB to route `/search` to search service, `/bookings` to booking service.

??? "API Rate Limiting"
    **Quick:** Limit requests per client per time window (e.g., 100 req/min).
    
    **Detailed:**
    - **Token Bucket:** Refill tokens at rate R. Each request consumes 1 token.
    - **Sliding Window:** Track requests in last N minutes, reject if > limit.
    - **Fixed Window:** Reset counter every hour/day.
    
    **Response:**
    ```http
    HTTP 429 Too Many Requests
    Retry-After: 60
    X-RateLimit-Remaining: 0
    ```
    
    → **For Hotel Booking:** Rate limit search (prevent scraping), stricter on bookings.

??? "Distributed Lock"
    **Quick:** Lock mechanism across multiple servers (e.g., Redis, Zookeeper).
    
    **Detailed:**
    ```python
    # Redis SET NX (set if not exists)
    lock_acquired = redis.set(key="booking:room:123", value="lock_token", nx=True, ex=30)
    
    if lock_acquired:
        # Do critical operation
        perform_booking()
        # Release lock
        redis.delete("booking:room:123")
    else:
        # Another process holds lock — retry later
        time.sleep(0.1)
        retry()
    ```
    
    **Pros:** Works across services  
    **Cons:** Network dependency, deadlock risk
    
    → **For Hotel Booking:** Alternative to DB locks if booking service is distributed.

??? "Message Queue / Event Stream"
    **Quick:** Asynchronous communication between services via publish-subscribe pattern.
    
    **Detailed:**
    - **Queue (point-to-point):** Message delivered to ONE consumer (RabbitMQ)
    - **Stream (broadcast):** Message delivered to ALL subscribers (Kafka, Redis Streams)
    
    **Use:**
    ```
    Booking Service: Publishes "BookingConfirmed { booking_id, user_id, hotel_id }"
    
    Notification Service: Subscribes → sends email
    Analytics Service: Subscribes → logs event
    Inventory Service: Subscribes → updates cache
    ```
    
    **Advantage:** Decouples services, enables retries
    
    → **For Hotel Booking:** Async notification, cache invalidation, analytics ingestion.

??? "Two-Phase Commit (2PC)"
    **Quick:** Distributed transaction protocol ensuring all-or-nothing updates across multiple databases.
    
    **Detailed:**
    ```
    Phase 1 (Prepare):
      Coordinator asks all DBs: "Can you commit this transaction?"
      Each DB: Locks resources, checks constraints, says "Yes" or "No"
    
    Phase 2 (Commit):
      If all said "Yes" → Coordinator tells all to COMMIT
      If any said "No" → Coordinator tells all to ROLLBACK
    ```
    
    **Downside:** Slow, not fault-tolerant if coordinator crashes
    
    → **For Hotel Booking:** Avoid if possible (slow). Use single database + write replica.

??? "Saga Pattern"
    **Quick:** Long-running transaction across services using compensating transactions.
    
    **Detailed:**
    ```
    BookHotel Saga:
    1. Reserve room (Hotel Service)
    2. Process payment (Payment Service)
    3. Send confirmation (Notification Service)
    
    If Step 2 fails:
    4. Compensate: Cancel room reservation (Hotel Service)
    
    Rollback is manual, not automatic.
    ```
    
    **Orchestration:** Saga coordinator directs steps (central controller)  
    **Choreography:** Services publish events, others listen and react (decentralized)
    
    → **For Hotel Booking:** Use for cancel-and-refund flow (payment refund + inventory release).

??? "PACT (Producer-Consumer Contract)"
    **Quick:** Test specification for API contracts between services (ensure compatibility).
    
    **Detailed:**
    - Consumer (calling service) defines expected API responses
    - Producer (API provider) verifies they meet contract
    - Tests run in isolation → no integration test environment needed
    
    **Tool:** Pact.io
    
    → **For Hotel Booking:** Consumer test: Booking Service expects `/hotels/123` to return {id, name, rating}. Producer test: Hotel Service returns exactly that.

??? "Circuit Breaker"
    **Quick:** Pattern to fail fast when a service is down, preventing cascade failures.
    
    **Detailed:**
    ```
    States:
    - CLOSED: Normal, requests pass through
    - OPEN: Service down, requests rejected immediately (fail fast)
    - HALF_OPEN: Testing if service recovered, selective requests allowed
    
    Transition:
    CLOSED --[N failures in window]--> OPEN --[timeout]--> HALF_OPEN --[success]--> CLOSED
    ```
    
    **Example:** Payment Service is down → Circuit opens → Booking Service rejects new books gracefully.
    
    → **For Hotel Booking:** Wrap Payment Service, Hotel Service calls in circuit breaker.

??? "Bulkhead / Isolation Pattern"
    **Quick:** Isolate resources so a failure in one component doesn't affect others.
    
    **Detailed:**
    ```
    Example: Web server with thread pool
    
    SearchService: 10 threads reserved
    BookingService: 20 threads reserved
    PaymentService: 15 threads reserved
    
    If BookingService gets stuck → only those 20 threads blocked, others unaffected
    ```
    
    **Isolation types:** Threads, connections, memory, CPU
    
    → **For Hotel Booking:** Separate thread pools for search vs. booking to prevent timeout cascade.

??? "Elasticsearch"
    **Quick:** Distributed search and analytics engine, great for full-text search, faceting, and filtering.
    
    **Detailed:**
    - **Inverted Index:** Maps words → documents (why full-text search is fast)
    - **Shard:** Partition of index across nodes (parallelizes searches)
    - **Replica:** Copy of shard for redundancy
    - **Query DSL:** JSON syntax for complex searches, filters, aggregations
    
    **Use:** Hotel search with filters (location, price, amenities)
    
    → **For Hotel Booking:** Index hotels by location, name, amenities for sub-100ms faceted search.

??? "Redis"
    **Quick:** In-memory data store, used for caching, sessions, rate limiting, queues.
    
    **Detailed:**
    - **Data types:** String, List, Set, Sorted Set, Hash, Stream
    - **Persistence:** Optional (RDB snapshots or AOF log)
    - **TTL:** Keys can auto-expire
    - **Pub/Sub:** Publish-subscribe messaging
    
    **Performance:** 100K-400K ops/sec per instance
    
    → **For Hotel Booking:** Cache hotel data, availability counts, session tokens, rate limit buckets.

??? "PostgreSQL"
    **Quick:** Relational SQL database with ACID transactions, indexes, replication.
    
    **Detailed:**
    - **Transactions:** ACID guaranteed, conflict detection
    - **Indexes:** B-tree, Hash, GIN, GIST for complex queries
    - **Foreign Keys:** Data integrity
    - **JSON columns:** Semi-structured data
    - **Replication:** Master-replica or logical replication
    - **Partitioning:** Split large tables by key (range, hash)
    
    → **For Hotel Booking:** Store bookings, availability, users. Use transactions for inventory updates.

??? "Kafka"
    **Quick:** Distributed streaming platform for high-throughput, durable event logging.
    
    **Detailed:**
    - **Topic:** Stream of events (e.g., `booking-confirmed`)
    - **Partition:** Split topic across brokers for parallelism
    - **Consumer Group:** Multiple consumers read from partitions, each processes different partition
    - **Offset:** Position in stream (enables replay)
    - **Retention:** Keep events for N days (default 7) for replay
    
    **Throughput:** Millions of msgs/sec  
    **Latency:** ~10-100ms (higher than RabbitMQ but more scalable)
    
    → **For Hotel Booking:** Stream booking events to analytics, notifications, audit log (immutable audit trail).

??? "RabbitMQ"
    **Quick:** Message broker for point-to-point queuing and pub-sub messaging.
    
    **Detailed:**
    - **Queue:** Messages wait until consumer processes them
    - **Exchange:** Routes messages to queues (fanout, topic, direct)
    - **Ack:** Consumer confirms processing (prevents message loss)
    - **Dead Letter Queue:** Retry failed messages
    
    **Throughput:** 50K-100K msgs/sec per broker (slower than Kafka)  
    **Latency:** <1ms (very fast)
    
    → **For Hotel Booking:** Send notifications asynchronously, ensure delivery with acknowledgments.

??? "Microservices Architecture"
    **Quick:** Application divided into small, independent services (vs. monolith).
    
    **Detailed:**
    **Monolith:**
    ```
    One App:
    ├─ Auth Module
    ├─ User Module
    ├─ Booking Module
    ├─ Payment Module
    └─ Notification Module
    ```
    
    **Microservices:**
    ```
    AuthService (REST/gRPC)
    UserService (REST/gRPC)
    BookingService (REST/gRPC)
    PaymentService (REST/gRPC)
    NotificationService (REST/gRPC)
    ```
    
    **Pros:** Independent scaling, separate tech stacks, faster deployments  
    **Cons:** Complex (distributed tracing, eventual consistency), more services to manage
    
    → **For Hotel Booking:** Separate services for Search, Booking, Payment, Notifications.

??? "REST API"
    **Quick:** Representational State Transfer — standard HTTP-based API design.
    
    **Detailed:**
    ```
    GET /hotels/123               → Read
    POST /bookings                → Create
    PATCH /bookings/456           → Update
    DELETE /bookings/456          → Delete
    
    Status codes:
    - 200 OK, 201 Created, 204 No Content
    - 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found
    - 429 Too Many Requests
    - 500 Server Error, 503 Service Unavailable
    ```
    
    **Best practices:**
    - Use HTTP methods semantically
    - Plural resource names: `/hotels` not `/hotel`
    - Versioning: `/v1/hotels` or header `Accept: application/vnd.myapi.v1+json`
    - Pagination: `?limit=20&offset=40`
    
    → **For Hotel Booking:** Main API style for client-server communication.

??? "GraphQL"
    **Quick:** Query language for APIs, client requests only needed data (vs. REST fixed schemas).
    
    **Detailed:**
    ```graphql
    query {
      hotel(id: 123) {
        name
        rating
        rooms {
          room_type
          available_count
          price
        }
        reviews(limit: 5) {
          author
          text
        }
      }
    }
    ```
    
    **Pros:** No over-fetching, nested queries, powerful for complex data graphs  
    **Cons:** Slower queries (resolvers), caching trickier, N+1 queries if not careful
    
    → **For Hotel Booking:** Good alternative to REST, but slower for high-throughput search (REST preferred).

??? "gRPC"
    **Quick:** High-performance RPC framework using HTTP/2 and Protocol Buffers.
    
    **Detailed:**
    ```protobuf
    service HotelService {
      rpc GetHotel(HotelRequest) returns (HotelResponse);
      rpc SearchHotels(SearchRequest) returns (stream HotelResponse);
    }
    ```
    
    **Pros:** Fast, binary protocol (smaller payloads), streaming, strong typing  
    **Cons:** Complex (requires code gen), poor browser support, not human-readable
    
    → **For Hotel Booking:** Use for service-to-service communication (search service ↔ booking service), not client API.

??? "Latency Percentiles (p50, p99, p99.9)"
    **Quick:** Performance metric: % of requests faster than X ms.
    
    **Detailed:**
    - **p50 (median):** 50% of requests faster than X ms
    - **p99:** 99% of requests faster than X ms (only 1 in 100 slower)
    - **p99.9:** 99.9% faster (only 1 in 1000 slower)
    
    **Examples:**
    - Search latency: p99 <200ms (if p99=500ms, 1% of users wait >500ms — bad UX)
    - Payment latency: p99.9 <1s (if p99.9=10s, 1 in 1000 payments hang — terrible for production)
    
    → **Use p99 for user-facing services, p99.9 for critical operations.**

??? "SLO (Service Level Objective) & SLA (Service Level Agreement)"
    **Quick:** SLO = internal target (99.9% uptime), SLA = promise to customers (99.5% uptime).
    
    **Detailed:**
    - **SLO (objective):** What you aim for internally
    - **SLA (agreement):** What you promise (may be lower than SLO to build buffer)
    - **Error Budget:** If SLA is 99.9%, you get 43 minutes/month of downtime
    
    → **For Hotel Booking:** target SLO 99.95%, promise SLA 99.9% (if miss SLA, compensate customers).

??? "Database Indexing"
    **Quick:** Data structure (B-tree, hash) enabling fast lookups without scanning entire table.
    
    **Detailed:**
    ```sql
    CREATE INDEX idx_availability_room_date 
    ON availability(room_id, check_in_date);
    
    -- Query uses index: ~100ms (vs 10 sec full table scan)
    SELECT * FROM availability 
    WHERE room_id = 123 AND check_in_date = '2025-01-15';
    ```
    
    **Types:**
    - **B-tree:** Default, good for range queries
    - **Hash:** Very fast equality, no range
    - **GIN (Generalized Inverted Index):** Good for arrays, JSON
    - **GIST (Generalized Search Tree):** Good for geospatial, ranges
    
    → **For Hotel Booking:** Index (room_id, date) for availability checks, (hotel_id, location) for search.

??? "Query Optimization"
    **Quick:** Techniques to make database queries faster.
    
    **Detailed:**
    1. **Create indexes** on frequently filtered/joined columns
    2. **Use EXPLAIN PLAN** to see query execution path
    3. **Avoid N+1 queries** (fetch related data in batch, not in loop)
    4. **Denormalize** if necessary (duplicate data for speed, accept redundancy)
    5. **Partition large tables** by date or key
    6. **Use views** for complex repeated queries
    
    → **For Hotel Booking:** Index availability by (room_id, date), denormalize hotel ratings on each room record.

??? "Database Partitioning / Sharding"
    **Quick:** Split large table into smaller chunks (partitions) or across servers (shards).
    
    **Detailed:**
    **Partitioning (single server):**
    ```sql
    CREATE TABLE availability_2025_01 PARTITION OF availability
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
    ```
    Queries on 2025-01 only scan relevant partition → faster.
    
    **Sharding (multiple servers):**
    ```
    Shard 0: room_id % 3 = 0
    Shard 1: room_id % 3 = 1
    Shard 2: room_id % 3 = 2
    ```
    
    → **For Hotel Booking:** Partition availability by month (reduce scan), shard by hotel_id (geographic scale).

---

## Monitoring & Observability

??? "Observability (3 Pillars: Metrics, Logs, Traces)"
    **Quick:** Ability to understand internal state of a system from external outputs.
    
    **Detailed:**
    - **Metrics:** Quantitative snapshots (requests/sec, error rate, latency) — time-series DB (Prometheus, InfluxDB)
    - **Logs:** Detailed events with context (user ID, request ID, error message) — ELK Stack, Splunk
    - **Traces:** Request flow across services with timing (distributed tracing) — Jaeger, Datadog
    
    **Golden signals** (Google):
    1. **Latency:** Response time
    2. **Traffic:** Requests per second
    3. **Errors:** Error rate
    4. **Saturation:** CPU, memory, disk usage
    
    → **For Hotel Booking:** Metrics on search/booking latency + errors, logs on failed bookings, traces on slow requests.

??? "Distributed Tracing"
    **Quick:** Follow a request ID through multiple services to find bottlenecks.
    
    **Detailed:**
    ```
    Client request: GET /search?location=NYC
    │
    ├─ API Gateway (2ms)
    │  ├─ Auth middleware (1ms)
    │  └─ Call SearchService
    │
    ├─ SearchService (45ms)
    │  ├─ Redis cache check (1ms) — MISS
    │  └─ Elasticsearch query (44ms) ← BOTTLENECK
    │     └─ Network latency (10ms)
    │     └─ Query execution (34ms)
    │
    └─ Return response (3ms)
    
    Total: 50ms
    ```
    
    **Tool:** Jaeger, Datadog, New Relic
    
    → **For Hotel Booking:** If search slow, trace shows Elasticsearch is the culprit.

---

*Last updated: April 26, 2026*
