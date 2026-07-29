/** Each shape is a list of [row, col] offsets from the top-left. */
export const SHAPES = [
  // Single
  { id: 'dot', cells: [[0, 0]] },
  // Lines
  { id: 'h2', cells: [[0, 0], [0, 1]] },
  { id: 'h3', cells: [[0, 0], [0, 1], [0, 2]] },
  { id: 'h4', cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
  { id: 'h5', cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
  { id: 'v2', cells: [[0, 0], [1, 0]] },
  { id: 'v3', cells: [[0, 0], [1, 0], [2, 0]] },
  { id: 'v4', cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
  { id: 'v5', cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]] },
  // Squares
  { id: 'sq2', cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
  {
    id: 'sq3',
    cells: [
      [0, 0], [0, 1], [0, 2],
      [1, 0], [1, 1], [1, 2],
      [2, 0], [2, 1], [2, 2],
    ],
  },
  // L shapes
  { id: 'L', cells: [[0, 0], [1, 0], [2, 0], [2, 1]] },
  { id: 'Lr', cells: [[0, 1], [1, 1], [2, 0], [2, 1]] },
  { id: 'Lt', cells: [[0, 0], [0, 1], [1, 0], [2, 0]] },
  { id: 'Lb', cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  // Small L
  { id: 'l', cells: [[0, 0], [1, 0], [1, 1]] },
  { id: 'lr', cells: [[0, 1], [1, 0], [1, 1]] },
  // T
  { id: 'T', cells: [[0, 0], [0, 1], [0, 2], [1, 1]] },
  { id: 'Tu', cells: [[0, 1], [1, 0], [1, 1], [1, 2]] },
  // Plus / corner
  { id: 'corner', cells: [[0, 0], [0, 1], [1, 0]] },
  { id: 'zig', cells: [[0, 0], [0, 1], [1, 1], [1, 2]] },
  { id: 'zag', cells: [[0, 1], [0, 2], [1, 0], [1, 1]] },
]

export const COLORS = [
  '#ef4444', // red
  '#f59e0b', // amber
  '#22c55e', // green
  '#3b82f6', // blue
  '#ec4899', // pink
  '#14b8a6', // teal
  '#a855f7', // violet
  '#f97316', // orange
]

export function shapeSize(cells) {
  let maxR = 0
  let maxC = 0
  for (const [r, c] of cells) {
    maxR = Math.max(maxR, r)
    maxC = Math.max(maxC, c)
  }
  return { rows: maxR + 1, cols: maxC + 1 }
}

export function randomShape() {
  const base = SHAPES[Math.floor(Math.random() * SHAPES.length)]
  const color = COLORS[Math.floor(Math.random() * COLORS.length)]
  return {
    id: `${base.id}-${Math.random().toString(36).slice(2, 8)}`,
    cells: base.cells,
    color,
  }
}

export function dealShapes(count = 3) {
  return Array.from({ length: count }, () => randomShape())
}
