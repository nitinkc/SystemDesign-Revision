# Designing a Simple URL Shortening Service: A TinyURL Approach

> **Interview Time:** 45 min | **Difficulty:** Easy  
> **Key Focus:** Database design, caching, collision handling

---

## Step 1: Functional & Non-Functional Requirements

### Functional Requirements

- Users can create a short URL from a long URL
- Users can redirect from short URL to original URL
- Users can customize short URL (vanity URL)
- Users can track clicks/analytics on short URL
- Users can delete/expire short URLs

### Non-Functional Requirements

| Requirement | Target | Notes |
|:-----------|:-------|:------|
| **Throughput** | 100M users, 1M new short URLs/day | Peak: 10K QPS |
| **Latency** | Redirect <100ms | |
| **Availability** | 99.9% uptime | |
| **Consistency** | Eventual OK for analytics | Strong for URL mapping |
| **Data Retention** | 10 years | |

---

## Step 2: API Design, Data Model & High-Level Design

### Core API Endpoints

```http
POST /shorten
  {long_url, custom_alias?}
  → {short_url, short_code}

GET /{short_code}
  → 301 Redirect to long_url

DELETE /{short_code}
  → Deletes short URL

GET /{short_code}/stats
  → {clicks, countries, devices}
```

### Entity Data Model

```
URLS
├─ id (PK)
├─ short_code (UNIQUE), long_url
├─ user_id (FK), created_at
├─ expires_at, is_active

ANALYTICS
├─ id (PK)
├─ url_id (FK), clicked_at
├─ user_ip, user_agent, referrer

CUSTOM_ALIASES (for vanity URLs)
├─ id (PK)
├─ alias, url_id (FK), user_id
```

### High-Level Architecture

```mermaid
graph TB
    User["👤 Users"]
    LB["Load Balancer"]
    
    SHORTEN["Shorten Service"]
    REDIRECT["Redirect Service"]
    ANALYTICS["Analytics Service"]
    
    CACHE["Redis Cache"]
    DB["PostgreSQL"]
    QUEUE["Message Queue"]

    User -->|POST /shorten| LB
    LB --> SHORTEN
    
    User -->|GET /{code}| LB
    LB --> REDIRECT
    
    REDIRECT --> CACHE
    CACHE -->|miss| DB
    
    REDIRECT --> QUEUE
    QUEUE --> ANALYTICS
```

---

## Step 3: Concurrency, Consistency & Scalability

### 🔴 Problem: Collision in Short Code Generation

**Scenario:** Two simultaneous requests generate same short code for different URLs.

**Solutions:**

| Approach | Implementation | Pros | Cons |
|:---------|:---------------|:-----|:-----|
| Random generation + retry | Generate random, check exists, retry on conflict | Simple | Retries needed |
| Sequential ID + base62 | Auto-increment ID, encode to base62 | Deterministic, no collisions | Predictable URLs |
| UUID + hash | Generate UUID, hash to N chars | No collisions | Longer codes |

**Recommended:** Sequential ID + base62 encoding (guarantees uniqueness, predictable)

```python
# Convert ID to base62
def id_to_shortcode(id):
    chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    result = ""
    while id > 0:
        result = chars[id % 62] + result
        id //= 62
    return result
```

### 🟡 Problem: Handling Vanity URLs (custom aliases)

**Scenario:** User requests custom short code "google" but it's already taken.

**Solution:** Check availability before creating, enforce uniqueness constraint

```sql
CREATE UNIQUE INDEX idx_short_code ON urls(short_code) WHERE is_active = true;
```

### 💾 Data Consistency Strategy

| Data Type | Consistency | Strategy |
|:----------|:-----------|:---------|
| **URL mapping** | Strong | Unique index, transactions |
| **Analytics clicks** | Eventual | Queue + batch write |
| **Custom aliases** | Strong | Database constraint |

---

## Step 4: Persistence Layer, Caching & Monitoring

### Database Design

```sql
CREATE TABLE urls (
  id BIGSERIAL PRIMARY KEY,
  short_code VARCHAR(10) UNIQUE NOT NULL,
  long_url TEXT NOT NULL,
  user_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

CREATE UNIQUE INDEX idx_short_code ON urls(short_code);
CREATE INDEX idx_user_id ON urls(user_id);

CREATE TABLE analytics (
  id BIGSERIAL PRIMARY KEY,
  url_id BIGINT NOT NULL REFERENCES urls(id),
  clicked_at TIMESTAMP DEFAULT NOW(),
  user_ip INET,
  user_agent TEXT
);

CREATE INDEX idx_analytics_url_time ON analytics(url_id, clicked_at);
```

### Caching Strategy

**Tier 1 (CDN):**
- Redirect responses: TTL 1 hour (cache redirect response, not DB query)

**Tier 2 (Redis):**
- `shortcode:abc123 → long_url` (TTL 24 hours)
- `analytics:abc123 → {clicks, countries}` (TTL 1 hour)

**Tier 3 (DB Query Cache):**
- Prepared statements with connection pooling

**Cache Invalidation:**
- On URL deletion: delete from Redis
- On expiration: background job deletes old records

### Monitoring & Alerts

**Key Metrics:**
- Redirect latency p99 (target <100ms)
- Cache hit ratio (target >90%)
- URL creation rate (new URLs/sec)
- Collision rate (% of retries needed)
- Expired URL cleanup (count)

---

## ⚡ Quick Reference Cheat Sheet

### When to Use What

| Need | Technology | Why |
|:-----|:-----------|:----|
| Fast redirect | Redis cache | 100x faster than DB |
| Unique codes | Base62 from ID | No collisions, deterministic |
| Vanity URLs | DB constraint | Prevents duplicates |
| Analytics | Queue + batch write | Don't slow down redirect |

### Critical Design Decisions

- Use **sequential ID + base62** for guaranteed unique, short codes
- **Cache redirects aggressively** (most traffic is reads)
- **Log analytics asynchronously** (queue pattern)
- **Expire old URLs** with background cleanup job

### Tech Stack Summary

```
Frontend: React
Backend: Node.js/Python (stateless)
Database: PostgreSQL
Cache: Redis
Queue: RabbitMQ (analytics)
Monitoring: Prometheus
```

---

## 🎯 Interview Summary (5 Minutes)

1. **Auto-increment ID + base62 encoding** — guaranteed unique, short codes
2. **Cache redirects in Redis** — 100x faster than DB, pre-warm hot codes
3. **Queue analytics clicks** — don't block redirect response
4. **Vanity URL uniqueness** — enforce with database constraint
5. **Expiration cleanup** — background job removes old URLs (save space)

---

## Glossary & Abbreviations

--8<-- "_abbreviations.md"
