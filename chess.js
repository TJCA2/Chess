const board = document.querySelector("#board"); // # because its ID
const display = document.querySelector("#display");
const player = document.querySelector("player");
const width = 8;
//Starting position of the board
const start = [
    rook, knight, bishop, queen, king, bishop, knight, rook,
    pawn, pawn, pawn, pawn, pawn, pawn, pawn, pawn,
    '', '', '', '', '', '', '', '',
    '', '', '', '', '', '', '', '',
    '', '', '', '', '', '', '', '',
    '', '', '', '', '', '', '', '',
    '', '', '', '', '', '', '', '',  
    pawn, pawn, pawn, pawn, pawn, pawn, pawn, pawn,
    rook, knight, bishop, queen, king, bishop, knight, rook,
]

function startGame() {
    start.forEach((piece) => {
        const square = document.createElement('div');
        square.classList.add('square');
        square.classList.add('dark')
        board.append(square);
    });
}
startGame();