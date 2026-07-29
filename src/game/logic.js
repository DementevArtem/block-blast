export const BOARD_SIZE = 8

export function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  )
}

export function canPlace(board, shape, row, col) {
  for (const [dr, dc] of shape.cells) {
    const r = row + dr
    const c = col + dc
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return false
    if (board[r][c] !== null) return false
  }
  return true
}

export function placeShape(board, shape, row, col) {
  if (!canPlace(board, shape, row, col)) return null

  const next = board.map((line) => line.slice())
  for (const [dr, dc] of shape.cells) {
    next[row + dr][col + dc] = shape.color
  }
  return next
}

/** Find full rows/columns without mutating the board. */
export function findClearTargets(board) {
  const fullRows = []
  const fullCols = []

  for (let r = 0; r < BOARD_SIZE; r++) {
    if (board[r].every((cell) => cell !== null)) fullRows.push(r)
  }
  for (let c = 0; c < BOARD_SIZE; c++) {
    if (board.every((row) => row[c] !== null)) fullCols.push(c)
  }

  if (fullRows.length === 0 && fullCols.length === 0) {
    return { positions: [], linesCleared: 0, fullRows, fullCols }
  }

  const seen = new Set()
  const positions = []

  const add = (r, c) => {
    const key = `${r}-${c}`
    if (seen.has(key) || board[r][c] === null) return
    seen.add(key)
    positions.push({ r, c, color: board[r][c] })
  }

  for (const r of fullRows) {
    for (let c = 0; c < BOARD_SIZE; c++) add(r, c)
  }
  for (const c of fullCols) {
    for (let r = 0; r < BOARD_SIZE; r++) add(r, c)
  }

  return {
    positions,
    linesCleared: fullRows.length + fullCols.length,
    fullRows,
    fullCols,
  }
}

/** Keys that would clear if this shape is placed at row/col. */
export function getWouldClearKeys(board, shape, row, col) {
  if (!canPlace(board, shape, row, col)) return null

  const next = placeShape(board, shape, row, col)
  const { positions } = findClearTargets(next)
  if (positions.length === 0) return null

  return new Set(positions.map(({ r, c }) => `${r}-${c}`))
}

/** Clear full rows and columns. Returns { board, clearedCells, linesCleared, positions }. */
export function clearLines(board) {
  const { positions, linesCleared } = findClearTargets(board)

  if (positions.length === 0) {
    return { board, clearedCells: 0, linesCleared: 0, positions: [] }
  }

  const next = board.map((line) => line.slice())
  for (const { r, c } of positions) {
    next[r][c] = null
  }

  return {
    board: next,
    clearedCells: positions.length,
    linesCleared,
    positions,
  }
}

export function scoreForClear(
  linesCleared,
  clearedCells,
  placedCells,
  streak = 1,
) {
  if (linesCleared === 0) return placedCells
  // More lines in one move
  const lineMult = 1 + (linesCleared - 1) * 0.5
  // Consecutive clear turns: x1, x1.5, x2, x2.5...
  const streakMult = 1 + Math.max(0, streak - 1) * 0.5
  return Math.round(placedCells + clearedCells * 10 * lineMult * streakMult)
}

export function canPlaceAnywhere(board, shape) {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (canPlace(board, shape, r, c)) return true
    }
  }
  return false
}

export function isGameOver(board, shapes) {
  const remaining = shapes.filter(Boolean)
  if (remaining.length === 0) return false
  return remaining.every((shape) => !canPlaceAnywhere(board, shape))
}

export function previewCells(shape, row, col) {
  return shape.cells.map(([dr, dc]) => [row + dr, col + dc])
}
