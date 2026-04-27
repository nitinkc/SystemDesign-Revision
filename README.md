# System Design Interview Prep — Quick Start Guide

> **Goal:** Structured, last-minute-revision-friendly system design materials for interview candidates.  
> **Completed Examples:** Hotel Booking Service  
> **Full Topics:** 130+ designs to add from plan

---

```shell
python3 -m venv .venv
source .venv/bin/activate 
pip install -r requirements.txt

mkdocs serve
```

## Quick Links

👉 **[Hotel Booking Service](docs/easy/01-hotel-booking.md)** — Complete example (25 min read)  
👉 **[Glossary](docs/_abbreviations.md)** — All technical terms (inline definitions)  
📖 **[Copilot Instructions](COPILOT_INSTRUCTIONS.md)** — Style guide + replication steps  
📋 **[Template](TEMPLATE.md)** — Copy-paste structure for new designs  

---

## How to Use (3 Scenarios)

### Scenario 1: You Have 5 Minutes Before Interview

1. Open a design topic
2. Scan the **⚡ Quick Reference Cheat Sheet** section (2 min)
3. Skim **🎯 Interview Summary (5 Minutes)** (1 min)
4. Look up unfamiliar terms in **Glossary** using Ctrl+F (2 min)

**Result:** Key talking points + terminology refreshed ✅

### Scenario 2: You Have 1 Hour to Study One Design

1. Read **Step 1** (Functional & Non-Functional Requirements) — 5 min
2. Read **Step 2** (API, Data Model, Architecture) — 10 min
3. Deep-dive **Step 3** (Concurrency & Consistency) — 20 min ⭐ Most important
4. Skim **Step 4** (Database, Caching, Monitoring) — 10 min
5. Review **Cheat Sheet** — 5 min
6. Note unfamiliar terms in **Glossary** — 10 min

**Result:** Confident you can discuss this design with an interviewer ✅

### Scenario 3: You're Building the Material (Content Creator)

1. Read **[Hotel Booking Service](docs/easy/01-hotel-booking.md)** (reference implementation)
2. Review **[COPILOT_INSTRUCTIONS.md](COPILOT_INSTRUCTIONS.md)** (style + structure rules)
3. Use **[TEMPLATE.md](TEMPLATE.md)** (copy-paste starting point)
4. Pick topic from **[../2025-05-03-systems-design-plan.md](../2025-05-03-systems-design-plan.md)**
5. Fill in template following the 4-step structure
6. Run `python3 -m mkdocs serve` to preview
7. Commit when complete

**See:** [TEMPLATE.md → Step-by-Step Guide](TEMPLATE.md#step-by-step-guide)

---

## Project Structure

```
interview-prep-docs/
├── README.md                     ← You are here
├── COPILOT_INSTRUCTIONS.md       ← Master style guide
├── TEMPLATE.md                   ← Copy-paste structure for new designs
├── requirements.txt              ← Python deps (mkdocs-material, etc.)
├── mkdocs.yml                    ← Site configuration + navigation
├── docs/
│   ├── index.md                  ← Site home
│   ├── _abbreviations.md         ← Shared glossary (included in all files)
│   ├── js/mermaid-init.js        ← Mermaid diagram rendering
│   ├── css/custom.css            ← Custom styling
│   ├── easy/
│   │   ├── index.md              ← Easy section overview
│   │   └── 01-hotel-booking.md   ← [REFERENCE] Hotel Booking Service
│   ├── medium/
│   │   └── index.md              ← Coming soon (add designs here)
│   ├── hard/
│   │   └── index.md              ← Coming soon
│   └── advanced/
│       └── index.md              ← Coming soon
```

---

## Setup & Build Instructions

### First-Time Setup

```bash
cd interview-prep-docs

# Create Python virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Test build
python3 -m mkdocs build
```

### Preview Site Locally

```bash
python3 -m mkdocs serve
# Open browser: http://127.0.0.1:8000
```

### Build for Deployment

```bash
python3 -m mkdocs build
# Output in /site directory — ready to deploy
```

---

## What Makes This Different

| Traditional Study | ❌ | This Project | ✅ |
|:---|:---|:---|:---|
| Read 500-page system design book | Long, overwhelming | 4-step summary per topic (page) | Focused |
| Search for terms in index | Time-consuming | Inline glossary with expandable definitions | Instant lookup |
| Can't remember what ACID means | Frustrating | Hover over term `[ACID]` → quick definition | Context helps memory |
| Must review entire chapter | Inefficient | Cheat sheet (2 min) captures essentials | Fast revision |
| Last-minute cramming | Panic | 5-minute interview summary | Confident |

---

## Content Quality Checklist

Every system design must have:

- [x] **Functional Requirements** — What the system does
- [x] **Non-Functional Requirements** — Scale, latency, consistency targets
- [x] **API Design** — REST endpoints (3–5)
- [x] **Data Model** — Entity diagrams (4–6 entities)
- [x] **Architecture Diagram** — Mermaid showing services, caches, databases
- [x] **Concurrency Problems** — Real race conditions + solutions (pessimistic vs. optimistic locks, etc.)
- [x] **Data Consistency Strategy** — Strong vs. eventual consistency for each data type
- [x] **Database Design** — Schema with indexes
- [x] **Caching Strategy** — Multi-tier caching (CDN, Redis, query cache)
- [x] **Monitoring & Metrics** — Key metrics + alert examples
- [x] **Quick Reference Cheat Sheet** — Scannable in 2 min
- [x] **Glossary** — All technical terms linked to definitions

---

## How to Add New Designs

### Quick Path (30 seconds)

1. Copy [TEMPLATE.md](TEMPLATE.md) structure
2. Follow the 4-step pattern (see Hotel Booking Service as reference)
3. Update `mkdocs.yml` with new file
4. Build: `python3 -m mkdocs build`

**See detailed steps:** [TEMPLATE.md → Step-by-Step Guide](TEMPLATE.md#step-by-step-guide)

### Topics to Start With (Recommendation)

**Easy** (good warm-up, fewer concurrency issues):
- URL Shortening Service
- Pastebin
- Parking Lot System

**Medium** (important, appear in real interviews):
- Design Twitter
- Design Rate Limiter
- Design Web Cache
- Design Instagram

**Hard** (complex, fewer candidates attempt):
- Uber Backend
- Hotel Booking
- Payment System

**Advanced** (infrastructure scale):
- Design DNS
- Design CDN
- Design Kubernetes

---

## Candidate Feedback Loop

After candidates use this material:

**Ask them:**
1. "What was confusing?" → Update that section
2. "What did the interviewer ask that's not covered?" → Add as subsection or deep dive
3. "How long did it take to understand?" → Adjust detail level
4. "Did the cheat sheet help?" → Refine based on feedback

**Iterate:**
- Add more worked-through examples in Step 3 (most complaints)
- Link related designs together
- Create "Deep Dive" sub-articles for complex topics

---

## Glossary Features

The `_abbreviations.md` file is **shared** across all designs and includes:

- ~80 technical terms defined
- Expandable definitions (quick + detailed mode)
- "→ Use case" hints explaining why each term matters
- No duplication — every term defined once

**Examples included:**

- Concurrency: ACID, optimistic lock, pessimistic lock, distributed lock
- Data: Bloom filter, sharding, replication, materialized views
- Systems: Circuit breaker, saga pattern, bulkhead, eventual consistency
- Tools: Redis, PostgreSQL, Elasticsearch, Kafka, RabbitMQ
- Metrics: SLO, SLA, p99 latency, error budget

---

## Interview Prep Timeline

### Week 1–2: Foundations
- [ ] Read glossary (20 min)
- [ ] Study 3 Easy designs (3 × 1 hr = 3 hrs)
- [ ] Review cheat sheets daily (10 min)

### Week 3–4: Core Patterns
- [ ] Study 5 Medium designs (5 × 1.5 hrs = 7.5 hrs)
- [ ] Practice explaining aloud (avoid reading)
- [ ] Update glossary with personal notes

### Week 5–6: Advanced Topics
- [ ] Study 3 Hard designs (3 × 2 hrs = 6 hrs)
- [ ] Deep-dive sub-articles for weak areas
- [ ] Mock interviews (45 min each)

### Day Before Interview
- [ ] Scan 2–3 most likely designs (5 min cheat sheets)
- [ ] Review glossary (10 min)
- [ ] Sleep well! ✅

---

## Maintenance & Updates

### When Interview Asked About X

If an interviewer asked about a topic **not** in a design:

1. Add as subsection to relevant design
2. Or create new "Deep Dive" article (e.g., `01.01-topic-name.md`)
3. Link from main design with `→ [Deep Dive: Topic](01.01-topic.md)`

### When You Learn New Pattern

1. Add definition to `_abbreviations.md`
2. Mention in relevant designs
3. Create deep dive if complex (e.g., saga pattern)

---

## Troubleshooting

### Mermaid Diagrams Not Rendering

Check that `docs/js/mermaid-init.js` is in your clone and build succeeds.

```bash
python3 -m mkdocs build
# Should output "Successfully built documentation"
```

### Navigation Not Updating

After editing `mkdocs.yml`, clear cache and rebuild:

```bash
rm -rf site/
python3 -m mkdocs build
```

### Abbreviations Not Showing

Ensure each `.md` file ends with:

```markdown
--8<-- "_abbreviations.md"
```

Rebuild and refresh browser.

---

## Key Statistics

| Metric | Value | Notes |
|:-------|:------|:------|
| Example topics in plan | 130+ | Easy (15) + Medium (59) + Hard (37) + Advanced (19) |
| Designs completed | 1 | Hotel Booking Service |
| Designs in progress | 0 | Ready for next! |
| Glossary terms | 80+ | Expandable definitions |
| Time per design (estimate) | 1–2 hrs | After first 3, becomes faster |
| Study time per design | 30–60 min | Varies by difficulty |
| Last-minute revision time | 5 min | Cheat sheet only |

---

## Contributing

To maintain consistency:

1. **Always follow COPILOT_INSTRUCTIONS.md** for style
2. **Use TEMPLATE.md as starting point** for new designs
3. **Reference Hotel Booking Service for examples** (depth, tone, structure)
4. **Test locally before publishing:** `python3 -m mkdocs serve`
5. **Update glossary for any new terms** (one definition per term, no duplication)

---

## License & Usage

These materials are intended for **interview preparation** of candidates at any level.

Feel free to:
- ✅ Fork and adapt for your org
- ✅ Add designs specific to your company
- ✅ Create extended versions with deep dives
- ✅ Use in study groups or mentoring

---

## Contact & Feedback

After using this material in a real interview, share:
- Which topics were asked about?
- Which cheat sheets saved you?
- What was missing?
- How much study time per topic felt right?

This feedback helps improve the material for next cohort.

---

**Version:** 1.0  
**Created:** April 26, 2026  
**Last Updated:** April 26, 2026  
**Status:** 1 example complete, ready to scale to all 130+ topics

Next step: Pick your first new design and start filling the template! 🚀
