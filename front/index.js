const BG_COLOR = '#231f20';
const SNAKE_COLOR = '#c2c2c2';
const FOOD_COLOR = '#e66916';
const GRID_SIZE = 100;

let SIZE;
const socket = io('https://multiplayer-snake1.herokuapp.com/');
// const socket = io('http://localhost:5000/');

socket.on('init', handleSocketInit);
socket.on('gameState', handleGameState);
socket.on('gameOver', handleGameOver);
socket.on('gameCode', handleGameCode);
socket.on('unknwonGame', handleUnknownGame);
socket.on('tooManyPlayers', handleTooManyPlayers);
socket.on('updateLobbies', updateLobbies);

const initialScreen = document.getElementById('initialScreen');
const gameScreen = document.getElementById('gameScreen');
const joinGameBtn = document.getElementById('joinGameBtn');
const newGameBtn = document.getElementById('newGameBtn');
const codeInput = document.getElementById('codeInput');
const gameCodeDisplay = document.getElementById('gameCodeDisplay');
const activeLobbies = document.getElementById('activeLobbies');

newGameBtn.addEventListener('click', startNewGame);
joinGameBtn.addEventListener('click', joinExistingGame);


let canvas, ctx;
let playerNumber;
let gameActive = false;

function init(){
    initialScreen.style.display = 'none'
    gameScreen.style.display = 'block'

    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');

    canvas.width = canvas.height = 800;
    SIZE = canvas.width / GRID_SIZE;

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    document.addEventListener('keydown', snakeMovement);

    gameActive = true
}

function snakeMovement(e){

    socket.emit('keydown', e.keyCode)
}

function paintGame(state){
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const food = state.food;
    food.map((food) => {
        ctx.fillStyle = FOOD_COLOR;
        ctx.fillRect(food.x * SIZE, food.y * SIZE, SIZE, SIZE);
    })

    state.players.map((player)=>{
        paintPlayer(player, player.snakeColor)
    })
}

function paintPlayer(player, color){
    const snake = player.snake;

    ctx.fillStyle = color;

    for (let cell of snake){
        ctx.fillRect(cell.x * SIZE, cell.y * SIZE, SIZE, SIZE);
    }
}

function handleSocketInit(number){
    playerNumber = number;
}

function handleGameState(gameState){
    if (!gameActive) return

    gameState = JSON.parse(gameState);
    requestAnimationFrame(() => paintGame(gameState))
}

function handleGameOver(data){
    if (!gameActive) return

    data = JSON.parse(data);
    console.log(data, playerNumber)
    if (data.looser === playerNumber){
        gameActive = false
        socket.emit('disconnectUser')
        reset();
    }

}

function handleUnknownGame(){
    reset();
    alert("Unknown game code")
}

function handleTooManyPlayers(){
    reset();
    alert("game is already going")
    
}

function reset() {
    document.removeEventListener('keydown', snakeMovement);

    playerNumber = null;
    codeInput.value = "";
    gameCodeDisplay.innerText = "";
    initialScreen.style.display = "block";
    gameScreen.style.display = "none"
}

function handleGameCode(gameCode){
    gameCodeDisplay.innerText = gameCode
}

function startNewGame(e){
    e.preventDefault()

    socket.emit('newGame')
    init()
}

function joinGameByLobby(lobbyName){
    socket.emit('joinGame', lobbyName)
    init()
}

function joinExistingGame(e){
    e.preventDefault()
    const code = codeInput.value
    socket.emit('joinGame', code)
    init()
}

function updateLobbies(lobbiesData){
    let result = {};
    let lobbiesField = ''
    for (let [key, value] of Object.entries(lobbiesData)) {
        if (result[value]) result[value].push(key)
        else result[value] = [key]
    }
    Object.keys(result).forEach((key) => {
        lobbiesField +=
        `<li onclick="joinGameByLobby('${key}')">
            <span>${key}</span>
            <span>${result[key].length}</span>
        </li>`
    });
    activeLobbies.innerHTML = lobbiesField
}
