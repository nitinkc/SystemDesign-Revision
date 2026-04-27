# GitHub Copilot — System Design Interview Prep Instructions

> **Always read `IMPLEMENTATION_PROGRESS.md` first.**
> It is the single source of truth for what is done, what is next, and the quality standard every file must meet.
> Do NOT re-implement already-completed designs. Jump directly to the next pending batch.

---

## 🗂️ Project Overview

**Project:** System Design Interview Prep — MkDocs site with 123 topics
**Location:** `/Users/sgovinda/Learn/SystemDesign/interview-prep-docs/`
**Platform:** MkDocs + Material theme (teal primary/accent), served via `mkdocs serve`
**Goal:** 1,100–1,500 lines of production-quality content per design file

### Tech Stack

| Layer | Technology |
|:------|:-----------|
| Site generator | MkDocs + Material theme |
| Diagrams | Mermaid (fenced `mermaid` code blocks) |
| Glossary | `docs/_abbreviations.md` — included via snippet at end of every page |
| Math | MathJax (`docs/js/mathjax.js`) |
| Styling | `docs/css/custom.css` |
| Deploy | GitHub Actions `.github/workflows/deploy-docs.yml` |
| Extensions | `toc`, `pymdownx.details`, `pymdownx.superfences`, `pymdownx.snippets` |

---

## 🚦 How to Resume Work

1. **Read `IMPLEMENTATION_PROGRESS.md`** — find the first `⏳ NOT STARTED` batch.
2. **List the target files** for that batch and confirm with user before starting.
3. **Implement all designs in the batch** using the 7-section template below.
4. **Do NOT create new files** — skeleton stubs already exist; replace `[TODO]` placeholder blocks.
5. **After the batch completes:**
   - Update batch status: `⏳ NOT STARTED` → `✅ COMPLETED (Date)`
   - Update the Overall Progress table totals
   - Fill in the batch results table with key algorithms per design

---

## 📐 Mandatory Content Structure (7 Sections)

Every design file **must** contain all 7 sections in this order, 1,100–1,500 lines total.

### Section 1 — Requirements

```markdown
## Step 1: Functional & Non-Functional Requirements

### Functional Requirements

- [5–7 bullet features]

### Non-Functional Requirements

| Requirement | Target | Notes |
|:-----------|:-------|:------|
| Throughput  | X QPS  | Peak: Y |
| Latency     | p99 <X ms | |
| Availability | 99.X% | |
| Consistency | Strong / Eventual | |
| Data Retention | X years | |
```

### Section 2 — API, Data Model & Architecture

```markdown
## Step 2: API Design, Data Model & High-Level Design

### Core API Endpoints

​```http
GET  /resource
POST /resource
PATCH /resource/{id}
DELETE /resource/{id}
​```

### Entity Data Model

​```
MAIN_TABLE
├─ id (PK)
├─ field_1
├─ field_2 (FK → OTHER_TABLE)
├─ created_at, updated_at
​```

### High-Level Architecture

​```mermaid
graph TB
    USER["👤 Users"]
    LB["Load Balancer"]
    SVC["Service Layer"]
    CACHE["Redis Cache"]
    DB["PostgreSQL"]

    USER --> LB --> SVC
    SVC --> CACHE
    SVC --> DB
​```
```

### Section 3 — Concurrency, Consistency & Scalability

```markdown
## Step 3: Concurrency, Consistency & Scalability

### 🔴 Problem: [Race Condition Name]

**Scenario:** [Real-world example where things break concurrently]

**Solutions:**

| Approach | Implementation | Pros | Cons |
|:---------|:--------------|:-----|:-----|
| Naive    | [Code/SQL]    | Simple | Race condition |
| Better   | [Code/SQL]    | Correct | Slower |
| Best     | [Code/SQL]    | Correct + Fast | Complex |

**Recommended:** [Choice + rationale tied to throughput vs correctness tradeoff]

​```sql
-- or pseudocode
​```

### 🟡 Problem: [Secondary Challenge]

[Same structure — minimum 2 problems total per design]

### 💾 Data Consistency Strategy

| Data Type | Consistency | Strategy |
|:----------|:-----------|:---------|
| Critical  | Strong      | Transactions |
| Derived   | Eventual    | Cache + async |
```

### Section 4 — Persistence, Caching & Monitoring

```markdown
## Step 4: Persistence Layer, Caching & Monitoring

### Database Schema

​```sql
CREATE TABLE example (
  id         SERIAL PRIMARY KEY,
  field_1    VARCHAR(255) NOT NULL,
  field_2    INT REFERENCES other(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_example_key ON example(field_1, field_2);
​```

### Caching Strategy

**Tier 1 (CDN):** Static content — TTL 1 day
**Tier 2 (Redis):** Hot data — TTL X min, invalidate on write
**Tier 3 (DB):** Prepared statements, connection pooling

**Cache-Aside Pattern:**
1. Check Redis → hit: return immediately
2. Miss → query DB
3. Write to Redis with TTL
4. Return to client

### Monitoring & Alerts

​```yaml
groups:
  - name: [system]-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_errors_total[5m]) > 0.01
        for: 2m
        annotations:
          summary: "Error rate above 1% for 2 minutes"

      - alert: HighLatencyP99
        expr: histogram_quantile(0.99, rate(request_duration_seconds_bucket[5m])) > 0.5
        for: 5m
        annotations:
          summary: "p99 latency exceeds 500ms"
​```
```

### Section 5 — Quick Reference Cheat Sheet

```markdown
## ⚡ Quick Reference Cheat Sheet

### When to Use What

| Need | Technology | Why |
|:-----|:-----------|:----|
| Fast search | Elasticsearch | Sub-100ms filtering |
| No double-booking | Pessimistic lock | Guaranteed correctness |
| Cache hot data | Redis | 100x faster than DB |

### Critical Design Decisions

- **Decision 1:** [Choice + rationale]
- **Decision 2:** [Choice + rationale]
- **Decision 3:** [Choice + rationale]

### Tech Stack Summary

​```
Backend:  [Language/Framework] (stateless, horizontally scalable)
Database: [Primary DB] + read replicas
Cache:    Redis Cluster (hash-ring sharding)
Queue:    [Kafka / SQS / etc. if applicable]
Search:   [Elasticsearch if applicable]
Monitoring: Prometheus + Grafana
​```
```

### Section 6 — 5-Minute Interview Summary

```markdown
## 🎯 Interview Summary (5 Minutes)

1. **Requirements:** [What must work at scale — key numbers]
2. **[Key architectural decision]:** [Why this choice over alternatives]
3. **[Data consistency]:** [How race conditions / failures are prevented]
4. **[Scalability]:** [How the system handles peak load]
5. **[Monitoring]:** [What to track in production + alert thresholds]
```

### Section 7 — Glossary Footer (REQUIRED — must be the last line of every file)

```markdown
--8<-- "docs/_abbreviations.md"
```

---

## ✅ Quality Checklist (Gate Before Marking Complete)

- [ ] All 7 sections present and populated — zero `[TODO]` placeholders remain
- [ ] Step 3 has **at least 2** concurrency/scalability problems with trade-off tables
- [ ] Step 3 has an explicit **"Recommended:"** for each problem
- [ ] Step 2 includes a working **Mermaid architecture diagram**
- [ ] Step 4 includes **Prometheus YAML** alert rules with numeric thresholds
- [ ] File is **1,100–1,500 lines**
- [ ] `--8<-- "docs/_abbreviations.md"` is the **very last line**
- [ ] No pipes `|` inside Mermaid node labels (use `·` middle dot instead)
- [ ] Blank line before every Markdown list
- [ ] `mkdocs build` succeeds with no errors

---

## 🚫 Anti-Patterns — Never Do These

| ❌ Don't | ✅ Do Instead |
|:---------|:-------------|
| Skip Step 3 (concurrency) | Always include 2+ real race conditions with trade-offs |
| Use `\|` inside Mermaid node labels | Use `·` (middle dot): `[OAuth2 · OIDC]` |
| Omit blank line before lists | Add blank line before every list |
| Define terms in body AND glossary | Define once in `_abbreviations.md` only |
| Make cheat sheet longer than 1 page | Keep scannable in 2 min max |
| Leave `[TODO]` in published file | Replace all placeholders before marking done |
| Create new skeleton files | Fill existing stubs only |
| Use `file://` or `../../../` URLs | Use relative paths only |
| Duplicate glossary entries | Check `_abbreviations.md` before adding a new term |

---

## 📂 File Naming Convention

```
docs/{level}/{number:02d}-{topic-slug}.md

Examples:
  docs/easy/04-fitness-tracking.md
  docs/medium/37-flash-sale.md
  docs/hard/25-google-search.md
  docs/advanced/02-container-orchestration.md
```

Levels: `easy` | `medium` | `hard` | `advanced`

---

## 🔄 Batch Workflow

```
1. Read IMPLEMENTATION_PROGRESS.md
   ↓
2. Identify first ⏳ NOT STARTED batch
   ↓
3. List target files → confirm with user
   ↓
4. Implement all designs (parallel subagents when possible)
   ↓
5. Verify quality checklist for each file
   ↓
6. Update IMPLEMENTATION_PROGRESS.md:
   - Batch row: ⏳ NOT STARTED → ✅ COMPLETED (Date)
   - Overall Progress table totals
   - Batch results table (key algorithms column)
```

---

## 📋 Current Batch Queue (as of April 26, 2026)

| Batch | Status | Count |
|:------|:-------|:------|
| Batch 1 — FAANG Frequency | ✅ COMPLETED Apr 26, 2026 | 10 |
| Batch 2 — Medium Core | ✅ COMPLETED Apr 26, 2026 | 10 |
| Batch 3 — Hard Distributed | ✅ COMPLETED Apr 26, 2026 | 10 |
| **Batch 4 — Advanced Infrastructure** | **⏳ NEXT** | **8** |
| Batch 5 — Remaining Easy & Medium stubs | ⏳ Pending | 15 |
| Batch 6 — Skeleton fill-ins + remaining Hard | ⏳ Pending | ~25 |
| Batch 7+ — All Remaining | ⏳ Pending | ~28 |

**Batch 4 target files:**

| File | Design |
|:-----|:-------|
| `docs/advanced/01-cloud-infrastructure.md` | Cloud Infrastructure (multi-region, VPCs, IAM, object storage) |
| `docs/advanced/02-container-orchestration.md` | Container Orchestration (Kubernetes scheduler, etcd, control plane) |
| `docs/advanced/07-disaster-recovery.md` | Disaster Recovery (RPO/RTO, active-passive vs active-active, chaos) |
| `docs/advanced/11-graph-processing.md` | Graph Processing (Pregel BSP, graph partitioning, PageRank at scale) |
| `docs/advanced/12-big-data-pipeline.md` | Big Data Pipeline (Lambda/Kappa, MapReduce, Spark streaming) |
| `docs/advanced/14-security-monitoring.md` | Security Monitoring (SIEM, anomaly detection, threat intel feeds) |
| `docs/advanced/15-oltp-database.md` | Distributed OLTP (2PC, Percolator snapshot isolation, MVCC) |
| `docs/advanced/16-dns.md` | DNS System (recursive vs authoritative, negative caching, anycast) |

---

## 🔗 Key Files Reference

| File | Purpose |
|:-----|:--------|
| `IMPLEMENTATION_PROGRESS.md` | **Source of truth** — batch state, progress counts, quality standard |
| `TEMPLATE.md` | Copy-paste skeleton + step-by-step guide for adding new designs |
| `README.md` | Human quick-start (install, preview, study path) |
| `mkdocs.yml` | Site navigation — update `nav:` section when adding designs |
| `docs/_abbreviations.md` | Shared glossary — add new terms here, never in body text |
| `docs/easy/01-hotel-booking.md` | **Gold standard reference implementation** — read before writing any design |

---

## 🖊️ mkdocs.yml Navigation Update

When adding a new design, append it to the correct section in `mkdocs.yml`:

```yaml
nav:
  - Easy Designs:
    - easy/index.md
    - "01 · Hotel Booking Service": easy/01-hotel-booking.md
    - "02 · URL Shortening":        easy/02-url-shortening.md  # ← add here
```

Format: `"NN · Title": level/NN-slug.md`

---

## 🏃 Local Development

```bash
cd /Users/sgovinda/Learn/SystemDesign/interview-prep-docs
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 -m mkdocs serve       # preview at http://127.0.0.1:8000
python3 -m mkdocs build       # validate — must produce zero errors
```

