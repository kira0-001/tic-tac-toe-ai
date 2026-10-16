# 🎮 Tic-Tac-Toe AI

> Challenge an **unbeatable AI** powered by the Minimax algorithm with Alpha-Beta Pruning — play from any device, completely free, always online.

[![Next.js](https://img.shields.io/badge/Next.js-15.3-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🔗 Live Demo

**[Play it now → tic-tac-toe-ai.vercel.app](https://tic-tac-toe-ai.vercel.app)**

No install. No login. Just play. Works on all devices. 📱💻

---

## ✨ Features

| Feature | Details |
|---|---|
| 🧠 **Unbeatable AI** | Minimax algorithm + Alpha-Beta Pruning — Hard mode cannot be beaten |
| 🎯 **3 Difficulty Levels** | 😊 Easy (random) · 🤔 Medium (50/50) · 🔥 Hard (perfect play) |
| ✕○ **Play as X or O** | Choose to go first (X) or second (O) — AI adapts |
| 👥 **2 Player Mode** | Pass-and-play local multiplayer |
| 📊 **Scoreboard** | Wins/Draws/Losses tracked and saved to `localStorage` |
| 📋 **Move History** | Scrollable numbered strip showing every move in order + Clear button |
| 🔊 **Sound Effects** | Click, win, lose, draw tones via Web Audio API (with mute toggle) |
| 🌓 **Dark / Light Mode** | Persistent theme toggle — neon glows in dark, clean whites in light |
| 💥 **Animations** | Cell pop-in · Win glow pulse · Draw shake · Animated background blobs |
| 📱 **Fully Responsive** | Works on all screen sizes and phone ratios |

---

## 🎮 How to Play

1. **Choose Mode** — vs AI or 2 Players
2. **Pick Difficulty** — Easy / Medium / Hard (vs AI only)
3. **Choose Your Symbol** — Play as X (go first) or O (go second)
4. **Click a cell** to make your move
5. **Try to beat the AI** — in Hard mode the best you can do is draw!

---

## 🛠️ Tech Stack

- **[Next.js 15](https://nextjs.org)** — App Router + React Server Components
- **[React 19](https://react.dev)** — Concurrent rendering
- **[TypeScript 5](https://www.typescriptlang.org)** — Full type safety
- **[Tailwind CSS v4](https://tailwindcss.com)** — Utility-first styling with `dark:` variants
- **[next-themes](https://github.com/pacocoursey/next-themes)** — Persistent dark/light mode
- **[Lucide React](https://lucide.dev)** — Icon library
- **[Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)** — Sound effects without any library

---

## 🧠 AI Algorithm

The AI uses the **Minimax algorithm with Alpha-Beta Pruning**:

```
Your move (X)
     │
     ▼
AI evaluates ALL possible future board states
     │
     ├─ Score = +10 if AI wins (minus depth for speed preference)
     ├─ Score = -10 if Human wins (plus depth)
     └─ Score = 0  if Draw
     │
     ▼
Alpha-Beta Pruning skips branches that can't affect the outcome
     │
     ▼
AI picks the move with the highest score → Perfect play
```

**Difficulty differences:**
- 😊 **Easy** — Picks a completely random available cell
- 🤔 **Medium** — 45% random, 55% optimal (makes "mistakes")
- 🔥 **Hard** — Full Minimax, always plays perfectly — **cannot be beaten**

---

## 🖥️ Local Development

```bash
# Clone
git clone https://github.com/kira0-001/tic-tac-toe-ai.git
cd tic-tac-toe-ai

# Install
npm install --legacy-peer-deps

# Run dev server
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)**

---

## 🚀 Deploy Your Own (Free)

1. Fork this repo
2. Go to **[vercel.com/new](https://vercel.com/new)**
3. Import your fork
4. Click **Deploy** — done in ~60 seconds!

Vercel's free tier is **always online** — no sleeping, no credit card needed.

---

## 📁 Project Structure

```
tic-tac-toe-ai/
├── app/
│   ├── layout.tsx      # Root layout + favicon + metadata
│   ├── page.tsx        # Main game component (all logic + UI)
│   ├── providers.tsx   # next-themes ThemeProvider
│   └── globals.css     # Custom animations + theme tokens
├── public/
│   └── favicon.svg     # Custom SVG game icon
└── package.json
```

---

## 📄 License

MIT © [kira0-001](https://github.com/kira0-001)

---

<p align="center">Built with ❤️ — Go beat the AI if you can! 🤖</p>
