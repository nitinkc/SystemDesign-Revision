I want you to create an interactive quiz from the article below.

## What to build

1. **An inline interactive quiz widget** rendered directly in chat
2. **A downloadable standalone HTML file** that works offline in any browser

## Quiz requirements

- **40 questions** covering all major concepts in the article — don't miss any critical topic
- **Group questions by category** (based on the article's sections/topics)
- **4 answer options (A/B/C/D)** per question, only one correct
- **Shuffle questions** on every attempt so it feels fresh each time
- Each question must have a **clear explanation** shown after answering, win or lose
- Show a **progress bar** at the top tracking completion
- Show a **per-category score breakdown** on the results screen
- Show a **motivational label** based on final score percentage

## Style — follow this exactly

### Colors & theme
- Progress bar: `#534AB7` (purple) — use this as the primary accent color
- Selected option highlight: border `#534AB7`, background `#EEEDFE`, text `#26215C`
- Correct answer: border `#0F6E56`, background `#E1F5EE`, text `#04342C`
- Wrong answer: border `#993C1D`, background `#FAECE7`, text `#4A1B0C`
- Correct explanation bar: left border `#1D9E75`, background `#E1F5EE`, text `#085041`
- Wrong explanation bar: left border `#D85A30`, background `#FAECE7`, text `#4A1B0C`

### Layout & typography
- Max width: `660px` for the widget, `680px` for the HTML file
- Font: system sans-serif (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`)
- Question: `16px`, `font-weight: 500`, `line-height: 1.65`
- Options: `14px`, `line-height: 1.5`, with a lettered circle (A/B/C/D) on the left
- Explanation: `13px`, `line-height: 1.65`, shown only after checking
- Buttons: `9px 20px` padding, `14px` font, `8px` border-radius
- Primary button (Check answer): filled with accent color
- Secondary button (Next): outlined, plain

### Option states
- Default: `1px solid #ddd`, white background
- Hover: `#f8f7f3` background
- Selected: accent-colored border + tint background
- After checking: correct option turns green, wrong selection turns red, everything else goes neutral

### HTML file additional styling
- Page background: `#f5f4f0`
- Card: white, `12px` border-radius, `0.5px solid #ddd`, `1.75rem` padding
- Results breakdown: grid of small stat cards with `#f8f7f3` background

### Behavior
- "Check answer" button is **disabled until an option is selected**
- Clicking an already-answered question does nothing
- "Next →" button only appears after checking
- On completion, quiz hides and results screen slides in
- Results show: `score/total`, percentage, motivational label, per-category breakdown with `X/Y correct`
- "Restart quiz" reshuffles and resets everything

## Standalone HTML file requirements

- Fully self-contained — **no CDN dependencies, works 100% offline**
- Single `.html` file with all CSS and JS inline
- Identical behavior and visual design to the chat widget
- Page title: `[Article Title] — Quiz`
- Small header above the card with the title and a subtitle like "N questions covering all key topics. Shuffled each attempt."
- **Present the file for download** after creating it

## Article to quiz-ify

