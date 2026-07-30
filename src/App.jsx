import { useEffect, useRef, useState } from 'react'
import {
  Board,
  DragGhost,
  ShapePreview,
  buildPreview,
  cellFromPointer,
} from './components/Board'
import {
  BOARD_SIZE,
  canPlace,
  createEmptyBoard,
  findClearTargets,
  getWouldClearKeys,
  isGameOver,
  placeShape,
  scoreForClear,
} from './game/logic'
import { dealShapes } from './game/shapes'
import {
  isMuted,
  playClear,
  playCombo,
  playGameOver,
  playPickup,
  playPlace,
  toggleMute,
} from './game/sounds'
import './App.css'

const CLEAR_MS = 320

function newGame() {
  return {
    board: createEmptyBoard(),
    shapes: dealShapes(3),
    score: 0,
    best: Number(localStorage.getItem('blocks-best') || 0),
    combo: 0,
    gameOver: false,
  }
}

let popupId = 0

export default function App() {
  const boardRef = useRef(null)
  const clearTimerRef = useRef(null)
  const [state, setState] = useState(newGame)
  const [metrics, setMetrics] = useState({ cell: 40, gap: 4, pad: 10 })
  const [drag, setDrag] = useState(null)
  const [clearingKeys, setClearingKeys] = useState(null)
  const [scorePopups, setScorePopups] = useState([])
  const [scorePulse, setScorePulse] = useState(false)
  const [muted, setMutedState] = useState(isMuted)
  const [comboFlash, setComboFlash] = useState(null)
  const wasGameOverRef = useRef(false)

  const stateRef = useRef(state)
  const metricsRef = useRef(metrics)
  const dragRef = useRef(drag)
  const busyRef = useRef(false)

  stateRef.current = state
  metricsRef.current = metrics
  dragRef.current = drag

  useEffect(() => {
    const el = boardRef.current
    if (!el) return

    const measure = () => {
      const style = getComputedStyle(el)
      const pad = parseFloat(style.paddingLeft) || 10
      const gap = parseFloat(style.gap) || 4
      const cell =
        (el.clientWidth - pad * 2 - gap * (BOARD_SIZE - 1)) / BOARD_SIZE
      setMetrics({ cell, gap, pad })
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current)
    }
  }, [])

  const pushPopup = (points, kind = 'place') => {
    const id = ++popupId
    setScorePopups((list) => [...list, { id, points, kind }])
    setScorePulse(true)
    window.setTimeout(() => {
      setScorePopups((list) => list.filter((p) => p.id !== id))
    }, 900)
    window.setTimeout(() => setScorePulse(false), 280)
  }

  const showComboFlash = (streak) => {
    const id = ++popupId
    setComboFlash({ id, streak })
    window.setTimeout(() => {
      setComboFlash((cur) => (cur?.id === id ? null : cur))
    }, 1100)
  }

  const finishMove = (board, shapes, points, didClear, linesCleared = 0, combo = 0) => {
    const current = stateRef.current
    const score = current.score + points
    const best = Math.max(current.best, score)
    if (best > current.best) localStorage.setItem('blocks-best', String(best))

    const gameOver = isGameOver(board, shapes)
    setState({ board, shapes, score, best, combo, gameOver })
    pushPopup(points, didClear ? (combo >= 2 ? 'combo' : 'clear') : 'place')

    if (didClear) {
      playClear(linesCleared)
      if (combo >= 2) {
        playCombo(combo)
        showComboFlash(combo)
      }
    } else {
      playPlace()
    }

    if (gameOver && !wasGameOverRef.current) {
      wasGameOverRef.current = true
      window.setTimeout(() => playGameOver(), 120)
    }

    busyRef.current = false
    setClearingKeys(null)
  }

  const restart = () => {
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current)
    busyRef.current = false
    wasGameOverRef.current = false
    setClearingKeys(null)
    setScorePopups([])
    setComboFlash(null)
    setState((prev) => ({ ...newGame(), best: prev.best }))
    setDrag(null)
  }

  const onToggleMute = () => {
    setMutedState(toggleMute())
  }

  const tryPlace = (index, row, col) => {
    if (busyRef.current) return false
    const current = stateRef.current
    const shape = current.shapes[index]
    if (!shape || current.gameOver) return false
    if (!canPlace(current.board, shape, row, col)) return false

    const boardAfterPlace = placeShape(current.board, shape, row, col)
    const { positions, linesCleared } = findClearTargets(boardAfterPlace)

    const shapes = current.shapes.slice()
    shapes[index] = null
    let nextShapes = shapes
    if (shapes.every((s) => s === null)) {
      nextShapes = dealShapes(3)
    }

    const didClear = positions.length > 0
    const combo = didClear ? current.combo + 1 : 0
    const points = scoreForClear(
      linesCleared,
      positions.length,
      shape.cells.length,
      combo || 1,
    )

    if (!didClear) {
      finishMove(boardAfterPlace, nextShapes, points, false, 0, 0)
      return true
    }

    busyRef.current = true
    playPlace()
    setState({
      ...current,
      board: boardAfterPlace,
      shapes: nextShapes,
      combo,
      gameOver: false,
    })
    setClearingKeys(new Set(positions.map(({ r, c }) => `${r}-${c}`)))

    clearTimerRef.current = window.setTimeout(() => {
      const cleared = boardAfterPlace.map((line) => line.slice())
      for (const { r, c } of positions) cleared[r][c] = null
      finishMove(cleared, nextShapes, points, true, linesCleared, combo)
    }, CLEAR_MS)

    return true
  }

  const startDrag = (index, e) => {
    if (busyRef.current || state.gameOver || !state.shapes[index]) return
    e.preventDefault()
    playPickup()
    setDrag({
      index,
      x: e.clientX,
      y: e.clientY,
      isTouch: e.pointerType === 'touch',
    })
  }

  useEffect(() => {
    if (!drag) return

    const onMove = (e) => {
      e.preventDefault()
      setDrag((d) =>
        d ? { ...d, x: e.clientX, y: e.clientY } : null,
      )
    }

    const onUp = (e) => {
      const current = dragRef.current
      if (!current) return

      const shape = stateRef.current.shapes[current.index]
      if (shape) {
        const cell = cellFromPointer(
          boardRef.current,
          metricsRef.current,
          shape,
          e.clientX,
          e.clientY,
          current.isTouch,
        )
        if (cell) tryPlace(current.index, cell.row, cell.col)
      }
      setDrag(null)
    }

    const onKey = (e) => {
      if (e.key === 'Escape') setDrag(null)
    }

    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    window.addEventListener('keydown', onKey)
    document.body.classList.add('dragging-piece')

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      window.removeEventListener('keydown', onKey)
      document.body.classList.remove('dragging-piece')
    }
  }, [Boolean(drag)])

  const dragShape = drag ? state.shapes[drag.index] : null
  const hoverCell =
    drag && dragShape
      ? cellFromPointer(
          boardRef.current,
          metrics,
          dragShape,
          drag.x,
          drag.y,
          drag.isTouch,
        )
      : null
  const preview = buildPreview(state.board, dragShape, hoverCell)
  const canDrop =
    dragShape &&
    hoverCell &&
    canPlace(state.board, dragShape, hoverCell.row, hoverCell.col)
  const threatenKeys =
    canDrop && dragShape && hoverCell
      ? getWouldClearKeys(
          state.board,
          dragShape,
          hoverCell.row,
          hoverCell.col,
        )
      : null

  return (
    <div className={['game', drag ? 'is-dragging' : ''].filter(Boolean).join(' ')}>
      <header className="hud">
        <div className="brand">
          <h1>BLOCKS</h1>
          <p>Drag shapes onto the board</p>
        </div>
        <div className="scores">
          <div
            className={['score-box', scorePulse ? 'pulse' : '']
              .filter(Boolean)
              .join(' ')}
          >
            <span className="label">
              Score
              {state.combo >= 2 && (
                <span className="combo-inline"> · ×{state.combo}</span>
              )}
            </span>
            <span className="value">{state.score}</span>
            <div className="score-popups" aria-live="polite">
              {scorePopups.map((p) => (
                <span
                  key={p.id}
                  className={['score-popup', p.kind].join(' ')}
                >
                  +{p.points}
                </span>
              ))}
            </div>
          </div>
          <div className="score-box">
            <span className="label">Best</span>
            <span className="value">{state.best}</span>
          </div>
        </div>
      </header>

      <div className="board-wrap">
        <Board
          boardRef={boardRef}
          board={state.board}
          preview={preview}
          previewColor={dragShape?.color}
          clearingKeys={clearingKeys}
          threatenKeys={threatenKeys}
        />
        {comboFlash && (
          <div
            key={comboFlash.id}
            className={[
              'combo-banner',
              comboFlash.streak >= 4 ? 'epic' : comboFlash.streak >= 3 ? 'hot' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-live="polite"
          >
            <span className="combo-label">COMBO</span>
            <span className="combo-mult">×{comboFlash.streak}</span>
          </div>
        )}
      </div>

      <div className="tray" aria-label="Shapes">
        {state.shapes.map((shape, i) => (
          <ShapePreview
            key={shape?.id ?? `empty-${i}`}
            shape={shape}
            used={!shape}
            dragging={drag?.index === i}
            disabled={Boolean(clearingKeys)}
            onPick={(e) => startDrag(i, e)}
          />
        ))}
      </div>

      <div className="actions">
        <button
          type="button"
          className="btn icon"
          onClick={onToggleMute}
          aria-pressed={muted}
          aria-label={muted ? 'Unmute sound' : 'Mute sound'}
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? 'Sound off' : 'Sound on'}
        </button>
        <button type="button" className="btn" onClick={restart}>
          New game
        </button>
      </div>

      {drag && dragShape && (
        <DragGhost
          shape={dragShape}
          x={drag.x}
          y={drag.y}
          cell={metrics.cell}
          gap={metrics.gap}
          valid={hoverCell ? canDrop : null}
          isTouch={drag.isTouch}
        />
      )}

      {state.gameOver && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>Game over</h2>
            <p>No more moves. Score: {state.score}</p>
            <button type="button" className="btn primary" onClick={restart}>
              Play again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
