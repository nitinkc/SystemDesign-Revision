# System Design Interview Prep — Quick Reference Guide

> Last-minute revision material for system design interviews. Each design includes a **4–5 step summary**, **cheat sheet**, and **interactive glossary** of technical terms.

---

## How to Use This Guide

### For Each System Design:

1. **Read the summary** (5–10 min) — covers all 4–5 steps of design thinking
2. **Scan the cheat sheet** (2 min) — key decisions and trade-offs at a glance
3. **Look up terms** — hover over **Abbreviated Terms** like *ACID*, *PACT*, *Bloom Filter* for quick definitions

### Learning Paths

- **Hard Interview coming in 2 hours?** → Read the cheat sheet, review glossary terms
- **Studying for a month?** → Work through one design per day, take sparse notes on why each choice was made
- **Deep dive mode?** → Use the → **[Deep Dive]** links to understand the mechanics of each technology (coming soon)

---

## Topic Difficulty Levels

### Easy (Data Model + Basic Scaling)
- URL Shortening, Parking Lot, Weather System, Tagging Service, Pastebin

### Medium (Concurrency + Multiple Features)
- Twitter, Social Media, Streaming, Task Scheduling, Rate Limiter, Cache

### Hard (Consistency + Distributed Systems)
- Uber, Hotel Booking, Trading Platform, Payment System, Notification Service

### Advanced (Infrastructure Scale)
- DNS, CDN, Blockchain, MapReduce, Kubernetes, Virtualization

---

## Quick Navigation

- [Easy Designs](easy/index.md)
- [Medium Designs](medium/index.md)
- [Hard Designs](hard/index.md)
- [Advanced Designs](advanced/index.md)
- [Glossary & Abbreviations](glossary.md)

---

## Sample: Hotel Booking Service

[See the full example →](easy/01-hotel-booking.md)

```
✓ Step 1: Functional & Non-Functional Requirements
✓ Step 2: API Design, Data Model, High-Level Architecture
✓ Step 3: Improved Data Model, Concurrency, Consistency, Scalability
✓ Step 4: Persistence Layer, Caching, Search, Monitoring
✓ Cheat Sheet: 1-page reference
✓ Glossary: All terms explained
```

---

**Generated:** April 26, 2026 | **Last Updated:** Today  
**Goal:** Every candidate should be able to explain ANY system design in 45 minutes after reviewing this material.

--8<-- "_abbreviations.md"
