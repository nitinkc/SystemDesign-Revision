# E-commerce Recommendation System

> **Interview Time:** 60 min | **Difficulty:** Medium  
> **Key Focus:** Machine learning, collaborative filtering, ranking, personalization at scale

---

## Step 1: Functional & Non-Functional Requirements

### Functional Requirements

- Recommend products to users based on past behavior
- Personalized recommendations per user (each user sees different products)
- Support different algorithms: collaborative filtering, content-based, trending
- A/B testing of recommendation strategies
- Real-time personalization during active session
- Fallback recommendations if user has no history
- Explain why item recommended ("Customers like you also bought...", "Trending now")
- Support for new users (cold start problem)
- Support for new products (new inventory)
- Diversity in recommendations (not all same category)

### Non-Functional Requirements

| Requirement | Target | Notes |
|:-----------|:-------|:------|
| **Latency** | <100ms for recommendations | Real-time, during user session |
| **Scale** | 100M+ users, 10M+ products | Billions of <user, product> pairs |
| **Accuracy** | Click-through rate (CTR) >2% | A/B tests track improvement |
| **Freshness** | Daily model updates | Models trained on yesterday's data |
| **Throughput** | 100K recommendation requests/sec | Peak traffic during shopping |
| **Compute** | Offline batch (hours) + online serving | Training is expensive, serving is cheap |

---

## Step 2: API Design, Data Model & High-Level Design

### Core API Endpoints

```http
GET /recommendations?user_id={id}&num_items=10
  → {items: [{product_id, score, reason: "Popular in Electronics"}]}

GET /recommendations/trending?category={cat}&num_items=10
  → {items: [{product_id, score, popularity}]}

POST /events/click
  {user_id, product_id, timestamp}
  → {status: logged}

POST /events/purchase
  {user_id, product_id, price, timestamp}
  → {status: logged}

GET /models/status
  → {last_trained_at, training_accuracy, model_version}

POST /models/ab-test
  {treatment_model_id, control_model_id, duration_hours: 24}
  → {test_id, start_time, metrics_dashboard}
```

### Entity Data Model

```
USERS
├─ user_id (PK)
├─ country, language, device_type
├─ first_seen_at, last_seen_at

PRODUCTS
├─ product_id (PK)
├─ name, category, price
├─ created_at, last_updated_at
├─ embedding_vector (learned by model) -- for similarity search

USER_EVENTS (activity log)
├─ user_id (FK)
├─ product_id (FK)
├─ event_type (CLICK, VIEW, PURCHASE, WISHLIST, RETURN)
├─ timestamp
├─ session_id (groups events from single session)
├─ PRIMARY KEY (user_id, timestamp)

USER_PRODUCT_INTERACTIONS (aggregated)
├─ user_id (FK)
├─ product_id (FK)
├─ click_count, purchase_count, view_duration
├─ last_interaction_at
├─ score = (clicks + 3*purchases) / recency_factor
├─ PRIMARY KEY (user_id, product_id)

RECOMMENDATIONS (precomputed offline)
├─ recommendation_id (PK)
├─ user_id (FK)
├─ product_id (FK)
├─ score (model confidence, 0-1)
├─ reason (TEXT, explanation)
├─ model_version (which version generated this)
├─ created_at
├─ PRIMARY KEY (user_id, product_id, model_version)

MODELS (trained recommendation models)
├─ model_id (ULID, PK)
├─ model_type (COLLAB_FILTER, CONTENT_BASED, HYBRID)
├─ model_version (v1, v2, etc.)
├─ training_date
├─ metrics {accuracy, precision, recall, auc}
├─ status (TRAINING, LIVE, ARCHIVED)
├─ training_samples_count
├─ created_at, promoted_to_live_at

A_B_TESTS
├─ test_id (PK)
├─ control_model_id (FK)
├─ treatment_model_id (FK)
├─ start_time, end_time
├─ num_users
├─ control_ctr, treatment_ctr
├─ winner (control|treatment)
├─ pvalue (statistical significance)
```

### High-Level Architecture

```mermaid
graph TB
    User["👤 User"]
    LB["Load Balancer"]
    
    ONLINE["Online Serving<br/>(real-time)"]
    
    CACHE["Redis Cache<br/>(precomputed recs<br/>per user)"]
    MODEL_A["Model A<br/>(GRU neural net)"]
    MODEL_B["Model B<br/>(Collaborative filter)"]
    
    EVENT_LOG["Event Logging<br/>(clicks, purchases)"]
    
    BATCH_TRAINING["Batch Training Job<br/>(nightly, 4 hours)"]
    DATA["Training Data<br/>(clicks, purchases<br/>from yesterday)"]
    
    FEATURES["Feature Store<br/>(user features,<br/>product features)"]
    
    OFFLINE_RANKING["Offline Ranking<br/>(generate recs<br/>for all users)"]
    
    METRICS["A/B Metrics<br/>(CTR, conversion)"]

    User --> LB
    LB --> ONLINE
    
    ONLINE --> CACHE
    ONLINE --> MODEL_A
    ONLINE --> MODEL_B
    
    ONLINE --> EVENT_LOG
    
    BATCH_TRAINING .--> DATA
    DATA --> FEATURES
    FEATURES --> BATCH_TRAINING
    
    BATCH_TRAINING --> OFFLINE_RANKING
    OFFLINE_RANKING --> CACHE
    
    ONLINE --> METRICS
```

---

## Step 3: Concurrency, Consistency & Scalability

### 🔴 Problem: Cold Start (New Users)

**Scenario:** New user has no history. Can't use collaborative filtering (no similar users). What to recommend?

**Solution: Multi-tier Fallback Strategy**

```
Tier 1: Personalized (requires user history)
  IF user_history.size() > 50 events:
    → Use collaborative filter: "Users like you bought..."
    → User embedding in vector space
    → Find K nearest neighbors in user space
    → Recommend items those neighbors liked
  ELSE:
    → Fallback to Tier 2

Tier 2: Category-based (no history needed)
  IF user.browsing_category is known:
    → Recommend top-selling items in category
    → "Popular in Electronics"
  ELSE:
    → Fallback to Tier 3

Tier 3: Trending (brand new user, no context)
  → Recommend trending items globally
  → "Trending Now"
  → "New Arrivals"
  → Personalize later (Tier 1) once user has 50+ events

Example:
  Day 1 (new user): Trending recommendations
  Day 2 (20 clicks, 1 purchase): Category-based
  Day 7 (50+ events): Can use collaborative filtering
    → "Users like you bought X"
    → "Because you viewed Y category"
```

### 🟡 Problem: Scalability (100M+ Users, 10M+ Products = 1T Pairs)

**Scenario:** Can't store recommendations for all user-product pairs (1 trillion = 1TB+ storage). Can't compute at query time (needs seconds, not milliseconds).

**Solution: Bucketing + Offline Precomputation**

```
Offline Process (happens every night):

1. Train Model (4-6 hours)
   Input: Yesterday's click/purchase events
   Algorithm: Collaborative filtering (Matrix Factorization) or Neural Network
   Output: User embeddings (128D vector per user), Item embeddings (128D vector per product)

2. Bucketing by User Segment
   Segment users:
     - By geography (US, EU, APAC)
     - By device (mobile, desktop)
     - By user value (whales, regular, new)
   
   Why? Don't need recs for ALL users every night
   → Generate fresh recs only for active users in each segment
   → Saves 50% compute

3. Generate Recommendations (2-3 hours)
   For each user in batch:
     a) Fetch user embedding (128D)
     b) Compute similarity to all products:
        similarity(user, product) = dot_product(user_vec, product_vec)
     c) Top-10 products = highest similarity scores
     d) Apply re-ranking (see below)
     e) Store in Redis/DB: "recs:{user_id}" = [product_1, product_2, ...]
   
   Parallelized: 100K users/second across cluster
   Total time: 10M users / 100K per sec = 100 seconds = 1.7 minutes

4. Store in Redis (fast serving)
   KEY: "recs:{user_id}"
   VALUE: [product_1, product_2, product_3, ...] (as JSON)
   TTL: 24 hours (refresh daily)

Online Process (real-time, sub-100ms):

1. User opens app: GET /recommendations?user_id=123
2. Server:
   → HGET cache "recs:123"
   → Cache hit! (99% of users updated daily)
   → Return [product_1, product_2, ...]
   → Response time: <5ms

If user not in cache (new user or cache expired):
  → Fall back to Tier 2 (category-based)
  → Compute on-the-fly (100-200ms acceptable)
  → Update cache: HSET "recs:123" = [...]

Result:
  - 99% of requests served from cache (<5ms)
  - Batch training amortizes cost across 24 hours
  - No real-time model inference needed
  - Scales to 100M users
```

### Solution: Re-ranking After Similarity

```
Initial ranking (by embedding similarity):
  [Product_A (score 0.95), Product_B (0.92), Product_C (0.91), ...]

Apply re-ranking filters:
  1. Diversity: Remove duplicates in category
     → Don't recommend 5 laptop chargers
     → Include variety (3 electronics, 2 books, 2 home, etc.)
  
  2. Business rules:
     → Boost items with high margin
     → Demote out-of-stock items
     → Enforce minimum diversity
  
  3. Freshness: Prefer recently updated products
     → New items get small boost
     → Overstocked items get boost
  
  4. User context: Personalize by session
     → If browsing shoes: boost shoe recommendations
     → If recently purchased camera: recommend camera lenses
       (cross-sell, not competing recommendations)

Final ranking:
  [Laptop (0.95, boosted margin),
   Camera Lens (0.88, cross-sell),
   Book (0.85, diversity),
   Phone Case (0.82, accessories),
   ...]
```

### Solution: Handling Model Versioning & A/B Tests

```
Live serving with multiple models:

User enters app:
  1. Check A/B test assignment
     user_in_test = redis.get("ab_test:{user_id}")
  
  2. If in test:
     → Serve Model B (treatment)
     20% of users in "treatment"
  
  3. If not in test:
     → Serve Model A (control, production winner)
     80% of users get proven model
  
  4. Log impression (which model served)
     → Later, track CTR for each model

Example (A/B test):
  Test starts: Model_Collab vs Model_NeuralNet
  Duration: 7 days, 10% traffic each
  
  Results:
    Model_Collab: CTR = 2.1%
    Model_NeuralNet: CTR = 2.3%
    → NeuralNet wins (p-value < 0.05)
    → Promote NeuralNet to 100%, retire Collab
```

---

## Step 4: Persistence Layer, Caching & Monitoring

### Database Design

```sql
CREATE TABLE user_events (
  event_id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  event_type VARCHAR(50),  -- CLICK, PURCHASE, WISHLIST, VIEW
  session_id VARCHAR(255),
  timestamp BIGINT,  -- milliseconds for precision
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_events_user_product_time 
  ON user_events(user_id, product_id, timestamp DESC);

-- Used for training (select events from yesterday)
CREATE INDEX idx_events_created_date 
  ON user_events(DATE(created_at));

CREATE TABLE user_product_interactions (
  user_id BIGINT NOT NULL REFERENCES users(user_id),
  product_id BIGINT NOT NULL REFERENCES products(product_id),
  clicks INT DEFAULT 0,
  purchases INT DEFAULT 0,
  views INT DEFAULT 0,
  view_duration_seconds INT DEFAULT 0,
  last_interaction BIGINT,
  
  -- Precomputed scores for offline ranking
  similarity_score DECIMAL(4,3),  -- 0-1, from model
  diversity_score DECIMAL(4,3),
  
  PRIMARY KEY (user_id, product_id)
);

-- Model metadata
CREATE TABLE recommendation_models (
  model_id VARCHAR(255) PRIMARY KEY,
  model_type VARCHAR(100),  -- CF, Content-Based, Neural
  version INT,
  train_date DATE,
  accuracy DECIMAL(5,4),
  precision DECIMAL(5,4),
  recall DECIMAL(5,4),
  status VARCHAR(50),  -- TRAINING, LIVE, ARCHIVED
  promoted_at TIMESTAMP
);

-- A/B test results
CREATE TABLE ab_tests (
  test_id BIGSERIAL PRIMARY KEY,
  control_model_id VARCHAR(255) REFERENCES recommendation_models(model_id),
  treatment_model_id VARCHAR(255) REFERENCES recommendation_models(model_id),
  start_at TIMESTAMP,
  end_at TIMESTAMP,
  control_ctr DECIMAL(5,4),
  treatment_ctr DECIMAL(5,4),
  pvalue DECIMAL(6,5),  -- statistical significance
  winner VARCHAR(50),  -- control, treatment, inconclusive
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Caching Strategy

**Tier 1: Redis (Hot Cache)**

```
1. Precomputed Recommendations (generated offline)
   Key: "recs:{user_id}"
   Value: {
     products: [product_id_1, product_id_2, ..., product_id_10],
     scores: [0.95, 0.92, 0.91, ...],
     reasons: ["Customers like you", "Popular in...", ...],
     model_version: "v5"
   }
   TTL: 24 hours (refresh nightly)
   Purpose: Sub-5ms serving
   Hit rate: 99% (updated daily for most users)

2. User Embeddings (from trained model)
   Key: "embedding:{user_id}"
   Value: [0.123, -0.456, 0.789, ...] (128D vector)
   TTL: 24 hours
   Purpose: For online fallback (new users, cache miss)

3. Product Embeddings (from trained model)
   Key: "embedding:product:{product_id}"
   Value: [0.456, 0.123, -0.789, ...] (128D vector)
   TTL: 24 hours
   Purpose: For online similarity computation

4. A/B Test Assignments
   Key: "ab_test:{user_id}"
   Value: {test_id: 123, model_id: "model_v5_neural"}
   TTL: 30 days (duration of test)
   Purpose: Consistent model assignment for user
```

**Tier 2: Offline Storage**

```
S3 Bucket: recommendation-models/
  ├─ model_v1_collab_filter.pkl (100MB)
  ├─ model_v5_neural_net.onnx (500MB)
  ├─ embeddings_v5_users.bin (1.5GB)
  ├─ embeddings_v5_products.bin (500MB)

After training nightly:
  1. Train model → 50GB intermediate data (on GPU cluster)
  2. Serialize → model_v6.onnx (500MB)
  3. Upload to S3
  4. Load into Redis for serving
  5. Archive old models (keep last 5 versions)
```

### Training Pipeline (Batch)

```python
# Simplified training pseudocode

def train_recommendation_model(training_date):
    # Select data from yesterday
    events = database.query("""
      SELECT user_id, product_id, event_type
      FROM user_events
      WHERE DATE(created_at) = ?
    """, training_date - 1 day)
    
    # Create user-product interaction matrix
    # (rows=users, columns=products, values=interaction_strength)
    interaction_matrix = build_matrix(events)
    
    # Algorithm: Matrix Factorization (Collaborative Filtering)
    # Factor matrix into: user_embeddings (100M x 128D) × product_embeddings (10M x 128D)
    # This captures patterns: "users who liked X also liked Y"
    
    user_embeddings, product_embeddings = matrix_factorization(
        interaction_matrix,
        factors=128,
        iterations=10,
        learning_rate=0.01
    )
    
    # Validate on held-out test set
    accuracy, precision, recall = evaluate(
        user_embeddings,
        product_embeddings,
        test_events
    )
    
    # Save model
    model = RecommendationModel(
        user_embeddings,
        product_embeddings,
        metadata={accuracy, precision, recall}
    )
    save_to_s3(f"models/recommendation_v6.pkl", model)
    
    # Generate recommendations for all users
    for user_id in active_users:
        user_vec = user_embeddings[user_id]
        scores = dot_product(user_vec, product_embeddings)  # 10M products
        top_10 = argsort(scores)[-10:]
        
        cache.set(f"recs:{user_id}", top_10, ttl=24_hours)
    
    return model

# Run nightly (11 PM - 3 AM)
schedule.daily(train_recommendation_model)
```

### Monitoring & Alerts

**Key Metrics:**

1. **Model Quality**
   - Click-through rate (CTR %, should improve with new model)
   - Conversion rate (% of recommendations that lead to purchase)
   - Precision@10 (are top 10 recs relevant?)
   - Recall (of total relevant items, how many in top 10?)

2. **Online Serving**
   - Recommendation latency (P95 <100ms target)
   - Cache hit rate (should be >99%)
   - Fallback rate (% of requests hitting fallback tier)

3. **Training Health**
   - Training job completion (nightly, should complete <4 hours)
   - Model convergence (loss decreasing?)
   - Data quality (unexpected events or bot activity?)

4. **A/B Test Results**
   - Treatment CTR vs control (track during test duration)
   - Statistical significance (p-value < 0.05)
   - Sample size (sufficient power to detect difference?)

5. **Business Metrics**
   - Revenue per user (recommendations drive sales)
   - Diversity of recommendations (not all same category)
   - User engagement (time on site, return rate)

```yaml
- alert: ModelTrainingFailed
  expr: model_training_status == FAILED
  annotations: "Training job failed — check data pipeline"

- alert: CTRRegression
  expr: current_ctr < baseline_ctr * 0.95
  annotations: "CTR dropped 5% — new model underperforming"

- alert: ServingLatencyHigh
  expr: recommendation_latency_p95 > 200
  annotations: "Rec latency > 200ms — check cache, model size"

- alert: CacheHitRateLow
  expr: cache_hit_rate < 0.90
  annotations: "Cache hit < 90% — precomputation not covering users"

- alert: ColdStartFallback
  expr: fallback_tier_rate > 0.20
  annotations: "20% requests using fallback — many new/inactive users"
```

---

## ⚡ Quick Reference Cheat Sheet

### Critical Design Decisions

1. **Offline batch training** — Model trained nightly, not real-time (too slow)
2. **Precomputed recommendations** — Store in cache, serve <5ms, not computed on-demand
3. **Multi-tier fallback** — Personalized → Category → Trending for cold start
4. **Bucketing by user segment** — Don't generate recs for ALL users daily (optimize)
5. **Re-ranking for diversity** — Similarity scores top-10, then filter for variety
6. **A/B testing framework** — Validate improvements before rolling out

### Algorithm Comparison

| Algorithm | Data Needed | Latency | Accuracy | Cold Start |
|:----------|:-----------|:--------|:---------|:-----------|
| **Collaborative Filter** | User history | 1ms (precomputed) | High | Poor (new users) |
| **Content-Based** | Product features | 1ms (precomputed) | Medium | Good |
| **Hybrid** | Both | 5ms (blend models) | High | Good |
| **Trending** | Global popularity | <1ms | Lower | Good (fallback) |

### When to Use What

| Use Case | Algorithm | Why |
|:---------|:----------|:----|
| Returning user | Collaborative Filter | "Users like you also bought" |
| Browsing category | Content-Based | Similar items in category |
| New user | Trending + Category | No history available |
| Cold product | Content-Based | No interaction history |
| A/B testing | Both models | Measure improvement |

### Tech Stack

```
Frontend: Show recommendations in sidebar, carousel
Backend: Stateless, cache lookups only
ML Platform: Spark/TensorFlow for batch training
Model Storage: S3 + Redis cache
Database: PostgreSQL (events, interaction matrix)
Monitoring: A/B test dashboards, CTR tracking
```

---

## 🎯 Interview Summary (5 Minutes)

1. **Cold start** → Multi-tier fallback (personalized → category → trending)
2. **Scalability** → Offline batch training nightly, precompute recommendations
3. **Fast serving** → Store in Redis, cache hit 99%, sub-5ms response
4. **Bucketing** → Segment users by geography/device to reduce compute
5. **Re-ranking** → Similarity scores for relevance, diversity filters for variety
6. **A/B testing** → Validate improvements, measure CTR impact
7. **Online learning** → Log events, retrain daily, update cache every 24 hours

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
