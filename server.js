var express = require('express');
var app = express();
const path = require('path');

var http = require('http');
var server = http.createServer(app);
app.use(express.static(path.join(__dirname, 'front')));
const io = require("socket.io")(server, {
    cors: {
      origin: "https://multiplayer-snake1.herokuapp.com",
      methods: ["GET", "POST"],
      credentials: true,
    }
});

let state = {}
let clientRooms = {}

const {gameLoop, getUpdatedVelocity, joinNewPlayer} = require('./game')
const { makeid } = require('./utils');
const { FRAME_RATE } = require('./constants');

app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, 'front', 'index.html')))

io.on('connection', client => {
    console.log('connected')

    client.on('keydown', handleKeyDown)
    client.on('newGame', handleNewGame)
    client.on('joinGame', handleJoinGame)
    client.on('disconnectUser', handleDisconnectUser)

    function handleJoinGame(roomName){

        const rooms = io.sockets.adapter.rooms
        let numClients = 0;

        if (rooms.has(roomName)) {
            numClients = rooms.size - 2
        }
        console.log(rooms.size)
        if (numClients === 0) {
            client.emit('unknownGame')
            return
        }

        clientRooms[client.id] = roomName

        joinClient(client, roomName)

        // startGameInterval(roomName)

    }

    function joinClient(client, roomName){
        state[roomName] = joinNewPlayer(state[roomName], client.id)
        client.emit('gameCode', roomName)

        client.join(roomName);
        client.emit('init', client.id);

    }

    function handleNewGame(){
        let roomName = makeid(5);
        clientRooms[client.id] = roomName;

        joinClient(client, roomName)

        startGameInterval(roomName)

    }

    function handleKeyDown(keyCode){
        const roomName = clientRooms[client.id]

        if (!roomName){
            return
        }

        try{
            keyCode = parseInt(keyCode);
        }
        catch(e){
            console.error(e)
            return
        }
        let player = state[roomName].players.find(player => player.id === client.id)

        const vel = getUpdatedVelocity(player.vel, keyCode);
        if (vel) {
            player.vel = vel
        }
    }

    function startGameInterval(roomName){
        const intervalId = setInterval(() => {
            let looser = gameLoop(state[roomName]);
            if(looser){
                let looserNum = state[roomName].players.findIndex(player => player.id === looser)

                emitGameOver(roomName, looser)
                state[roomName].players.splice(looserNum, 1)
            }
            emitGameState(roomName, state[roomName])
        }, 1000 / FRAME_RATE)
    }
    
    function emitGameState(roomName, gameState) {
        io.sockets.in(roomName)
        .emit('gameState', JSON.stringify(gameState));

    }

    function handleDisconnectUser(){
        client.leave(clientRooms[client.id]);
    }

    function emitGameOver(roomName, looser) {
        io.sockets.in(roomName)
        .emit('gameOver', JSON.stringify({looser}));

    }

})





server.listen(3000);