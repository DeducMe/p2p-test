const BG_COLOR = '#231f20';
const SNAKE_COLOR = '#c2c2c2';
const FOOD_COLOR = '#e66916';
const GRID_SIZE = 100;

let SIZE;
const socket = io('https://video-test-p2p.herokuapp.com/');
// const socket = io('http://localhost:5000/');

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

const muteBtn = document.getElementById('muteBtn');
const videoMuteBtn = document.getElementById('videoMuteBtn');
const userMediaForm = document.getElementById('userMediaForm');

muteBtn.addEventListener('click', toggleMicro);
videoMuteBtn.addEventListener('click', toggleVideo);
userMediaForm.addEventListener('submit', connectToLobby);

newCallBtn.addEventListener('click', startNewCall);
joinCallBtn.addEventListener('click', joinExistingCall);

let userId
let playerNumber;
let callActive = false;
const myVideo = document.createElement('video')
    myVideo.muted = true
    myVideo.classList.add('user-video')
const peers = {}
const myPeer = new Peer()
let usersInRoom = []
let myStream
let connectedDevices = {}, devicesState = {}
    
myPeer.on('open', id => {
    userId = id
    socket.emit('openConnection', id)
    
    console.log(`my ID is ${id}`)
})

navigator.mediaDevices.getUserMedia({
    audio: true
})

navigator.mediaDevices.getUserMedia({
    video: true
})

function createStream(stream, recall){
    addVideoStream(myVideo, stream)
    myStream = stream

    myPeer.on('call', call => {
        console.log(`I answered the call`)

        call.answer(stream)
        const video = document.createElement('video')
        video.classList.add('user-video')
        video.id = call.peer

        call.on('stream', userVideoStream => {
            console.log(`I recieved another user stream`)
            
            addVideoStream(video, userVideoStream)
        })
        peers[call.peer] = call
    })
    
    socket.on('user-connected', id => {
        usersInRoom.push(id)
        connectToNewUser(id)
    })

    callActive = true
    if (!devicesState.video) toggleVideo()
    if (!devicesState.audio) toggleMicro()

    if (recall) usersInRoom.forEach((id)=>{
        connectToNewUser(id)
    })
}

function askForDevice(recall){
    const emptyMediaStream = new MediaStream([createEmptyAudioTrack(), createEmptyVideoTrack({ width:640, height:640 })]);
    
    navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
    })
    .then(stream => {
        connectedDevices.audio = true
        connectedDevices.video = true
        createStream(stream, recall)
        return
    })
    .catch(error => {
        navigator.mediaDevices.getUserMedia({
            audio: true,
        })
        .then(stream => {
            connectedDevices.audio = true
            connectedDevices.video = false
            createStream(stream, recall)
            return
        })
        .catch(error => {
            connectedDevices.audio = false
            connectedDevices.video = false
            createStream(emptyMediaStream, recall)
        });
    });
}

function connectToLobby(e){
    e.preventDefault()
    connectedDevices = {
        video: userMediaForm.videoState.checked,
        audio: userMediaForm.microState.checked
    }
    devicesState = {
        video: userMediaForm.videoState.checked,
        audio: userMediaForm.microState.checked
    }
    userMediaForm.style.display = 'none'
    callScreen.style.display = 'block'

    askForDevice()
    
}

function init(){
    initialScreen.style.display = 'none'
    callScreen.style.display = 'none'
    userMediaForm.style.display = 'block'
}

socket.on('userDisconnect', disconnectedUserId => {
    console.log(`${disconnectedUserId} disconnected`)
    usersInRoom.splice(usersInRoom.findIndex((id)=>id===disconnectedUserId), 1)

    peers[disconnectedUserId].close()
    delete peers[disconnectedUserId]
    document.getElementById(disconnectedUserId)?.remove()
    console.log(peers)

})


function toggleMicro(){
    micro = myStream.getTracks().find((item)=>item.kind === 'audio')
    if (!micro){
        askForDevice(true)
        return
    }

    if (micro.enabled){
        micro.enabled = false
        muteBtn.classList.add('muted')

        return 
    }
    micro.enabled = true
    muteBtn.classList.remove('muted')
}
function toggleVideo(){
    video = myStream.getTracks().find((item)=>item.kind === 'video')
    if (!video){
        askForDevice(true)
        return
    }

    if (video.enabled){
        video.enabled = false
        videoMuteBtn.classList.add('muted')
        return 
    }
    video.enabled = true
    videoMuteBtn.classList.remove('muted')
}

function createEmptyAudioTrack(){
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    const track = dst.stream.getAudioTracks()[0];
    return Object.assign(track, { enabled: false });
};

function createEmptyVideoTrack({ width, height }){
    const canvas = Object.assign(document.createElement('canvas'), { width, height });
    canvas.getContext('2d').fillRect(0, 0, width, height);
  
    const stream = canvas.captureStream();
    const track = stream.getVideoTracks()[0];
  
    return Object.assign(track, { enabled: false });
};
  
function connectToNewUser(id) {
    const video = document.createElement('video')
    video.classList.add('user-video')
    video.id = id
    
    let recconectInterval = setInterval(()=>{
        console.log('try connection')
        const call = myPeer.call(id, myStream)

        call.on('stream', userVideoStream => {
            console.log('added')
            clearInterval(recconectInterval);
            addVideoStream(video, userVideoStream)
        })
        call.on('close', () => {
            console.log('removed')
            clearInterval(recconectInterval);
            video.remove()
        })
        peers[id] = call

    }, 3000)

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
    if (Object.keys(lobbiesData).length === 0){
        activeLobbies.innerHTML = 'No active lobbies...'
        return
    }
    for (let [key, value] of Object.entries(lobbiesData)) {
        if (result[value]) result[value].push(key)
        else result[value] = [key]
    }
    Object.keys(result).forEach((key) => {
        lobbiesField +=
        `<li class="rounded" onclick="joinCallByLobby('${key}')">
            <span>${key}</span>
            <span class="lobby-user-amount">${result[key].length}</span>
        </li>`
    });
    activeLobbies.innerHTML = lobbiesField
}
