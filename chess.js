const board = document.querySelector("#board"); // # because its ID
const display = document.querySelector("#display");
const player = document.querySelector("#player");
const width = 8;
let playerTurn = 'white';
player.textContent = 'white'

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
    e.stopPropagation() // halts captruing phase of event
    const correctTurn = draggedPiece.firstChild.classList.contains(playerTurn);
    const opponent = playerTurn == "white" ? "black" : "white"; //sets opponents color
    const occupied = e.target.classList.contains('piece')
    const captured = e.target.firstChild?.classList.contains(opponent) //Check if piece is your opponents
    const valid = checkValid(e.target)
    console.log(checkValid(e.target)) // _____________________________________________
    //e.targetParentNode.append(draggedPiece)
    //e.target.append(draggedPiece);
    //e.target.remove()

    if (correctTurn) {
        //Check for Captured and Valid Move
        if (captured && valid) {
            e.target.parentNode.append(draggedPiece);
            e.target.remove();
            changePlayer()
            return

        } 
        if (occupied && !captured) { //Cannot capture your own piece
            display.textContent = "You cannot capture your own piece!";
            setTimeout(() => display.textContent = "", 3000);
            return
        }
        if (valid) {
            e.target.append(draggedPiece);
            changePlayer();
            return
        } else {
            display.textContent = "Illegal move, try again."
            setTimeout(() => display.textContent = "", 2000)
        }
    }
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
}

function reverseId(){
    const allSquares = document.querySelectorAll(".square");
    allSquares.forEach((square, i)=> {
        square.setAttribute('square-id', (width * width) - 1 - i )
    })
}

function revertId(){
    const alllSquares = document.querySelectorAll(".square")
    allSquares.forEach((square, i)=>{
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
        case 'pawn' :
            if (
                targetId == startId + 16 && startId < 16 && !occupied || //First pawn move can go 2 rows
                targetId == startId + 8 && !occupied || // up 1 
                (targetId == startId + 7 || targetId == startId +9) && captured //Pawn taking a piece

            ){
                return true
            }
            break;
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
        
        case 'king' :

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
        console.log("travel", travelId);
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
    console.log(startRow)
    console.log(targetRow)


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




