var express = require('express');
var app = express();
const path = require('path');
var https = require('https');
var fs = require('fs');

var options = {
    key: fs.readFileSync('file.pem'),
    cert: fs.readFileSync('file.crt')
};
var server = https.createServer(options, app);

app.set('port', (process.env.PORT || 5000));

app.use(express.static(path.join(__dirname, 'front')));
const io = require("socket.io")(server, {
    cors: {
    //   origin: "https://video-test-p2p.herokuapp.com/",
      origin: "https://localhost:5000/",
      methods: ["GET", "POST"],
      credentials: true,
    }
});

let clientRooms = {}
let userNames = {}

app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, 'front', 'index.html')))

io.on('connection', client => {
    let userId

    client.on('disconnect', handleDisconnectUser)
    client.on('disconnectUser', handleDisconnectUser)
    client.on('openConnection', setId)
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
    
})





server.listen(process.env.PORT || 5000);