const board = document.querySelector("#board");
const display = document.querySelector("#display");
const player = document.querySelector("#player");
const gameStatusEl = document.querySelector("#game-status");
const capturedBlackEl = document.querySelector("#captured-black");
const capturedWhiteEl = document.querySelector("#captured-white");
const moveHistoryEl = document.querySelector("#move-history");
const width = 8;
let playerTurn = 'white';
player.textContent = 'white';

let moveHistory = [];
let capturedPieces = { white: [], black: [] };
let gameStatus = 'active';

// En passant: DOM element of the square a pawn skipped (set after a two-square pawn move).
// Stored as a DOM element reference so it survives the board-id flip in changePlayer().
let enPassantTargetSquare = null;
let enPassantCapturablePawn = null; // The pawn element that moved two squares

// Promotion: set when a pawn reaches the last rank; cleared after the piece is chosen.
let pendingPromotion = null;

// Castling: track whether the king or rooks have moved from their starting squares.
let kingMoved = { white: false, black: false };
let rookMoved = { white: { kingside: false, queenside: false }, black: { kingside: false, queenside: false } };

// Draw tracking
let halfMoveClock = 0;       // Resets on pawn move or capture; draw at 100 (50 moves each)
let positionHistory = [];    // Board state keys for threefold repetition

// Click-to-select state
let selectedPiece = null;
let selectedSquare = null;
let legalMoveSquares = [];

//Starting position of the board
const start = [
    rook, knight, bishop, queen, king, bishop, knight, rook,
    pawn, pawn, pawn, pawn, pawn, pawn, pawn, pawn,
    '', '', '', '', '', '', '', '',
    '', '', '', '', '', '', '', '',
    '', '', '', '', '', '', '', '',
    '', '', '', '', '', '', '', '',
    pawn, pawn, pawn, pawn, pawn, pawn, pawn, pawn,
    rook, knight, bishop, queen, king, bishop, knight, rook,
]

function startGame() {
    start.forEach((piece, i) => {
        const row = Math.floor((63 - i) / 8) + 1
        const square = document.createElement('div');
        square.classList.add('square');
        square.innerHTML = piece; // Sets piece inside of square
        square.firstChild?.setAttribute('draggable', true) // If a square has a firstChild (Piece) make the piece movable
        square.setAttribute('square-id', i)
        reverseId();

        // Sets color of each square
        if (row % 2 == 0){
            square.classList.add(i % 2 == 0 ? 'light' : 'dark')
        } else {
            square.classList.add(i % 2 == 0 ? 'dark' : 'light')
        }

        if ( i <= 15){ //first  16
            square.firstChild.firstChild.classList.add('black');
        } else if (i >= 48){ //last 16
            square.firstChild.firstChild.classList.add('white');
        }
        board.append(square);
    });
}
startGame();

const allSquares = document.querySelectorAll(" .square")

allSquares.forEach(square => {
    square.addEventListener('dragstart', dragStart)
    square.addEventListener('dragover', dragOver)
    square.addEventListener('drop', dragDrop);
    square.addEventListener('click', handleSquareClick);
})

//Starting position and Piece being moved
let startingPosition;
let draggedPiece;
function dragStart (e) {
    startingPosition = (e.target.parentNode.getAttribute('square-id'));
    draggedPiece = e.target;
}

function dragOver(e) {
    e.preventDefault()
}

function dragDrop(e) {
    e.stopPropagation() // halts capturing phase of event
    if (gameStatus === 'checkmate' || gameStatus === 'stalemate' || gameStatus === 'draw') return;
    if (pendingPromotion) return;
    clearSelection();
    executeMove(e.target);
}

function executeMove(target) {
    const correctTurn = draggedPiece?.firstChild.classList.contains(playerTurn);
    const opponent = playerTurn == "white" ? "black" : "white";
    const occupied = target.classList.contains('piece')
    const captured = target.firstChild?.classList.contains(opponent)
    const valid = checkValid(target)
    const targetId = Number(target.getAttribute('square-id')) || Number(target.parentNode.getAttribute('square-id'));

    if (correctTurn) {
        //Check for Captured and Valid Move
        if (captured && valid) {
            if (isLeavingKingInCheck(target.parentNode, target)) {
                display.textContent = "That move leaves your king in check!";
                setTimeout(() => display.textContent = "", 2000);
                return;
            }
            const capturedId = target.id;
            const fromId = Number(startingPosition);
            const movingPiece = draggedPiece;
            const targetSquare = target.parentNode; // save before target.remove()
            capturedPieces[playerTurn].push(capturedId);
            targetSquare.append(draggedPiece);
            target.remove();
            updateCapturedDisplay(playerTurn);
            updateEnPassant(movingPiece.id, fromId, targetId, movingPiece);
            if (movingPiece.id === 'king') kingMoved[playerTurn] = true;
            if (movingPiece.id === 'rook') updateRookMoved(fromId);
            halfMoveClock = 0;
            if (movingPiece.id === 'pawn' && targetId >= 56) {
                pendingPromotion = { square: targetSquare, color: playerTurn, from: fromId, to: targetId, captured: capturedId };
                showPromotionModal();
                return;
            }
            moveHistory.push({ player: playerTurn, piece: movingPiece.id, from: fromId, to: targetId, captured: capturedId });
            updateMoveHistoryDisplay();
            updateGameStatus();
            changePlayer();
            return;
        }
        if (occupied && !captured) {
            display.textContent = "You cannot capture your own piece!";
            setTimeout(() => display.textContent = "", 3000);
            return
        }
        if (valid) {
            if (isLeavingKingInCheck(target, null)) {
                display.textContent = "That move leaves your king in check!";
                setTimeout(() => display.textContent = "", 2000);
                return;
            }
            const fromId = Number(startingPosition);
            const movingPiece = draggedPiece;
            const isEnPassantMove = movingPiece.id === 'pawn' && target === enPassantTargetSquare;
            target.append(draggedPiece);
            if (isEnPassantMove) {
                capturedPieces[playerTurn].push('pawn');
                enPassantCapturablePawn.remove();
                updateCapturedDisplay(playerTurn);
            }
            updateEnPassant(movingPiece.id, fromId, targetId, movingPiece);
            if (movingPiece.id === 'king') {
                kingMoved[playerTurn] = true;
                const config = getCastlingConfig(targetId, playerTurn);
                if (config) {
                    const rookSquare = getSquareId(config.rookStart);
                    const rookTarget = getSquareId(config.rookEnd);
                    if (rookSquare && rookTarget) rookTarget.append(rookSquare.firstChild);
                    rookMoved[playerTurn][config.side] = true;
                }
            }
            if (movingPiece.id === 'rook') updateRookMoved(fromId);
            halfMoveClock = (movingPiece.id === 'pawn' || isEnPassantMove) ? 0 : halfMoveClock + 1;
            if (movingPiece.id === 'pawn' && targetId >= 56) {
                pendingPromotion = { square: target, color: playerTurn, from: fromId, to: targetId, captured: isEnPassantMove ? 'pawn' : null };
                showPromotionModal();
                return;
            }
            moveHistory.push({ player: playerTurn, piece: movingPiece.id, from: fromId, to: targetId, captured: isEnPassantMove ? 'pawn' : null });
            updateMoveHistoryDisplay();
            updateGameStatus();
            changePlayer();
            return;
        } else {
            display.textContent = "Illegal move, try again."
            setTimeout(() => display.textContent = "", 2000)
        }
    }
}

// Simulate a move and check if it leaves the current player's own king in check.
// targetSquare: the square div to move to. capturedElement: piece div being taken, or null.
function isLeavingKingInCheck(targetSquare, capturedElement) {
    const savedDraggedPiece = draggedPiece;
    const savedStartingPosition = startingPosition;
    // kingCheck() overwrites the global `draggedPiece`, so keep a local reference
    // to the actual piece being moved so the undo puts the right piece back.
    const movingPiece = draggedPiece;
    const fromSquare = movingPiece.parentNode;
    // En passant: if this move captures via en passant, also remove/restore the captured pawn
    const isEnPassant = movingPiece.id === 'pawn' && targetSquare === enPassantTargetSquare && enPassantCapturablePawn;
    const epPawnSquare = isEnPassant ? enPassantCapturablePawn.parentNode : null;

    // Simulate the move in the DOM
    targetSquare.append(movingPiece);
    if (capturedElement) capturedElement.remove();
    if (isEnPassant) enPassantCapturablePawn.remove();

    const inCheck = kingCheck(playerTurn);

    // Undo the simulation using the local reference, not the now-corrupted global
    fromSquare.append(movingPiece);
    if (capturedElement) targetSquare.append(capturedElement);
    if (isEnPassant) epPawnSquare.append(enPassantCapturablePawn);

    draggedPiece = savedDraggedPiece;
    startingPosition = savedStartingPosition;

    return inCheck;
}

function changePlayer(){
    if(playerTurn == 'white'){
        revertId();
        playerTurn = 'black'
    } else {
        reverseId();
        playerTurn = 'white'
    }
    player.textContent = playerTurn;
    recordPosition();
}

function reverseId(){
    const squares = document.querySelectorAll(".square");
    squares.forEach((square, i)=> {
        square.setAttribute('square-id', (width * width) - 1 - i )
    })
}

function revertId(){
    const squares = document.querySelectorAll(".square")
    squares.forEach((square, i)=>{
        square.setAttribute("square-id", i)
    })
}

function checkValid(target){
    const targetId = Number(target.getAttribute('square-id')) ||Number(target.parentNode.getAttribute('square-id'))
    const startId = Number(startingPosition)
    const piece = draggedPiece.id
    const occupied = target.classList.contains('piece')
    const opponent = playerTurn == 'white' ? 'black' : 'white'
    const captured = target.firstChild?.classList.contains(opponent)
    const lastRow = targetId >= 56 || targetId <= 7;

    switch(piece){
        case 'pawn' : {
            // En passant: the target square is the one the opponent's pawn skipped
            const isEnPassantTarget = enPassantTargetSquare &&
                (target === enPassantTargetSquare || target.parentNode === enPassantTargetSquare);
            if (
                targetId == startId + 16 && startId < 16 && !occupied || //First pawn move can go 2 rows
                targetId == startId + 8 && !occupied || // up 1
                (targetId == startId + 7 || targetId == startId + 9) && (captured || isEnPassantTarget) //Pawn taking a piece or en passant
            ){
                return true
            }
            break;
        }
        case 'knight' :
            if (
                targetId == startId + 15 || targetId == startId + 17 || // Up 2 rows and L/R 1
                targetId == startId + 6 || targetId == startId + 10 || // Up 1 row and L/R 2
                targetId == startId - 17 || targetId == startId - 15 || // Down 2 rows and L/R 2
                targetId == startId - 6 || targetId == startId - 10 // Down 1 row and L/R two
            ){
                return true
            }
            break;
        case 'bishop' :
            const diagnol = diagnolCheck(target);
            return diagnol;

        case 'rook' :
            const straight = straightCheck(target);
            return straight

        case 'queen' :
            const straightDiagnol = straightCheck(target) != diagnolCheck(target) ? true : false
            return straightDiagnol;

        case 'king' : {
            const onlyOne = moveOne(target)
            if (onlyOne) return true
            return isCastlingValid(targetId)
        }
    }

}

function getSquareId(id) {
  return document.querySelector(`[square-id="${id}"]`);
}

function diagnolCheck(target){
    const targetId = Number(target.getAttribute('square-id')) || Number(target.parentNode.getAttribute('square-id'))
    const startId = Number(startingPosition)
    const startRow = Math.floor(startId / 8);
    const startColumn = startId % 8
    const targetRow = Math.floor(targetId / 8);
    const targetColumn = targetId % 8;

    const rowDiff = targetRow - startRow;
    const columnDiff = targetColumn - startColumn

    if(Math.abs(rowDiff) != Math.abs(columnDiff)) return false; // Must move diagnol

    const moveRow = rowDiff < 0 ? -1 : 1;
    const moveCol = columnDiff  < 0 ? -1 : 1;
    let c = startColumn + moveCol;
    let r = startRow + moveRow;

    while(r !== targetRow && c !== targetColumn){
        const travel = 8 * r + c;
        const travelId = getSquareId(travel)
        const occupied = travelId?.firstChild?.classList.contains('piece') || travelId?.classList.contains('piece'); //imnportant
        if(occupied) return false;
        r += moveRow;
        c += moveCol;
    }

    return true;
}

function straightCheck(target){
    const startId = Number(startingPosition);
    const targetId = Number(target.getAttribute('square-id')) || Number(target.parentNode.getAttribute('square-id'))
    const startRow = Math.floor(startId / 8)
    const startCol = startId % 8
    const targetRow = Math.floor(targetId / 8)
    const targetCol = targetId % 8
    const moveRow = targetRow - startRow
    const moveCol = targetCol - startCol


    if (moveCol != 0 && moveRow != 0) return false // Can only move straight in one direction

    if (Math.abs(moveRow) > 0){
        const stepRow = moveRow < 0 ? -1 : 1;
        let r = startRow + stepRow
        while (r !== targetRow){
            const travel = 8 * r + startCol
            const travelId = getSquareId(travel)
            const occupied = travelId?.classList.contains('piece') || travelId?.firstChild?.classList.contains('piece')
            if(occupied) return false
            r += stepRow
        }
        return true
    } else if (Math.abs(moveCol) > 0 ) {
        const stepCol = moveCol < 0 ? -1 : 1
        let c = startCol + stepCol
        while (c != targetCol){
            const travel = 8 * startRow + c
            const travelId = getSquareId(travel);
            const occupied = travelId?.firstChild?.classList.contains('piece') || travelId?.classList.contains('piece')
            if(occupied) return false
            c += stepCol
    }

    return true
}
return false
}

function moveOne(target) {
    const targetId = Number(target.getAttribute('square-id')) || Number(target.parentNode.getAttribute('square-id'))
    const startId = Number(startingPosition)
    const startRow = Math.floor(startId / 8)
    const startCol = startId % 8
    const targetRow = Math.floor(targetId / 8)
    const targetCol = targetId % 8
    const moveRow = targetRow - startRow
    const moveCol = targetCol - startCol

    if(Math.abs(moveRow) >= 2 || Math.abs(moveCol) >= 2){
        return false
    }
    return true
}

// Returns true if `player`'s king is under attack from an opponent piece.
// Must be called with the board in the current player's coordinate system.
function kingCheck(player){
    const hasKing = document.querySelector(`#king .${player}`)
    if(!hasKing) return false;
    const kingSquare = hasKing.parentNode // SVG -> piece div (which has no square-id, but its parentNode is the square)

    for (const square of document.querySelectorAll(`.square`)){
        const piece = square.firstChild; //Gets piece from square if there is one
        if(!piece) continue

        const opponentPiece = "white" === player ? piece.firstChild.classList.contains("black") : piece.firstChild.classList.contains("white")
        if(!opponentPiece) continue //Ensures piece is your opponents not your own

        draggedPiece = piece
        startingPosition = square.getAttribute("square-id")
        if(checkValid(kingSquare)) {
            return true
        }
    }
    return false;
}

// Returns true if `player` has at least one legal move (i.e., a move that doesn't
// leave their own king in check). Must be called with the board in `player`'s
// coordinate system so that checkValid() works correctly for their pieces.
function hasLegalMoves(player) {
    const savedDraggedPiece = draggedPiece;
    const savedStartingPosition = startingPosition;
    let result = false;

    outer:
    for (const fromSquare of document.querySelectorAll('.square')) {
        const piece = fromSquare.firstChild;
        if (!piece || !piece.firstChild?.classList.contains(player)) continue;

        for (const toSquare of document.querySelectorAll('.square')) {
            if (fromSquare === toSquare) continue;

            // Skip squares occupied by own piece
            const targetPiece = toSquare.firstChild;
            if (targetPiece && targetPiece.firstChild?.classList.contains(player)) continue;

            // Set globals for checkValid
            draggedPiece = piece;
            startingPosition = fromSquare.getAttribute('square-id');

            // Pass piece element if occupied (so checkValid sees it as occupied/captured),
            // otherwise pass the square element.
            const targetEl = toSquare.firstChild || toSquare;

            if (checkValid(targetEl)) {
                // Simulate the move (also handle en passant removal)
                const capturedPiece = toSquare.firstChild;
                const isEnPassant = piece.id === 'pawn' && toSquare === enPassantTargetSquare && enPassantCapturablePawn;
                const epPawnSquare = isEnPassant ? enPassantCapturablePawn.parentNode : null;
                toSquare.append(piece);
                if (capturedPiece) capturedPiece.remove();
                if (isEnPassant) enPassantCapturablePawn.remove();

                const stillInCheck = kingCheck(player);

                // Undo the simulation
                fromSquare.append(piece);
                if (capturedPiece) toSquare.append(capturedPiece);
                if (isEnPassant) epPawnSquare.append(enPassantCapturablePawn);

                if (!stillInCheck) {
                    result = true;
                    break outer;
                }
            }
        }
    }

    draggedPiece = savedDraggedPiece;
    startingPosition = savedStartingPosition;
    return result;
}

// Called after a move is executed but before changePlayer().
// Checks if the opponent (next player) is in check, checkmate, or stalemate.
function updateGameStatus() {
    const opponent = playerTurn === 'white' ? 'black' : 'white';
    const savedDraggedPiece = draggedPiece;
    const savedStartingPosition = startingPosition;

    // Check detection: use current coordinate system (correct for the player who just moved).
    const inCheck = kingCheck(opponent);
    draggedPiece = savedDraggedPiece;
    startingPosition = savedStartingPosition;

    // To correctly validate the opponent's legal moves, we need their coordinate system.
    // Temporarily flip to opponent's perspective.
    if (playerTurn === 'white') {
        revertId();
    } else {
        reverseId();
    }

    const hasMoves = hasLegalMoves(opponent);

    // Restore original coordinate system.
    if (playerTurn === 'white') {
        reverseId();
    } else {
        revertId();
    }

    draggedPiece = savedDraggedPiece;
    startingPosition = savedStartingPosition;

    if (inCheck && !hasMoves) {
        gameStatus = 'checkmate';
    } else if (!inCheck && !hasMoves) {
        gameStatus = 'stalemate';
    } else if (inCheck) {
        gameStatus = 'check';
    } else {
        gameStatus = 'active';
    }

    // Check automatic draw conditions (only when game would otherwise continue)
    if (gameStatus === 'active' || gameStatus === 'check') {
        if (checkInsufficientMaterial()) {
            gameStatus = 'draw';
            gameStatusEl.textContent = 'Draw — insufficient material.';
            return;
        }
        if (halfMoveClock >= 100) {
            gameStatus = 'draw';
            gameStatusEl.textContent = 'Draw — fifty-move rule.';
            return;
        }
    }

    updateStatusDisplay();
}

function updateStatusDisplay() {
    const opponent = playerTurn === 'white' ? 'black' : 'white';
    if (gameStatus === 'checkmate') {
        gameStatusEl.textContent = `Checkmate! ${playerTurn} wins.`;
    } else if (gameStatus === 'stalemate') {
        gameStatusEl.textContent = 'Stalemate — draw.';
    } else if (gameStatus === 'draw') {
        // Message already set by the specific draw detection (material, 50-move, repetition, agreed)
    } else if (gameStatus === 'check') {
        gameStatusEl.textContent = `Check! ${opponent} is in check.`;
    } else {
        gameStatusEl.textContent = '';
    }
}

const pieceAbbr = { king: 'K', queen: 'Q', rook: 'R', bishop: 'B', knight: 'N', pawn: '' };

function updateCapturedDisplay(capturingPlayer) {
    const el = capturingPlayer === 'white' ? capturedWhiteEl : capturedBlackEl;
    const lastCaptured = capturedPieces[capturingPlayer][capturedPieces[capturingPlayer].length - 1];
    const span = document.createElement('span');
    span.classList.add('captured-piece');
    span.textContent = pieceAbbr[lastCaptured] ?? lastCaptured;
    el.append(span);
}

function updateMoveHistoryDisplay() {
    const move = moveHistory[moveHistory.length - 1];
    const li = document.createElement('li');
    const abbr = pieceAbbr[move.piece] || move.piece;
    const capturedText = move.captured ? `x${pieceAbbr[move.captured] || move.captured}` : '';
    li.textContent = `${move.player}: ${abbr || move.piece}${move.from}–${move.to}${capturedText ? ' ' + capturedText : ''}`;
    moveHistoryEl.append(li);
    moveHistoryEl.scrollTop = moveHistoryEl.scrollHeight;
}

// After each valid move, update the en passant state.
// A two-square pawn advance sets the en passant target; any other move clears it.
function updateEnPassant(pieceId, fromId, toId, movedPiece) {
    if (pieceId === 'pawn' && toId === fromId + 16) {
        enPassantTargetSquare = getSquareId(fromId + 8);
        enPassantCapturablePawn = movedPiece;
    } else {
        enPassantTargetSquare = null;
        enPassantCapturablePawn = null;
    }
}

// Create a new piece element of the given type and color (used for promotion).
function createPiece(pieceType, color) {
    const pieces = { queen, rook, bishop, knight };
    const temp = document.createElement('div');
    temp.innerHTML = pieces[pieceType];
    const pieceEl = temp.firstChild;
    pieceEl.setAttribute('draggable', true);
    pieceEl.firstChild.classList.add(color);
    return pieceEl;
}

function showPromotionModal() {
    document.getElementById('promotion-modal').removeAttribute('hidden');
}

function hidePromotionModal() {
    document.getElementById('promotion-modal').setAttribute('hidden', '');
}

// Called when the player clicks a promotion choice button.
function completePromotion(pieceType) {
    const { square, color, from, to, captured } = pendingPromotion;
    // Replace the pawn with the chosen piece
    square.firstChild.remove();
    const newPiece = createPiece(pieceType, color);
    square.append(newPiece);
    moveHistory.push({ player: color, piece: pieceType, from, to, captured, promotion: true });
    updateMoveHistoryDisplay();
    if (captured) updateCapturedDisplay(color);
    updateGameStatus();
    changePlayer();
    pendingPromotion = null;
    hidePromotionModal();
}

// --- Draw detection ---

function checkInsufficientMaterial() {
    const pieces = { white: [], black: [] };
    document.querySelectorAll('.square').forEach(sq => {
        const piece = sq.firstChild;
        if (!piece) return;
        const color = piece.firstChild.classList.contains('white') ? 'white' : 'black';
        pieces[color].push({ id: piece.id, sq });
    });
    const w = pieces.white, b = pieces.black;
    const isMinor = p => p.id === 'bishop' || p.id === 'knight';
    // K vs K
    if (w.length === 1 && b.length === 1) return true;
    // K vs K+minor
    if (w.length === 1 && b.length === 2 && b.some(isMinor)) return true;
    if (b.length === 1 && w.length === 2 && w.some(isMinor)) return true;
    // K+B vs K+B same square color
    if (w.length === 2 && b.length === 2) {
        const wb = w.find(p => p.id === 'bishop'), bb = b.find(p => p.id === 'bishop');
        if (wb && bb) {
            const wColor = wb.sq.classList.contains('light') ? 'light' : 'dark';
            const bColor = bb.sq.classList.contains('light') ? 'light' : 'dark';
            if (wColor === bColor) return true;
        }
    }
    return false;
}

// Serialize board state for threefold repetition detection.
// Uses DOM order (unaffected by ID flips), player turn, en passant, and castling rights.
function getPositionKey() {
    const allSqs = Array.from(document.querySelectorAll('.square'));
    let key = allSqs.map(sq => {
        const p = sq.firstChild;
        if (!p) return '--';
        return p.id[0] + (p.firstChild.classList.contains('white') ? 'w' : 'b');
    }).join('');
    key += playerTurn[0];
    key += enPassantTargetSquare ? 'e' + allSqs.indexOf(enPassantTargetSquare) : 'e-';
    key += `${kingMoved.white?0:1}${kingMoved.black?0:1}`;
    key += `${rookMoved.white.kingside?0:1}${rookMoved.white.queenside?0:1}`;
    key += `${rookMoved.black.kingside?0:1}${rookMoved.black.queenside?0:1}`;
    return key;
}

// Called from changePlayer() — records the new position and detects threefold repetition.
function recordPosition() {
    const key = getPositionKey();
    positionHistory.push(key);
    const count = positionHistory.filter(k => k === key).length;
    if (count >= 3) {
        gameStatus = 'draw';
        gameStatusEl.textContent = 'Draw — threefold repetition.';
    }
}

// --- Castling ---

// Returns the castling config if targetId is a valid castling destination for `player`,
// null otherwise. IDs are fixed per coordinate system (white uses reversed IDs, black uses normal).
function getCastlingConfig(targetId, player) {
    const configs = {
        white: {
            1: { side: 'kingside',  rookStart: 0, rookEnd: 2, clearSquares: [1, 2],    safeSquares: [2, 1]    },
            5: { side: 'queenside', rookStart: 7, rookEnd: 4, clearSquares: [4, 5, 6], safeSquares: [4, 5]    },
        },
        black: {
            6: { side: 'kingside',  rookStart: 7, rookEnd: 5, clearSquares: [5, 6],    safeSquares: [5, 6]    },
            2: { side: 'queenside', rookStart: 0, rookEnd: 3, clearSquares: [1, 2, 3], safeSquares: [3, 2]    },
        },
    };
    return configs[player]?.[targetId] ?? null;
}

// Returns true if any opponent piece can reach the given squareId.
// Avoids calling isCastlingValid for kings to prevent infinite recursion.
function isSquareAttacked(squareId, player) {
    const savedDraggedPiece = draggedPiece;
    const savedStartingPosition = startingPosition;
    const opponent = player === 'white' ? 'black' : 'white';
    const targetSquare = getSquareId(squareId);
    let attacked = false;

    for (const sq of document.querySelectorAll('.square')) {
        const piece = sq.firstChild;
        if (!piece || !piece.firstChild.classList.contains(opponent)) continue;
        draggedPiece = piece;
        startingPosition = sq.getAttribute('square-id');
        const fromId = Number(startingPosition);
        if (piece.id === 'pawn') {
            if (squareId === fromId + 7 || squareId === fromId + 9) { attacked = true; break; }
        } else if (piece.id === 'king') {
            if (targetSquare && moveOne(targetSquare)) { attacked = true; break; }
        } else {
            if (targetSquare && checkValid(targetSquare)) { attacked = true; break; }
        }
    }

    draggedPiece = savedDraggedPiece;
    startingPosition = savedStartingPosition;
    return attacked;
}

// Returns true if the king move to targetId is a legal castling move.
function isCastlingValid(targetId) {
    // Derive player from the dragged king's color so this works inside hasLegalMoves too.
    const player = draggedPiece.firstChild.classList.contains('white') ? 'white' : 'black';
    const savedDraggedPiece = draggedPiece;
    const savedStartingPosition = startingPosition;
    const kingStartId = Number(startingPosition);
    let valid = false;

    do {
        const config = getCastlingConfig(targetId, player);
        if (!config) break;
        if (kingMoved[player]) break;
        if (rookMoved[player][config.side]) break;

        // Rook must still be on its starting square and be the right color
        const rook = getSquareId(config.rookStart)?.firstChild;
        if (!rook || rook.id !== 'rook' || !rook.firstChild.classList.contains(player)) break;

        // All squares between king and rook must be empty
        if (config.clearSquares.some(id => getSquareId(id)?.firstChild)) break;

        // King must not currently be in check
        if (isSquareAttacked(kingStartId, player)) break;

        // King must not pass through or land on an attacked square
        if (config.safeSquares.some(id => isSquareAttacked(id, player))) break;

        valid = true;
    } while (false);

    draggedPiece = savedDraggedPiece;
    startingPosition = savedStartingPosition;
    return valid;
}

// Mark a rook at fromId as having moved (uses playerTurn, which is correct in dragDrop).
function updateRookMoved(fromId) {
    if (playerTurn === 'white') {
        if (fromId === 0) rookMoved.white.kingside = true;
        else if (fromId === 7) rookMoved.white.queenside = true;
    } else {
        if (fromId === 7) rookMoved.black.kingside = true;
        else if (fromId === 0) rookMoved.black.queenside = true;
    }
}

// --- Click-to-select ---

function handleSquareClick(e) {
    if (gameStatus === 'checkmate' || gameStatus === 'stalemate' || gameStatus === 'draw') return;
    if (pendingPromotion) return;

    const square = e.currentTarget;
    const piece = square.firstChild;
    const isOwnPiece = piece?.firstChild?.classList.contains(playerTurn);

    // If clicking a highlighted legal target square, execute the move
    const legalTarget = legalMoveSquares.find(ls => ls.square === square);
    if (legalTarget) {
        draggedPiece = selectedPiece;
        startingPosition = selectedSquare.getAttribute('square-id');
        const targetEl = square.firstChild || square;
        clearSelection();
        executeMove(targetEl);
        return;
    }

    // If clicking own piece, select it (switching if another was already selected)
    if (isOwnPiece) {
        clearSelection();
        selectPiece(piece, square);
        return;
    }

    // Clicking anywhere else clears the selection
    clearSelection();
}

function selectPiece(piece, square) {
    selectedPiece = piece;
    selectedSquare = square;
    square.classList.add('selected');
    draggedPiece = piece;
    startingPosition = square.getAttribute('square-id');
    legalMoveSquares = getLegalMovesForPiece(piece, square);
    legalMoveSquares.forEach(({ square: sq, isCapture }) => {
        sq.classList.add(isCapture ? 'legal-capture' : 'legal-move');
    });
}

function clearSelection() {
    if (selectedSquare) selectedSquare.classList.remove('selected');
    legalMoveSquares.forEach(({ square }) => {
        square.classList.remove('legal-move', 'legal-capture');
    });
    selectedPiece = null;
    selectedSquare = null;
    legalMoveSquares = [];
}

// Returns an array of { square, isCapture } for every legal target of the given piece.
function getLegalMovesForPiece(piece, fromSquare) {
    const savedDraggedPiece = draggedPiece;
    const savedStartingPosition = startingPosition;
    const player = piece.firstChild.classList.contains('white') ? 'white' : 'black';
    const legal = [];

    for (const toSquare of document.querySelectorAll('.square')) {
        if (fromSquare === toSquare) continue;

        const targetPiece = toSquare.firstChild;
        // Skip squares occupied by own pieces
        if (targetPiece?.firstChild?.classList.contains(player)) continue;

        draggedPiece = piece;
        startingPosition = fromSquare.getAttribute('square-id');

        // Pass piece element if occupied (matches checkValid expectations), else the square
        const targetEl = targetPiece || toSquare;

        if (checkValid(targetEl)) {
            const isCapture = !!targetPiece || (piece.id === 'pawn' && toSquare === enPassantTargetSquare);
            if (!isLeavingKingInCheck(toSquare, targetPiece || null)) {
                legal.push({ square: toSquare, isCapture });
            }
        }
    }

    draggedPiece = savedDraggedPiece;
    startingPosition = savedStartingPosition;
    return legal;
}

function hasKing(player){
    const kingExists = document.querySelector(`#king .${player}`)
    return kingExists
}
