const socket = io('https://meet.hexionteam.com', { secure: true });
const rtcConfiguration = { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] };
const peerConnection = new RTCPeerConnection(rtcConfiguration);

async function giveOffer() {
    try {
        if (window.uuid) {
            socket.on(`answer-${uuid}`, (answer) => {
                if (peerConnection.remoteDescription === null) {
                    console.log('got answer:', uuid);
                    const remoteDescription = new RTCSessionDescription(answer);
                    peerConnection.setRemoteDescription(remoteDescription);
                }
            });

            let offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            console.log('Offering RTC...');
            socket.emit('offer', window.uuid, offer);
        }
        else {
            console.error('Cannot offer before I got a UUID');
        }
    } catch (err) {
        console.error(err);
    }
};

peerConnection.negotiationneeded = giveOffer;

socket.on('uuid', (uuid) => {
    console.log('got UUID:', uuid);
    if (window.uuid === undefined) {
        window.uuid = uuid;

        console.log('Notifying that I got my UUID');
        socket.emit('uuid-recieved', uuid);
        giveOffer();
    }
});

socket.on('offer', async (uuid, offer) => {
    const remoteDescription = new RTCSessionDescription(offer);
    await peerConnection.setRemoteDescription(remoteDescription);
    console.log('got offer from', uuid);
    if (window.videoStream) {
        /*window.videoStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, window.videoStream);
        });*/

        let answer = await peerConnection.createAnswer();
        peerConnection.setLocalDescription(answer);
        console.log('sending my answer for', uuid);
        socket.emit('answer', uuid, answer);
    }
});

socket.on('joined', async (uuid) => {
    console.log('WOW someone joined!', uuid);
});

// Listen for local ICE candidates on the local RTCPeerConnection
peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
        console.log('sending a candidate');
        socket.emit('new-ice-candidate', event.candidate);
    }
};

// Listen for remote ICE candidates and add them to the local RTCPeerConnection
socket.on('new-ice-candidate', async (candidate) => {
    if (candidate) {
        try {
            console.log('adding recieved candidate');
            await peerConnection.addIceCandidate(candidate);
        } catch (e) {
            console.error('Error adding received ice candidate', e);
        }
    }
});

// Listen for connectionstatechange on the local RTCPeerConnection
peerConnection.addEventListener('connectionstatechange', (event) => {
    if (peerConnection.connectionState === 'connected') {
        console.log('Peers connected!');
    }
});

peerConnection.ontrack = async (event) => {
    console.log('GOT TRACK!');
    let otherVideoElem = document.getElementById("other");
    if (otherVideoElem.srcObject) return;
    otherVideoElem.srcObject = event.streams[0];
};

let constraints = { video: true, audio: true };
navigator.mediaDevices.getUserMedia(constraints)
    .then((stream) => {
        try {
            let localStream = new MediaStream();
            let myVideoElem = document.getElementById("you");
            
            // add all tracks to peer connection
            stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

            // add only video tracks for local stream
            stream.getVideoTracks().forEach((videoTrack) => localStream.addTrack(videoTrack));

            window.videoStream = stream;
            window.localStream = localStream;
            myVideoElem.srcObject = localStream;

            console.log('asking to join...');
            socket.emit('join');
        } catch (e) {
            document.getElementById("you").innerHTML = "No Camera!";
        }
    });