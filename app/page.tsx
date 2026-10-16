"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Brain, RotateCcw, Sun, Moon, Trophy, Users, Bot, Zap, Minus, Volume2, VolumeX } from "lucide-react"
import { useTheme } from "next-themes"

/* ─── Types ─────────────────────────────────────────────────────────────── */
type Player = "X" | "O" | null
type Board = Player[]
type Status = "playing" | "x-wins" | "o-wins" | "draw"
type Difficulty = "easy" | "medium" | "hard"
type Mode = "vs-ai" | "vs-human"
type MoveRecord = { cell: number; player: "X" | "O" }

/* ─── Winning combinations ───────────────────────────────────────────────── */
const COMBOS = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
] as const

/* ─── Core game logic ────────────────────────────────────────────────────── */
function checkResult(board: Board): { status: Status; winCells: number[] } {
  for (const [a, b, c] of COMBOS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { status: board[a] === "X" ? "x-wins" : "o-wins", winCells: [a, b, c] }
    }
  }
  return { status: board.every(c => c !== null) ? "draw" : "playing", winCells: [] }
}

function emptyIndices(board: Board) {
  return board.reduce<number[]>((acc, c, i) => (c === null ? [...acc, i] : acc), [])
}

function minimax(board: Board, depth: number, isMax: boolean, alpha = -Infinity, beta = Infinity): number {
  const { status } = checkResult(board)
  if (status === "o-wins") return 10 - depth
  if (status === "x-wins") return depth - 10
  if (status === "draw")   return 0
  if (isMax) {
    let best = -Infinity
    for (const i of emptyIndices(board)) {
      board[i] = "O"; best = Math.max(best, minimax(board, depth+1, false, alpha, beta)); board[i] = null
      alpha = Math.max(alpha, best); if (beta <= alpha) break
    }
    return best
  } else {
    let best = Infinity
    for (const i of emptyIndices(board)) {
      board[i] = "X"; best = Math.min(best, minimax(board, depth+1, true, alpha, beta)); board[i] = null
      beta = Math.min(beta, best); if (beta <= alpha) break
    }
    return best
  }
}

function getAiMove(board: Board, difficulty: Difficulty, aiSym: "X" | "O"): number {
  const empty = emptyIndices(board)
  if (!empty.length) return -1
  if (difficulty === "easy") return empty[Math.floor(Math.random() * empty.length)]
  if (difficulty === "medium" && Math.random() < 0.45) return empty[Math.floor(Math.random() * empty.length)]
  // Hard: full minimax (O maximises, X minimises — swap if AI is X)
  const isAiMax = aiSym === "O"
  let bestVal = isAiMax ? -Infinity : Infinity
  let bestMove = empty[0]
  for (const i of empty) {
    board[i] = aiSym
    const val = minimax(board, 0, !isAiMax)
    board[i] = null
    if ((isAiMax && val > bestVal) || (!isAiMax && val < bestVal)) { bestVal = val; bestMove = i }
  }
  return bestMove
}

const THINK_MS: Record<Difficulty, number> = { easy: 250, medium: 500, hard: 750 }
const SCORE_KEY = "ttt-scores-v3"

/* ─── Sound (Web Audio API, no library) ─────────────────────────────────── */
function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.25) {
  try {
    const ctx = new (window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!)()
    const osc = ctx.createOscillator(); const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = type; osc.frequency.setValueAtTime(freq, ctx.currentTime)
    gain.gain.setValueAtTime(vol, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
    osc.start(); osc.stop(ctx.currentTime + dur)
  } catch { /* noop — audio blocked */ }
}

const sfx = {
  click: () => tone(480, 0.08, "sine", 0.18),
  win:   () => { tone(523, 0.12); setTimeout(() => tone(659, 0.12), 130); setTimeout(() => tone(784, 0.25), 260) },
  lose:  () => { tone(330, 0.18); setTimeout(() => tone(262, 0.28), 180) },
  draw:  () => { tone(370, 0.15, "square", 0.12); setTimeout(() => tone(330, 0.2, "square", 0.1), 160) },
}

/* ════════════════════════════════════════════════════════════════════════════
   Component
   ════════════════════════════════════════════════════════════════════════════ */
export default function TicTacToe() {
  const [board,        setBoard]        = useState<Board>(Array(9).fill(null))
  const [current,      setCurrent]      = useState<"X" | "O">("X")
  const [status,       setStatus]       = useState<Status>("playing")
  const [winCells,     setWinCells]     = useState<number[]>([])
  const [newCells,     setNewCells]     = useState<number[]>([])
  const [moveHistory,  setMoveHistory]  = useState<MoveRecord[]>([])
  const [difficulty,   setDifficulty]   = useState<Difficulty>("hard")
  const [mode,         setMode]         = useState<Mode>("vs-ai")
  const [playerSymbol, setPlayerSymbol] = useState<"X" | "O">("X")  // what human plays
  const [aiThinking,   setAiThinking]   = useState(false)
  const [scores,       setScores]       = useState({ x: 0, o: 0, draws: 0 })
  const [shakeBoard,   setShakeBoard]   = useState(false)
  const [soundOn,      setSoundOn]      = useState(true)
  const [mounted,      setMounted]      = useState(false)
  const historyRef = useRef<HTMLDivElement>(null)
  const { resolvedTheme, setTheme } = useTheme()

  // Derived: which symbol is human vs AI
  const humanSym = mode === "vs-human" ? current : playerSymbol
  const aiSym    = playerSymbol === "X" ? "O" : "X"

  const play = useCallback((fn: () => void) => { if (soundOn) fn() }, [soundOn])

  useEffect(() => {
    setMounted(true)
    try { const s = localStorage.getItem(SCORE_KEY); if (s) setScores(JSON.parse(s)) } catch { /* noop */ }
    try { const s = localStorage.getItem("ttt-sound"); if (s) setSoundOn(JSON.parse(s)) } catch { /* noop */ }
  }, [])

  useEffect(() => { if (mounted) localStorage.setItem(SCORE_KEY, JSON.stringify(scores)) }, [scores, mounted])
  useEffect(() => { if (mounted) localStorage.setItem("ttt-sound", JSON.stringify(soundOn)) }, [soundOn, mounted])

  // Auto-scroll history to latest
  useEffect(() => {
    if (historyRef.current) historyRef.current.scrollLeft = historyRef.current.scrollWidth
  }, [moveHistory])

  /* ── Resolve result ─────────────────────────────────────────────────────── */
  const resolveResult = useCallback((b: Board, soundEnabled: boolean): Status => {
    const { status: s, winCells: wc } = checkResult(b)
    setStatus(s); setWinCells(wc)
    if (s !== "playing") {
      setScores(prev => ({
        x:     prev.x     + (s === "x-wins" ? 1 : 0),
        o:     prev.o     + (s === "o-wins" ? 1 : 0),
        draws: prev.draws + (s === "draw"    ? 1 : 0),
      }))
      if (soundEnabled) {
        if (s === "draw") { setShakeBoard(true); setTimeout(() => setShakeBoard(false), 500); sfx.draw() }
      }
    }
    return s
  }, [])

  /* ── AI move helper ─────────────────────────────────────────────────────── */
  const runAiMove = useCallback((snap: Board, sym: "X" | "O", diff: Difficulty, snd: boolean, onDone?: () => void) => {
    setAiThinking(true)
    setTimeout(() => {
      const ai = getAiMove([...snap], diff, sym)
      if (ai === -1) { setAiThinking(false); onDone?.(); return }
      snap[ai] = sym
      setBoard([...snap])
      setNewCells([ai])
      setMoveHistory(h => [...h, { cell: ai, player: sym }])
      if (snd) sfx.click()
      const s = resolveResult(snap, snd)
      if (s !== "playing" && snd) {
        setTimeout(() => sym === (playerSymbol === "X" ? "O" : "X") ? sfx.win() : sfx.lose(), 200)
      }
      setAiThinking(false)
      onDone?.()
    }, THINK_MS[diff])
  }, [resolveResult, playerSymbol])

  /* ── Reset ─────────────────────────────────────────────────────────────── */
  const resetGame = useCallback((sym?: "X" | "O", m?: Mode, diff?: Difficulty) => {
    const pSym  = sym  ?? playerSymbol
    const pMode = m    ?? mode
    const pDiff = diff ?? difficulty
    const empty: Board = Array(9).fill(null)

    setBoard(empty)
    setStatus("playing")
    setWinCells([])
    setNewCells([])
    setMoveHistory([])
    setAiThinking(false)
    setShakeBoard(false)

    if (pMode === "vs-ai" && pSym === "O") {
      // AI plays X and goes first
      setCurrent("O")
      const snap = [...empty]
      runAiMove(snap, "X", pDiff, soundOn, () => setCurrent("O"))
    } else {
      setCurrent("X")
    }
  }, [playerSymbol, mode, difficulty, soundOn, runAiMove])

  /* ── Cell click ─────────────────────────────────────────────────────────── */
  const handleClick = useCallback((idx: number) => {
    if (board[idx] || status !== "playing" || aiThinking) return
    if (mode === "vs-ai" && current !== playerSymbol) return

    const b = [...board]
    b[idx] = current
    setBoard(b)
    setNewCells([idx])
    setMoveHistory(h => [...h, { cell: idx, player: current }])
    play(sfx.click)

    const s = resolveResult(b, soundOn)
    if (s !== "playing") {
      if (soundOn) setTimeout(() => (current === "X" ? sfx.win : sfx.lose)(), 200)
      return
    }

    if (mode === "vs-human") { setCurrent(p => p === "X" ? "O" : "X"); return }

    // AI's turn
    setCurrent(aiSym)
    const snap = [...b]
    runAiMove(snap, aiSym, difficulty, soundOn, () => {
      setCurrent(playerSymbol)
    })
    // win/lose sound is handled inside runAiMove
  }, [board, current, status, aiThinking, mode, playerSymbol, aiSym, difficulty, soundOn, play, resolveResult, runAiMove])

  /* ── Status display ─────────────────────────────────────────────────────── */
  const statusInfo = (() => {
    if (aiThinking)          return { msg: "AI is thinking…",                                    icon: <Brain className="w-4 h-4 animate-pulse" />, cls: "text-purple-400" }
    if (status === "x-wins") return { msg: mode === "vs-ai" ? (playerSymbol === "X" ? "You win! 🎉" : "AI wins! 🤖") : "X wins! 🎉",  icon: <Trophy className="w-4 h-4" />, cls: playerSymbol === "X" || mode === "vs-human" ? "text-cyan-400" : "text-rose-400" }
    if (status === "o-wins") return { msg: mode === "vs-ai" ? (playerSymbol === "O" ? "You win! 🎉" : "AI wins! 🤖") : "O wins! 🎉",  icon: <Trophy className="w-4 h-4" />, cls: playerSymbol === "O" || mode === "vs-human" ? "text-rose-400" : "text-rose-400" }
    if (status === "draw")   return { msg: "It's a draw! 🤝", icon: <Minus  className="w-4 h-4" />, cls: "text-amber-400" }
    if (current === "X")     return { msg: mode === "vs-ai" ? (playerSymbol === "X" ? "Your turn" : "AI's turn") : "Player X's turn", icon: <Zap    className="w-4 h-4" />, cls: "text-cyan-400" }
    return                          { msg: mode === "vs-ai" ? (playerSymbol === "O" ? "Your turn" : "AI's turn") : "Player O's turn", icon: <Bot    className="w-4 h-4" />, cls: "text-rose-400" }
  })()

  /* ── Score labels ───────────────────────────────────────────────────────── */
  const xLabel = mode === "vs-human" ? "Player X" : playerSymbol === "X" ? "You (X)" : "AI (X)"
  const oLabel = mode === "vs-human" ? "Player O" : playerSymbol === "O" ? "You (O)" : "AI (O)"

  /* ══════════════════════════════════════════════════════════════════ RENDER */
  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-8 relative
                    bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50
                    dark:from-[#070d1a] dark:via-[#070d1a] dark:to-[#070d1a]">

      {/* Background blobs — visible only in dark mode via CSS */}
      <div className="opacity-0 dark:opacity-100 transition-opacity duration-500 animate-blob
                      absolute -top-40 -left-24 w-[450px] h-[450px] rounded-full
                      bg-purple-600/15 blur-[80px] pointer-events-none" />
      <div className="opacity-0 dark:opacity-100 transition-opacity duration-500 animate-blob-delay
                      absolute -bottom-40 -right-24 w-[400px] h-[400px] rounded-full
                      bg-cyan-600/10 blur-[80px] pointer-events-none" />
      <div className="opacity-0 dark:opacity-100 transition-opacity duration-500
                      absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                      w-[300px] h-[300px] rounded-full bg-indigo-800/10 blur-[60px] pointer-events-none" />
      <div className="opacity-0 dark:opacity-100 transition-opacity duration-500
                      absolute inset-0 pointer-events-none"
           style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.03) 1px,transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* ══ Card ═══════════════════════════════════════════════════════ */}
      <div className={`relative z-10 w-full max-w-[380px] rounded-3xl p-5 transition-all duration-500
                       bg-white border border-slate-200/80 shadow-[0_24px_60px_rgba(99,102,241,0.12)]
                       dark:bg-white/[0.04] dark:border-white/[0.08] dark:shadow-[0_24px_80px_rgba(0,0,0,0.6)] dark:backdrop-blur-xl
                       ${shakeBoard ? "animate-shake" : ""}`}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {/* SVG logo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/favicon.svg" alt="Tic-Tac-Toe AI logo"
              className="w-10 h-10 rounded-2xl shadow-[0_0_20px_rgba(139,92,246,0.5)]" />
            <div>
              <h1 className="text-[15px] font-black leading-none text-slate-800 dark:text-white">
                Tic-Tac-Toe AI
              </h1>
              <p className="text-[10px] font-medium text-slate-400 mt-0.5">Minimax · Alpha-Beta Pruning</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Sound toggle */}
            <button onClick={() => setSoundOn(s => !s)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95
                         bg-slate-100 border border-slate-200 text-slate-500 hover:bg-slate-200
                         dark:bg-white/[0.07] dark:border-white/[0.1] dark:text-slate-400 dark:hover:bg-white/[0.12]"
              title={soundOn ? "Mute sounds" : "Enable sounds"}>
              {mounted
                ? (soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-400" />)
                : <Volume2 className="w-4 h-4" />}
            </button>
            {/* Theme toggle */}
            {mounted && (
              <button onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95
                           bg-slate-100 border border-slate-200 text-slate-500 hover:bg-slate-200
                           dark:bg-white/[0.07] dark:border-white/[0.1] dark:text-slate-400 dark:hover:bg-white/[0.12]">
                {resolvedTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* ── Scoreboard ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: xLabel, value: scores.x,     color: "text-cyan-500 dark:text-cyan-400",  bg: "bg-cyan-50  border-2 border-slate-800 dark:bg-cyan-500/[0.08]  dark:border-cyan-400/60" },
            { label: "Draws", value: scores.draws, color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-50 border-2 border-slate-800 dark:bg-amber-500/[0.08] dark:border-amber-400/60" },
            { label: oLabel, value: scores.o,      color: "text-rose-500 dark:text-rose-400",  bg: "bg-rose-50  border-2 border-slate-800 dark:bg-rose-500/[0.08]  dark:border-rose-400/60" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-2xl p-3 text-center`}>
              <div className={`text-3xl font-black tabular-nums ${color}`}>{value}</div>
              <div className="text-[10px] font-semibold mt-0.5 text-slate-400 dark:text-slate-500">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Mode selector ──────────────────────────────────────────── */}
        <div className="flex p-1 rounded-2xl gap-1 mb-2.5
                        bg-slate-100 border-2 border-slate-800
                        dark:bg-white/[0.04] dark:border-white/40">
          {([["vs-ai", <Bot className="w-3.5 h-3.5" key="b"/>, "vs AI"],
             ["vs-human", <Users className="w-3.5 h-3.5" key="u"/>, "2 Players"]] as const).map(([m, icon, lbl]) => (
            <button key={m} onClick={() => { setMode(m as Mode); resetGame(undefined, m as Mode) }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all
                          ${mode === m
                            ? "bg-white border border-slate-200 text-slate-800 shadow-sm dark:bg-white/[0.1] dark:border-white/[0.1] dark:text-white"
                            : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"}`}>
              {icon}{lbl}
            </button>
          ))}
        </div>

        {/* ── vs-AI options: Difficulty + Play-as ────────────────────── */}
        {mode === "vs-ai" && (<>
          {/* Difficulty */}
          <div className="flex p-1 rounded-2xl gap-1 mb-2.5
                          bg-slate-100 border-2 border-slate-800
                          dark:bg-white/[0.04] dark:border-white/40">
            {(["easy", "medium", "hard"] as const).map(d => {
              const diffStyles: Record<Difficulty, string> = {
                easy:   "bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30",
                medium: "bg-amber-100  text-amber-700  border border-amber-300  dark:bg-amber-500/20  dark:text-amber-300  dark:border-amber-500/30",
                hard:   "bg-rose-100   text-rose-700   border border-rose-300   dark:bg-rose-500/20   dark:text-rose-300   dark:border-rose-500/30",
              }
              return (
                <button key={d} onClick={() => { setDifficulty(d); resetGame(undefined, undefined, d) }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all
                              ${difficulty === d ? diffStyles[d] : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"}`}>
                  {d === "easy" ? "😊" : d === "medium" ? "🤔" : "🔥"} {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              )
            })}
          </div>

          {/* Play as (first-move choice) */}
          <div className="flex p-1 rounded-2xl gap-1 mb-4
                          bg-slate-100 border-2 border-slate-800
                          dark:bg-white/[0.04] dark:border-white/40">
            <span className="flex items-center pl-2 pr-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 shrink-0">
              Play as:
            </span>
            {(["X", "O"] as const).map(sym => (
              <button key={sym} onClick={() => { setPlayerSymbol(sym); resetGame(sym) }}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all
                            ${playerSymbol === sym
                              ? sym === "X"
                                ? "bg-cyan-100 text-cyan-700 border border-cyan-300 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/30"
                                : "bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30"
                              : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"}`}>
                {sym === "X" ? "✕ X (go first)" : "○ O (go second)"}
              </button>
            ))}
          </div>
        </>)}

        {/* margin for vs-human (no vs-ai options) */}
        {mode === "vs-human" && <div className="mb-4" />}

        {/* ── Board ──────────────────────────────────────────────────── */}
        <div className="relative mb-4">
          <div className="grid grid-cols-3 gap-2.5 p-4 rounded-2xl
                          bg-slate-50 border border-slate-200 shadow-inner
                          dark:bg-white/[0.03] dark:border-white/[0.07]">
            {board.map((cell, i) => {
              const isWin   = winCells.includes(i)
              const isNew   = newCells.includes(i)
              const canClick = !cell && status === "playing" && !aiThinking &&
                               !(mode === "vs-ai" && current !== playerSymbol)
              return (
                <button key={i} id={`cell-${i}`} onClick={() => handleClick(i)}
                  aria-label={`Cell ${i+1}${cell ? `, ${cell}` : ""}`}
                  className={[
                    "aspect-square rounded-2xl flex items-center justify-center text-4xl font-black select-none transition-all duration-200",
                    isWin && cell === "X" ? "animate-win-glow-x bg-cyan-500/20 border-2 border-cyan-400/80 scale-105" : "",
                    isWin && cell === "O" ? "animate-win-glow-o bg-rose-500/20 border-2 border-rose-400/80 scale-105" : "",
                    !isWin ? "bg-white border-2 border-slate-800 dark:bg-white/[0.06] dark:border-white/40" : "",
                    canClick ? "hover:scale-[1.06] hover:border-slate-600 dark:hover:border-white/60 cursor-pointer" : "cursor-default",
                    isNew ? "animate-cell-pop" : "",
                  ].filter(Boolean).join(" ")}>
                  {cell === "X" && (
                    <span className={isWin
                      ? "text-cyan-300 drop-shadow-[0_0_12px_rgba(6,182,212,1)]"
                      : "text-sky-600 dark:text-cyan-400 dark:drop-shadow-[0_0_6px_rgba(6,182,212,0.7)]"}>×</span>
                  )}
                  {cell === "O" && (
                    <span className={isWin
                      ? "text-rose-300 drop-shadow-[0_0_12px_rgba(244,63,94,1)]"
                      : "text-red-500 dark:text-rose-400 dark:drop-shadow-[0_0_6px_rgba(244,63,94,0.7)]"}>○</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* AI thinking overlay */}
          {aiThinking && (
            <div className="absolute inset-0 rounded-2xl bg-black/10 dark:bg-black/25 backdrop-blur-[1px]
                            flex items-center justify-center pointer-events-none">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold
                              bg-purple-100 text-purple-700 border border-purple-200
                              dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30">
                <Brain className="w-4 h-4 animate-pulse" />Thinking…
              </div>
            </div>
          )}
        </div>

        {/* ── Status ─────────────────────────────────────────────────── */}
        <div className="text-center mb-3 min-h-[1.75rem] flex items-center justify-center gap-2">
          <span className={statusInfo.cls}>{statusInfo.icon}</span>
          <span className={`text-sm font-bold ${statusInfo.cls}`}>{statusInfo.msg}</span>
        </div>

        {/* ── Move History strip ──────────────────────────────────────── */}
        <div className="mb-4">
          {/* History header row */}
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider">
              Move History ({moveHistory.length}/9)
            </span>
            {moveHistory.length > 0 && (
              <button
                onClick={() => setMoveHistory([])}
                className="text-[10px] font-semibold text-slate-400 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400
                           transition-colors px-1.5 py-0.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10">
                ✕ Clear
              </button>
            )}
          </div>
          {/* Scrollable chips */}
          <div ref={historyRef}
            className="flex items-center gap-1.5 overflow-x-auto scrollbar-none min-h-[2rem]
                       px-1 pb-0.5 rounded-xl border-2 border-slate-800 dark:border-white/40
                       bg-slate-50 dark:bg-white/[0.03] py-1.5">
            {moveHistory.length === 0 ? (
              <span className="text-[10px] text-slate-300 dark:text-slate-700 mx-auto">No moves yet</span>
            ) : moveHistory.map((m, i) => (
              <div key={i} className={`shrink-0 flex items-center justify-center rounded-lg
                                       w-7 h-7 text-[11px] font-black border-2 transition-all
                                       ${m.player === "X"
                                         ? "bg-cyan-50 border-cyan-400 text-cyan-600 dark:bg-cyan-500/15 dark:border-cyan-500/60 dark:text-cyan-300"
                                         : "bg-rose-50 border-rose-400 text-rose-600 dark:bg-rose-500/15 dark:border-rose-500/60 dark:text-rose-300"
                                       }`}
                title={`Move ${i+1}: ${m.player} → cell ${m.cell+1}`}>
                {m.cell + 1}
              </div>
            ))}
          </div>
        </div>

        {/* ── Action buttons ──────────────────────────────────────────── */}
        <div className="flex gap-2">
          <button id="new-game-btn" onClick={() => resetGame()}
            className="flex-1 h-11 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2
                       bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500
                       transition-all hover:scale-[1.02] active:scale-[0.97]
                       shadow-[0_4px_20px_rgba(139,92,246,0.35)]">
            <RotateCcw className="w-4 h-4" />New Game
          </button>
          <button id="reset-score-btn" onClick={() => setScores({ x: 0, o: 0, draws: 0 })}
            className="h-11 px-3 rounded-xl font-semibold text-xs leading-tight transition-all
                       hover:scale-[1.02] active:scale-[0.97]
                       bg-slate-100 border border-slate-200 text-slate-500 hover:bg-slate-200 hover:text-slate-700
                       dark:bg-white/[0.05] dark:border-white/[0.09] dark:text-slate-400 dark:hover:bg-white/[0.1] dark:hover:text-slate-200">
            Reset<br/>Score
          </button>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <p className="text-center text-[10px] mt-3 text-slate-400 dark:text-slate-700">
          {difficulty === "hard" && mode === "vs-ai"
            ? "⚠️ Hard mode is truly unbeatable — best you can do is draw"
            : mode === "vs-ai" ? `${difficulty} difficulty · playing as ${playerSymbol}`
            : "2-player local mode — pass and play!"}
        </p>
      </div>
    </div>
  )
}
