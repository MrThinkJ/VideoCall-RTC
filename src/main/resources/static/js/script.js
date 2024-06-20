let peerConnection;
let dataChannel;
let otherClient;
let websocketConn;
const PORT = "8443";
const SOCKET = "/socket";
const input = document.getElementById("messageInput");
const constraints = {
  video: true,
  audio: true,
};
const configuration = {
  iceServers: [{ urls: "stun:stun2.1.google.com:19302" }],
};
let localStream;
const selfView = document.getElementById("selfView");
const remoteView = document.getElementById("remoteView");
function initialize() {
  navigator.mediaDevices
    .getUserMedia(constraints)
    .then((stream) => {
      localStream = stream;
      selfView.srcObject = new MediaStream([localStream.getTracks()[1]]);
      setUpPeerConnection();
      setUpWebSocket();
    })
    .catch((err) => {
      console.log("Error when stream: " + err);
      alert(err);
    });
}

function setUpPeerConnection() {
  peerConnection = new RTCPeerConnection(configuration);
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      send({
        type: "ice",
        receiver: otherClient,
        data: event.candidate,
      });
    }
  };
  dataChannel = peerConnection.createDataChannel("dataChannel");
  dataChannel.onopen = (event) => {
    console.log("Data channel is opened");
  };
  dataChannel.onmessage = (event) => {
    console.log("New message: " + event.data);
  };
  dataChannel.onclose = (event) => {
    console.log("Data channel is closed");
  };
  dataChannel.onerror = (error) => {
    console.log("Data channel has error: " + error);
  };

  peerConnection.ondatachannel = (event) => {
    dataChannel = event.channel;
    dataChannel.onmessage = (event) => {
      console.log("On datachannel message: " + event.data);
    };
  };
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.addEventListener("track", async (event) => {
    console.log(event);
    const [remoteStream] = event.streams;
    remoteView.srcObject = remoteStream;
  });
}
function setUpWebSocket() {
  websocketConn = new WebSocket("wss://"+window.location.hostname+":"+PORT+SOCKET);
  websocketConn.onopen = () => {
    console.log("Connected to the signaling server");
  };
  websocketConn.onmessage = (message) => {
    console.log("New message: " + message.data);
    const signal = JSON.parse(message.data);
    const type = signal.type;
    switch (type) {
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
  };
}
function send(message) {
  websocketConn.send(JSON.stringify(message));
}
function createOffer(signal) {
  const senderId = signal.sender;
  otherClient = senderId;
  peerConnection
    .createOffer()
    .then((sdp) => {
      peerConnection.setLocalDescription(sdp).then();
      console.log("Create offer for: " + senderId);
      send({
        type: "offer",
        receiver: senderId,
        data: sdp,
      });
    })
    .catch((error) => {
      console.log("Error: " + error);
    });
}

function handleOffer(signal) {
  otherClient = signal.sender;
  peerConnection
    .setRemoteDescription(new RTCSessionDescription(signal.data))
    .then((r) => {
      peerConnection
        .createAnswer()
        .then((sdp) => {
          peerConnection.setLocalDescription(sdp).then();
          send({
            type: "answer",
            receiver: signal.sender,
            sender: signal.receiver,
            data: sdp,
          });
        })
        .catch((err) => console.log("Error while create answer: " + err));
    });
}

function handleIce(signal) {
  if (signal.data) {
    console.log("Adding ICE");
    peerConnection
      .addIceCandidate(new RTCIceCandidate(signal.data))
      .catch((error) => console.error("Error: " + error));
  }
}

function handleAnswer(signal) {
  peerConnection
    .setRemoteDescription(new RTCSessionDescription(signal.data))
    .then(() => {
      console.log(
        "Setting remote description by answer from: " + signal.sender
      );
    });
}

function handleLogout(signal) {
  console.log(signal.sender + " logout!");
  dataChannel.close();
}

function sendMessage() {
  dataChannel.send(input.value);
  input.value = "";
}

window.onload = initialize;
