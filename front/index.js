const BG_COLOR = '#231f20';
const SNAKE_COLOR = '#c2c2c2';
const FOOD_COLOR = '#e66916';
const GRID_SIZE = 100;

let SIZE;
// const socket = io('https://video-test-p2p.herokuapp.com/');
const socket = io('http://localhost:5000/');
navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true
})
.catch(err=>{
    console.log('device not found')
})

socket.on('init', handleSocketInit);
socket.on('callState', handleCallState);
socket.on('callOver', handleCallOver);
socket.on('callCode', handleCallCode);
socket.on('tooManyPlayers', handleTooManyPlayers);
socket.on('updateLobbies', updateLobbies);
socket.on('updateUserNames', updateUserNames);

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

const myVideo = document.createElement('video')
myVideo.muted = true
myVideo.classList.add('user-video')
const myWrapper = document.createElement('div');
const myNameLabel = document.createElement('span')
myNameLabel.classList.add('user-name')

let userName = ''

let userId
let playerNumber;
let callActive = false;

const peers = {}
const myPeer = new Peer()
let myStream
let connectedDevices = {}, devicesState = {}
    
myPeer.on('open', id => {
    userId = id

    myVideo.id = id
    myNameLabel.id = `nameLabel${id}`
    myWrapper.appendChild(myVideo);
    myWrapper.appendChild(myNameLabel);
    
    socket.emit('openConnection', id)
    
    console.log(`my ID is ${id}`)
})


function updateUserNames(userNames){
    userNames.forEach((user)=>{
        const label = document.getElementById(`nameLabel${user.id}`)
        if (label) label.innerText = user.name
    })
}

function createStream(stream){
    console.log('myStreamCreated')
    socket.emit('addUserName', userName, userId)

    addVideoStream(myWrapper, myVideo, stream)
    myStream = stream

    myPeer.on('call', call => {
        console.log(`I answered the call`)

        call.answer(stream)

        const wrapper = document.createElement('div');
        const video = document.createElement('video')
        const nameLabel = document.createElement('span')
        nameLabel.classList.add('user-name')
        video.classList.add('user-video')
        video.id = call.peer
        nameLabel.id = `nameLabel${call.peer}`
        wrapper.appendChild(video);
        wrapper.appendChild(nameLabel);

        call.on('stream', userVideoStream => {
            console.log(`I recieved another user stream`)
            
            addVideoStream(wrapper, video, userVideoStream)
        })
        peers[call.peer] = call
    })
    
    socket.on('user-connected', id => {
        console.log(`${id} connected`)
        connectToNewUser(id)
    })

    callActive = true
    if (!devicesState.video) toggleVideo()
    if (!devicesState.audio) toggleMicro()
}

function chainError(err) {
    return Promise.reject(err)
};

async function askForDevice(){
    console.log('asked for device')
    const emptyMediaStream = new MediaStream([createEmptyAudioTrack(), createEmptyVideoTrack({ width:640, height:640 })]);
    let stream;
    try{
        connectedDevices.audio = true
        connectedDevices.video = true
        stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        })
        console.log('with audio and video')


    }
    catch{
        try{
            connectedDevices.audio = true
            connectedDevices.video = false
            stream = await navigator.mediaDevices.getUserMedia({
                video: false,
                audio: true
            })
            console.log('with audio')


        }
        catch{
            
        }
    }
    finally{

        connectedDevices.audio = false
        connectedDevices.video = false
        createStream(stream || emptyMediaStream)
    }
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
    userName = userMediaForm.nameInput.value
    console.log('connection to lobby')
    askForDevice()
}

function init(){
    initialScreen.style.display = 'none'
    callScreen.style.display = 'none'
    userMediaForm.style.display = 'block'
}

socket.on('userDisconnect', disconnectedUserId => {
    console.log(`${disconnectedUserId} disconnected`)

    peers[disconnectedUserId].close()
    delete peers[disconnectedUserId]
    document.getElementById(disconnectedUserId)?.parentElement.remove()
    console.log(peers)
})


function toggleMicro(){
    micro = myStream.getTracks().find((item)=>item.kind === 'audio')
    if (!micro) return

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
    if (!video) return

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
    const wrapper = document.createElement('div');
    const video = document.createElement('video')
    const nameLabel = document.createElement('span')
    nameLabel.classList.add('user-name')

    video.classList.add('user-video')
    video.id = id
    nameLabel.id = `nameLabel${id}`
    wrapper.appendChild(video);
    wrapper.appendChild(nameLabel);
    
    let recconectInterval = setInterval(()=>{
        console.log('try connection')
        const call = myPeer.call(id, myStream)

        call.on('stream', userVideoStream => {
            console.log('added')
            clearInterval(recconectInterval);
            addVideoStream(wrapper, video, userVideoStream)
        })
        call.on('close', () => {
            console.log('removed')
            clearInterval(recconectInterval);
            video.remove()
        })
        peers[id] = call

    }, 3000)

}
  
function addVideoStream(wrapper, video, stream) {
    video.srcObject = stream
    video.addEventListener('loadedmetadata', () => {
        video.play()
    })
    videoGrid.append(wrapper)
    socket.emit('getUserName', userId)
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
