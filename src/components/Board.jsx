import { BOARD_SIZE } from '../game/logic'
import { shapeSize } from '../game/shapes'

export function Board({
  boardRef,
  board,
  preview,
  previewColor,
  clearingKeys,
  threatenKeys,
}) {
  return (
    <div
      ref={boardRef}
      className="board"
      style={{ '--size': BOARD_SIZE }}
    >
      {board.map((row, r) =>
        row.map((color, c) => {
          const key = `${r}-${c}`
          const previewState = preview?.get(key)
          const clearing = clearingKeys?.has(key)
          const threaten = !clearing && threatenKeys?.has(key)
          const blockColor = color || (previewState === 'ok' ? previewColor : null)

          return (
            <div
              key={key}
              className={[
                'cell',
                blockColor ? 'filled' : '',
                clearing ? 'clearing' : '',
                threaten ? 'will-clear' : '',
                !clearing && !threaten && previewState === 'ok'
                  ? 'preview-ok'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={
                blockColor
                  ? {
                      '--block': blockColor,
                      '--clear-delay': `${(r * 8 + c) * 12}ms`,
                    }
                  : undefined
              }
            />
          )
        }),
      )}
    </div>
  )
}

export function buildPreview(board, shape, hoverCell) {
  const map = new Map()
  if (!shape || !hoverCell) return map

  const { row, col } = hoverCell
  const cells = []

  for (const [dr, dc] of shape.cells) {
    const r = row + dr
    const c = col + dc
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return map
    if (board[r][c] !== null) return map
    cells.push([r, c])
  }

  for (const [r, c] of cells) {
    map.set(`${r}-${c}`, 'ok')
  }
  return map
}

export function ShapePreview({ shape, dragging, used, disabled, onPick }) {
  if (!shape || used) {
    return <div className="shape-slot empty" aria-hidden="true" />
  }

  const { rows, cols } = shapeSize(shape.cells)
  const occupied = new Set(shape.cells.map(([r, c]) => `${r}-${c}`))

  return (
    <button
      type="button"
      className={[
        'shape-slot',
        dragging ? 'dragging' : '',
        disabled ? 'disabled' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onPointerDown={disabled ? undefined : onPick}
      disabled={disabled}
      aria-label="Pick shape"
    >
      <div
        className="shape-grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, var(--preview-cell))`,
          gridTemplateRows: `repeat(${rows}, var(--preview-cell))`,
          opacity: dragging ? 0.25 : 1,
        }}
      >
        {Array.from({ length: rows * cols }, (_, i) => {
          const r = Math.floor(i / cols)
          const c = i % cols
          const on = occupied.has(`${r}-${c}`)
          return (
            <span
              key={i}
              className={on ? 'shape-cell on' : 'shape-cell'}
              style={on ? { background: shape.color } : undefined}
            />
          )
        })}
      </div>
    </button>
  )
}

/** How high the piece floats above the pointer. Touch needs more lift. */
export function getGhostLift(cell, isTouch) {
  if (isTouch) return Math.max(cell * 3.4, 120)
  return cell * 0.45
}

/** Floating piece that follows the pointer at real board cell size. */
export function DragGhost({ shape, x, y, cell, gap, valid, isTouch }) {
  const { rows, cols } = shapeSize(shape.cells)
  const occupied = new Set(shape.cells.map(([r, c]) => `${r}-${c}`))
  const width = cols * cell + (cols - 1) * gap
  const height = rows * cell + (rows - 1) * gap
  const lift = getGhostLift(cell, isTouch)

  return (
    <div
      className={[
        'drag-ghost',
        isTouch ? 'touch' : '',
        valid === false ? 'invalid' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        left: x - width / 2,
        top: y - height - lift,
        width,
        height,
        gridTemplateColumns: `repeat(${cols}, ${cell}px)`,
        gridTemplateRows: `repeat(${rows}, ${cell}px)`,
        gap: `${gap}px`,
      }}
    >
      {Array.from({ length: rows * cols }, (_, i) => {
        const r = Math.floor(i / cols)
        const c = i % cols
        const on = occupied.has(`${r}-${c}`)
        return (
          <span
            key={i}
            className={on ? 'ghost-cell on' : 'ghost-cell'}
            style={on ? { background: shape.color } : undefined}
          />
        )
      })}
    </div>
  )
}

/**
 * Map pointer position of the floating ghost to a board top-left cell.
 * Ghost is centered horizontally on the pointer and sits above it.
 */
export function cellFromPointer(
  boardEl,
  metrics,
  shape,
  clientX,
  clientY,
  isTouch = false,
) {
  if (!boardEl) return null

  const { cell, gap, pad } = metrics
  const { rows, cols } = shapeSize(shape.cells)
  const width = cols * cell + (cols - 1) * gap
  const height = rows * cell + (rows - 1) * gap
  const lift = getGhostLift(cell, isTouch)

  const ghostLeft = clientX - width / 2
  const ghostTop = clientY - height - lift

  const rect = boardEl.getBoundingClientRect()
  const gridLeft = rect.left + pad
  const gridTop = rect.top + pad
  const step = cell + gap

  const col = Math.round((ghostLeft - gridLeft) / step)
  const row = Math.round((ghostTop - gridTop) / step)

  if (row < -rows || col < -cols || row >= BOARD_SIZE || col >= BOARD_SIZE) {
    return null
  }

  return { row, col }
}
