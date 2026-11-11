# Joyful Math

A fun math site for kids. First topic: **Reach the Target**.

Use every number once and all four operations (+ − × ÷) at least once to reach the target number.

## Features

- Numbers range: 1–10 or 1–100
- 5 to 10 numbers per puzzle
- Every puzzle is guaranteed solvable
- Click-to-play: pick a number, an operation, then another number. Undo and start over included
- "Show solutions" lists up to 5 step-by-step solutions
- Light and dark theme (follows the system, remembered per browser)
- Share buttons for Facebook and X

## Rules

- Whole numbers only: subtraction must stay above zero, division must be exact.
- You win when the last remaining number equals the target and all four operations were used.

## Tech

Plain HTML, CSS and JavaScript in `public/`. No build step, no runtime dependencies. Hosted on Cloudflare (static assets via Wrangler).

## Develop

```
npm install
npm run dev      # local preview
```

## Deploy

```
npx wrangler login
npm run deploy
```

## Structure

```
public/index.html   page
public/style.css    styles and themes
public/app.js       puzzle generator, solver, game logic
wrangler.jsonc      Cloudflare config
```

© Solutiny
