var express = require('express');
var app = express();
const path = require('path');
var http = require('http');

app.set('port', (process.env.PORT || 5000));
var server = http.createServer(app);
app.use(express.static(path.join(__dirname, 'front')));
const io = require("socket.io")(server, {
    cors: {
      origin: "https://video-test-p2p.herokuapp.com/",
    //   origin: "http://localhost:5000/",
      methods: ["GET", "POST"],
      credentials: true,
    }
});

let state = {}  
let clientRooms = {}
let userNames = {}

const { makeid } = require('./utils');

app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, 'front', 'index.html')))

io.on('connection', client => {
    let userId

    client.on('disconnect', handleDisconnectUser)
    client.on('disconnectUser', handleDisconnectUser)
    client.on('openConnection', setId)
    client.on('keydown', handleKeyDown)
    client.on('newCall', handleNewCall)
    client.on('joinCall', handleJoinCall)
    client.on('addUserName', handleAddUserName)
    client.on('getUserName', handleGetUserName)
    
    client.emit('updateLobbies', clientRooms);

    function setId(id){
        userId = id
    }
    
    function handleGetUserName(id){
        client.emit('updateUserNames', userNames[clientRooms[id]]);     
    }

    function handleAddUserName(userName, id){
        userNames[clientRooms[id]] ? 
        userNames[clientRooms[id]].push({'id':id, 'name':userName})
        : userNames[clientRooms[id]] = [{'id':id, 'name':userName}]      
    }

    function handleJoinCall(roomName){
        const rooms = io.sockets.adapter.rooms
        let numClients = 0;

        if (rooms.has(roomName)) {
            numClients = rooms.size - 2
        }

        clientRooms[userId] = roomName

        joinClient(client, roomName)
    }

    function joinClient(client, roomName){
        client.emit('callCode', roomName)

        io.sockets.in(roomName)
        .emit('user-connected', userId);
        client.join(roomName);
        client.emit('init', userId);
        io.emit('updateLobbies', clientRooms);
    }

    function handleDisconnectUser(){
        client.leave(clientRooms[userId]);

        io.sockets.in(clientRooms[userId])
        .emit('userDisconnect', userId);
        delete clientRooms[userId]
        io.emit('updateLobbies', clientRooms);
    }

    function handleNewCall(roomName){
        clientRooms[userId] = roomName;

        joinClient(client, roomName)
    }

    function handleKeyDown(keyCode){
        const roomName = clientRooms[userId]

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
        let player = state[roomName].players.find(player => player.id === userId)
        if (player){
            const vel = getUpdatedVelocity(player.vel, keyCode);
            if (vel) {
                player.vel = vel
            }
        }
        
    }
})





server.listen(process.env.PORT || 5000);