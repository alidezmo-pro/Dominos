// audio.js
import { state } from './state.js';

let peer = null;
let localStream = null;
const connectedPeers = new Set();

export async function initAudio() {
    try {
        // 1. طلب صلاحية الميكروفون من المتصفح (ستظهر الرسالة الآن)
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        
        // 2. إنشاء معرّف فريد للاعب بناءً على الغرفة ودوره
        const myPeerId = `domino-${state.roomId}-${state.playerRole}`;
        
        // 3. تهيئة الاتصال عبر خوادم PeerJS المجانية
        peer = new Peer(myPeerId);
        
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

        return true; // نجاح الاتصال
    } catch (err) {
        console.error("⚠️ لم نتمكن من الوصول للميكروفون:", err);
        return false; // فشل الاتصال
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

// === التعديل هنا: طلب الصلاحية عند الضغط على الزر ===
export async function toggleMicUI() {
    const micBtn = document.getElementById("mic-btn");
    const micStatus = document.getElementById("mic-status");
    
    // إذا لم تكن الصلاحية مأخوذة من قبل، اطلبها الآن!
    if (!localStream) {
        micStatus.innerText = "جاري الاتصال...";
        const success = await initAudio(); // ننتظر موافقة المستخدم
        
        if (!success) {
            alert("🎤 يرجى السماح للمتصفح باستخدام الميكروفون من إعدادات الموقع أعلى الشاشة!");
            micStatus.innerText = "المايك مغلق";
            return;
        }
    }

    // التحكم في كتم وفتح الصوت بعد أخذ الصلاحية
    const audioTrack = localStream.getAudioTracks()[0];
    
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
