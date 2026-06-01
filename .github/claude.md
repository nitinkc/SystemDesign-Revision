Imagine yourself to be the Professor of System Design Class (Computer Science). You teach, give articles to read, and then quiz your students to test their understanding.

You are known to be a great quiz master setting up tricky quizzes that really test the students' understanding of the material. You always make sure to cover all the critical topics in your quizzes, and you provide clear explanations for each question so that students can learn from their mistakes.

I want you to create 2 things:
- A revision memory aid / flashcard deck based on the article below
- An interactive quiz from the article below

---

## PART 1 — FLASHCARDS

### What to build
1. A standalone downloadable HTML file that works offline in any browser
2. An inline interactive flashcard widget rendered directly in chat

### Flashcard requirements
- Cover all key concepts, gotchas, do's and don'ts, and definitions from the article
- Each card has a QUESTION on the front and a DETAILED ANSWER on the back, with examples where relevant
- Mix of question types: definitions, conceptual explanations, practical applications, trade-off analysis, and "apply to a new scenario" questions — no rote memorization
- Group cards by category (based on the article's sections/topics) with a filter pill for each category
- Color-coded type dots on each card: Definition (purple #8B83E6), Concept (green #34D399), Trade-off (red #F87171), Application (blue #60A5FA)
- Track known / unknown per card; show progress bar across the full deck
- "Still learning" / "Got it" rating buttons appear after revealing the answer
- "Study unknowns only" mode isolates cards marked still-learning for targeted review
- Results screen on completion: total score + per-category breakdown
- Export buttons: CSV (Anki/Quizlet compatible with Front, Back, Tags, Type columns) and JSON

### Flashcard style — follow exactly
- Max width: 700px for the HTML file, 660px for the widget
- Font: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
- Page/app background: #0F1117
- Card background: #1A1D27 (question side), #1E2130 (answer side)
- Card border: 1px solid #2E3347, border-radius: 12px, min-height: 200px
- Question text: 16px, font-weight 500, line-height 1.65, color #E8E9F0
- Answer text: 14px, line-height 1.75, color #C8CAD8
- Example sub-text on answer: 13px, color #7B7F96, left border 2px solid #8B83E6, padding-left 10px
- "Question" label: 11px uppercase, font-weight 600, color #8B83E6
- "Answer" label: 11px uppercase, font-weight 600, color #34D399
- Category badge (top-right of card): 11px, background #252840, color #A8A4E8, border-radius 6px
- Progress bar: #8B83E6 on track #252840
- "Got it" button: border #1D6B47, color #34D399, background #0D2E1F
- "Still learning" button: border #7A2E2E, color #F87171, background #2D1515
- Category filter pills: default background #1A1D27, border #2E3347, color #7B7F96; active background #8B83E6, color #ffffff
- Nav buttons (Prev/Next): background #1A1D27, border #2E3347, color #C8CAD8
- Export buttons: background #1A1D27, border #2E3347, color #C8CAD8

### CRITICAL: No CSS variables
- Use only explicit hex color values everywhere — NO var(--...) CSS variables
- This ensures the downloaded HTML file renders correctly in all browsers

### Flashcard behavior
- Cards start showing the QUESTION side (#1A1D27 background, purple "Question" label)
- Clicking the card reveals the ANSWER side (#1E2130 background, green "Answer" label)
- "Still learning" / "Got it" buttons only appear after the answer is revealed
- Prev / Next navigation always available
- Clicking the card again after reveal does nothing (answer stays shown)
- "Study unknowns only" filters to cards not yet marked "Got it"
- Restart resets all known/unknown state and returns to card 1

---

## PART 2 — QUIZ

### What to build
1. An inline interactive quiz widget rendered directly in chat
2. A downloadable standalone HTML file that works offline in any browser

### Quiz requirements
- Questions covering all major concepts in the article — don't miss any critical topic
- Group questions by category (based on the article's sections/topics)
- 4 answer options (A/B/C/D) per question, only one correct
- Shuffle questions on every attempt so it feels fresh each time
- Each question must have a clear explanation shown after answering, win or lose
- Show a progress bar at the top tracking completion
- Show a per-category score breakdown on the results screen
- Show a motivational label based on final score percentage

### Quiz style — follow exactly

#### Colors & theme
- Page/app background: #0F1117
- Card/container background: #1A1D27
- Card border: 1px solid #2E3347, border-radius 12px
- All body text: #E8E9F0
- Secondary/muted text: #7B7F96
- Progress bar fill: #8B83E6, track: #252840
- Category tag: background #252840, color #A8A4E8
- Selected option: border #8B83E6, background #252840, text #A8A4E8
- Correct answer: border #1D6B47, background #0D2E1F, text #34D399
- Wrong answer: border #7A2E2E, background #2D1515, text #F87171
- Correct explanation bar: left border #34D399, background #0D2E1F, text #34D399
- Wrong explanation bar: left border #F87171, background #2D1515, text #F87171
- Option default: border #2E3347, background #1A1D27
- Option hover: background #252840
- Lettered circle (A/B/C/D): background #252840, color #8B83E6

#### Layout & typography
- Max width: 660px for the widget, 680px for the HTML file
- Font: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
- Question: 16px, font-weight 500, line-height 1.65, color #E8E9F0
- Options: 14px, line-height 1.5, color #C8CAD8
- Explanation: 13px, line-height 1.65
- Buttons: 9px 20px padding, 14px font, 8px border-radius
- Primary button (Check answer): background #8B83E6, color #ffffff, border none
- Primary button hover: background #7A72D4
- Secondary button (Next): background transparent, border 1px solid #2E3347, color #C8CAD8
- Secondary button hover: background #252840

#### Results screen
- Background: #1A1D27, border 1px solid #2E3347
- Score number: color #8B83E6
- Per-category stat cards: background #252840, border-radius 8px
- Restart button: background #8B83E6, color #ffffff

### Quiz behavior
- "Check answer" button is disabled until an option is selected; disabled state: opacity 0.4
- Clicking an already-answered question does nothing
- "Next →" button only appears after checking
- On completion, quiz hides and results screen appears
- Results show: score/total, percentage, motivational label, per-category breakdown with X/Y correct
- "Restart quiz" reshuffles and resets everything

### CRITICAL: No CSS variables
- Use only explicit hex color values — NO var(--...) CSS variables
- This ensures the downloaded HTML file renders correctly in all browsers

### Standalone HTML file requirements (both quiz and flashcards)
- Fully self-contained — no CDN dependencies, works 100% offline
- Single .html file with all CSS and JS inline
- Page background: #0F1117
- Page title: [Article Title] — Quiz / Flashcards
- Header text color: #E8E9F0, subtitle color: #7B7F96
- Small header above the card: title + subtitle like "N questions / cards covering all key topics. Shuffled each attempt."
- Present each file for download after creating it

---

## Article

[PASTE YOUR ARTICLE TEXT HERE]