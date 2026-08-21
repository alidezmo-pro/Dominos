// audio.js
import { state } from './state.js';

let peer = null;
let localStream = null;
const connectedPeers = new Set();
let audioTrack = null;

// يجب استدعاء هذه الدالة من ملف firebase.js فور إنشاء الغرفة أو الانضمام إليها
export async function initAudio() {
    try {
        // 1. طلب صلاحية الميكروفون فوراً لتجهيز الاتصال المخفي[span_1](start_span)[span_1](end_span)
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        audioTrack = localStream.getAudioTracks()[0];
        
        // كتم الصوت افتراضياً حتى لا يُسمع اللاعب إلا إذا أراد
        audioTrack.enabled = false;
        
        // 2. إنشاء معرّف فريد للاعب بناءً على الغرفة ودوره[span_2](start_span)[span_2](end_span)
        const myPeerId = `domino-${state.roomId}-${state.playerRole}`;
        
        // 3. إعدادات خوادم STUN و TURN من Metered[span_3](start_span)[span_3](end_span)
        const peerOptions = {
            config: {
                iceServers: [
                    { urls: "stun:stun.relay.metered.ca:80" },
                    { 
                        urls: "turn:global.relay.metered.ca:80", 
                        username: "1dedfc86f40960fa5dcae787", 
                        credential: "RMvH3tj4ie0ehFws" 
                    },
                    { 
                        urls: "turn:global.relay.metered.ca:80?transport=tcp", 
                        username: "1dedfc86f40960fa5dcae787", 
                        credential: "RMvH3tj4ie0ehFws" 
                    },
                    { 
                        urls: "turn:global.relay.metered.ca:443", 
                        username: "1dedfc86f40960fa5dcae787", 
                        credential: "RMvH3tj4ie0ehFws" 
                    },
                    { 
                        urls: "turns:global.relay.metered.ca:443?transport=tcp", 
                        username: "1dedfc86f40960fa5dcae787", 
                        credential: "RMvH3tj4ie0ehFws" 
                    }
                ]
            }
        };
        
        // 4. تهيئة الاتصال عبر الخوادم[span_4](start_span)[span_4](end_span)
        peer = new Peer(myPeerId, peerOptions);
        
        peer.on('open', (id) => {
            console.log('📞 متصل بخادم الصوت. المعرّف الخاص بك:', id);
            setTimeout(callOtherPlayers, 2000);
        });
        
        peer.on('call', (call) => {
            call.answer(localStream); 
            
            call.on('stream', (remoteStream) => {
                if (!connectedPeers.has(call.peer)) {
                    playRemoteStream(remoteStream, call.peer);
                    connectedPeers.add(call.peer);
                }
            });
        });

        return true; 
    } catch (err) {
        console.error("⚠️ لم نتمكن من الوصول للميكروفون:", err);
        return false; 
    }
}

function callOtherPlayers() {
    if (!peer || !localStream) return;
    
    const rolesToCall = ['host', 'guest1', 'guest2'].filter(role => role !== state.playerRole);
    
    rolesToCall.forEach(role => {
        const remotePeerId = `domino-${state.roomId}-${role}`;
        const call = peer.call(remotePeerId, localStream);
        
        if (call) {
            call.on('stream', (remoteStream) => {
                if (!connectedPeers.has(remotePeerId)) {
                    playRemoteStream(remoteStream, remotePeerId);
                    connectedPeers.add(remotePeerId);
                }
            });
        }
    });
}

function playRemoteStream(stream, peerId) {
    const audioElement = document.createElement('audio');
    audioElement.id = `audio-${peerId}`;
    audioElement.autoplay = true;
    audioElement.srcObject = stream;
    document.body.appendChild(audioElement);
    console.log(`🔊 جاري تشغيل صوت: ${peerId}`);
}

// دالة الزر أصبحت مسؤولة فقط عن تفعيل/تعطيل إرسال الصوت
export async function toggleMicUI() {
    const micBtn = document.getElementById("mic-btn");
    const micStatus = document.getElementById("mic-status");
    
    if (!localStream || !audioTrack) {
        alert("يرجى التأكد من إعطاء صلاحية الميكروفون للمتصفح أولاً!");
        return;
    }

    if (micBtn.classList.contains("muted")) {
        micBtn.classList.remove("muted");
        micStatus.innerText = "المايك مفتوح";
        audioTrack.enabled = true; // إرسال الصوت
    } else {
        micBtn.classList.add("muted");
        micStatus.innerText = "المايك مغلق";
        audioTrack.enabled = false; // كتم الصوت
    }
}
