// Initial connection to websocket for signaling server
const conn = new WebSocket("ws://localhost:8080/socket");
conn.onopen = ()=>{
    console.log("Connected to the signaling server");
    initialize();
}
conn.onmessage = (message)=>{
    console.log("New message: "+message.data);
    const signal = JSON.parse(message.data)
    const type = signal.type;
    switch (type){
        case "init":
            createOffer(signal);
            break;
        case "offer":
            handleOffer(signal);
            break;
        case "answer":
            handleAnswer(signal);
            break;
        case "ice":
            handleIce(signal);
            break;
        case "logout":
            handleLogout(signal);
            break;
    }
}
function send(message){
    conn.send(JSON.stringify(message));
}
let peerConnection;
let dataChannel;
let otherClient;
const input = document.getElementById("messageInput");
function initialize(){
// Create peerConnection, dataChannel and also the event of dataChannel
    const configuration = null;
    peerConnection = new RTCPeerConnection(configuration);
    peerConnection.onicecandidate = (event)=>{
        if (event.candidate){
            send({
                type: "ice",
                receiver: otherClient,
                data: event.candidate
            })
        }
    };
    dataChannel = peerConnection.createDataChannel("dataChannel");
    dataChannel.onopen = (event)=>{
        console.log("Data channel is opened");
    }
    dataChannel.onmessage = (event)=>{
        console.log("New message: "+event.data);
    }
    dataChannel.onclose = (event)=>{
        console.log("Data channel is closed");
    }
    dataChannel.onerror = (error) =>{
        console.log("Data channel has error: "+error);
    }
    peerConnection.ondatachannel = (event) =>{
        dataChannel = event.channel;
        dataChannel.onmessage = (event)=>{
            console.log("On datachannel message: "+event.data);
        }
    };
}

function createOffer(signal){
    const senderId = signal.sender;
    otherClient = senderId;
    peerConnection.createOffer().then((sdp)=>{
        peerConnection.setLocalDescription(sdp).then();
        console.log("Create offer for: "+senderId);
        send({
            type: "offer",
            receiver: senderId,
            data: sdp
        });
    }).catch((error)=>{
        console.log("Error: "+error);
    })
}

function handleOffer(signal){
    otherClient = signal.sender;
    peerConnection.setRemoteDescription(new RTCSessionDescription(signal.data)).then(r=>{
        peerConnection.createAnswer().then((sdp)=>{
            peerConnection.setLocalDescription(sdp).then();
            send({
                type: "answer",
                receiver: signal.sender,
                sender: signal.receiver,
                data: sdp
            })
        }).catch((err)=>console.log("Error while create answer: "+err));
    });
}

function handleIce(signal){
    if (signal.data){
        console.log("Adding ICE");
        peerConnection.addIceCandidate(new RTCIceCandidate(signal.data)).catch((error)=>console.error("Error: "+error));
    }
}

function handleAnswer(signal){
    peerConnection.setRemoteDescription(new RTCSessionDescription(signal.data)).then(()=>{
        console.log('Setting remote description by answer from: ' + signal.sender);
    });
}

function handleLogout(signal){
    console.log(signal.sender+ " logout!");
}

function sendMessage() {
    dataChannel.send(input.value);
    input.value = "";
}