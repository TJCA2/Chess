# Chess Game — Task Checklist

---

## Core board/state

- [x] 8x8 board representation
- [x] Piece type + color tracking
- [x] Current turn tracking
- [x] Selected piece tracking
- [x] Move history
- [x] Captured pieces
- [x] Game status: active, check, checkmate, stalemate, draw

---

## Piece movement rules

- [x] Pawn movement
- [ ] Knight movement *(board-wrap bug: no column-boundary check on offset math, e.g. knight on h-file can land on a-file)*
- [x] Bishop movement
- [x] Rook movement
- [x] Queen movement
- [x] King movement *(one-square rule only — moving into check not yet blocked)*

---

## Pawn-specific logic

- [x] One-square forward move
- [x] Two-square first move
- [x] Diagonal captures
- [x] Blocked forward movement check
- [x] En passant
- [x] Promotion

---

## Special moves

- [x] Castling kingside
- [x] Castling queenside
- [x] Castling restrictions:
  - [x] King has not moved
  - [x] Rook has not moved
  - [x] Squares between are empty
  - [x] King not currently in check
  - [x] King does not pass through check
  - [x] King does not end in check

---

## Move validation

- [x] Only allow moving your own piece
- [x] Only allow moves on your turn
- [x] Reject illegal movement patterns
- [x] Reject moves blocked by pieces where applicable
- [x] Allow captures only on enemy pieces
- [x] Reject moves that leave your king in check
- [x] Generate legal moves, not just pseudo-legal moves

---

## Check/checkmate logic

- [x] Detect if king is in check
- [x] Detect all attacking squares
- [x] Determine whether player has any legal moves
- [x] If in check and no legal moves = checkmate
- [x] If not in check and no legal moves = stalemate

---

## Draw logic

- [x] Stalemate
- [x] Insufficient material
- [x] Threefold repetition
- [x] Fifty-move rule
- [ ] Agreed draw (button)

---

## Promotion logic

- [x] Detect pawn reaching last rank
- [x] Allow choice of queen, rook, bishop, or knight
- [x] Replace pawn correctly

---

## Turn/game flow

- [x] Alternate turns correctly
- [x] Prevent moves after game end
- [x] Update state after every move
- [x] Store previous board states (required for repetition logic)

---

## Attack/defense logic

- [x] Determine whether a square is attacked
- [x] Determine pinned pieces
- [x] Handle discovered checks
- [x] Handle double check

---

## User interaction logic

- [x] Click to select piece
- [x] Show legal moves for selected piece
- [x] Move piece on valid square *(drag-and-drop and click)*
- [x] Reject invalid move
- [x] Deselect/reset selection properly
