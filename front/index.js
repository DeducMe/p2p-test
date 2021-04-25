const BG_COLOR = '#231f20';
const SNAKE_COLOR = '#c2c2c2';
const FOOD_COLOR = '#e66916';
const GRID_SIZE = 100;

let SIZE;
// const socket = io('https://multiplayer-snake1.herokuapp.com/');
const socket = io('http://localhost:5000/');

socket.on('init', handleSocketInit);
socket.on('callState', handleCallState);
socket.on('callOver', handleCallOver);
socket.on('callCode', handleCallCode);
socket.on('tooManyPlayers', handleTooManyPlayers);
socket.on('updateLobbies', updateLobbies);

const initialScreen = document.getElementById('initialScreen');
const callScreen = document.getElementById('callScreen');
const joinCallBtn = document.getElementById('joinCallBtn');
const newCallBtn = document.getElementById('newCallBtn');
const codeInput = document.getElementById('codeInput');
const callCodeDisplay = document.getElementById('callCodeDisplay');
const activeLobbies = document.getElementById('activeLobbies');
const videoGrid = document.getElementById('video-grid')


newCallBtn.addEventListener('click', startNewCall);
joinCallBtn.addEventListener('click', joinExistingCall);

let userId
let canvas, ctx;
let playerNumber;
let callActive = false;
const myVideo = document.createElement('video')
    myVideo.muted = true
const peers = {}
const myPeer = new Peer()

function init(){
    initialScreen.style.display = 'none'
    callScreen.style.display = 'block'

    navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      }).then(stream => {
        addVideoStream(myVideo, stream)
      
        myPeer.on('call', call => {
          call.answer(stream)
          const video = document.createElement('video')
          call.on('stream', userVideoStream => {
            addVideoStream(video, userVideoStream)
          })
        })
      
        socket.on('user-connected', userId => {
            console.log(userId)
            connectToNewUser(userId, stream)
        })
      })

    callActive = true
}

socket.on('userDisconnect', userId => {
    console.log(userId, peers[userId])
    peers[userId]?.close()
})

myPeer.on('open', id => {
    userId = id
    socket.emit('openConnection', id)
    
    console.log(id)
})
  
function connectToNewUser(userId, stream) {
    const call = myPeer.call(userId, stream)
    const video = document.createElement('video')
    call.on('stream', userVideoStream => {
        console.log('added')
        addVideoStream(video, userVideoStream)
    })
    call.on('close', () => {
        console.log('removed')

        video.remove()
    })

    peers[userId] = call
}
  
function addVideoStream(video, stream) {
    video.srcObject = stream
    video.addEventListener('loadedmetadata', () => {
        video.play()
    })
    videoGrid.append(video)
}

function handleSocketInit(number){
    playerNumber = number;
}

function handleCallState(callState){
    if (!callActive) return

    callState = JSON.parse(callState);
    requestAnimationFrame(() => paintCall(callState))
}

function handleCallOver(data){
    if (!callActive) return

    data = JSON.parse(data);
    console.log(data, playerNumber)
    if (data.looser === playerNumber){
        callActive = false
        socket.emit('disconnectUser')
        reset();
    }

}

function handleUnknownCall(){
    reset();
    alert("Unknown call code")
}

function handleTooManyPlayers(){
    reset();
    alert("call is already going")
    
}

function reset() {
    document.removeEventListener('keydown', snakeMovement);

    playerNumber = null;
    codeInput.value = "";
    callCodeDisplay.innerText = "";
    initialScreen.style.display = "block";
    callScreen.style.display = "none"
}

function handleCallCode(callCode){
    callCodeDisplay.innerText = callCode
}

function startNewCall(e){
    e.preventDefault()

    socket.emit('newCall')
    init()
}

function joinCallByLobby(lobbyName){
    socket.emit('joinCall', lobbyName, userId)
    init()
}

function joinExistingCall(e){
    e.preventDefault()
    const code = codeInput.value
    socket.emit('joinCall', code)
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
        `<li onclick="joinCallByLobby('${key}')">
            <span>${key}</span>
            <span>${result[key].length}</span>
        </li>`
    });
    activeLobbies.innerHTML = lobbiesField
}
