// audio.js
import { state } from './state.js';

let peer = null;
let localStream = null;
const connectedPeers = new Set(); // لحفظ من تم الاتصال بهم حتى لا يتكرر الصوت

export async function initAudio() {
    try {
        // 1. طلب صلاحية الميكروفون من المتصفح
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        
        // كتم المايك كوضع افتراضي في البداية حتى يضغط اللاعب على الزر
        localStream.getAudioTracks()[0].enabled = false;
        
        // 2. إنشاء معرّف فريد للاعب بناءً على الغرفة ودوره
        const myPeerId = `domino-${state.roomId}-${state.playerRole}`;
        
        // 3. تهيئة الاتصال عبر خوادم PeerJS المجانية
        peer = new Peer(myPeerId);
        
        peer.on('open', (id) => {
            console.log('📞 متصل بخادم الصوت. المعرّف الخاص بك:', id);
            // بعد الاتصال بالخادم، نحاول الاتصال بباقي اللاعبين في الغرفة
            setTimeout(callOtherPlayers, 2000);
        });
        
        // 4. استقبال المكالمات الصوتية من الخصم
        peer.on('call', (call) => {
            call.answer(localStream); // الرد بالمايك الخاص بك
            
            call.on('stream', (remoteStream) => {
                if (!connectedPeers.has(call.peer)) {
                    playRemoteStream(remoteStream, call.peer);
                    connectedPeers.add(call.peer);
                }
            });
        });

    } catch (err) {
        console.error("⚠️ لم نتمكن من الوصول للميكروفون:", err);
    }
}

// دالة للاتصال باللاعبين الآخرين
function callOtherPlayers() {
    if (!peer || !localStream) return;
    
    // تحديد الأدوار الأخرى التي يجب الاتصال بها
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

// دالة لتشغيل صوت الخصم برمجياً
function playRemoteStream(stream, peerId) {
    const audioElement = document.createElement('audio');
    audioElement.id = `audio-${peerId}`;
    audioElement.autoplay = true;
    audioElement.srcObject = stream;
    document.body.appendChild(audioElement);
    console.log(`🔊 جاري تشغيل صوت: ${peerId}`);
}

// الدالة الحقيقية لزر المايك
export function toggleMicUI() {
    const micBtn = document.getElementById("mic-btn");
    const micStatus = document.getElementById("mic-status");
    
    if (!localStream) {
        alert("🎤 يرجى إعطاء صلاحية الميكروفون للمتصفح أولاً!");
        return;
    }

    // التحكم في تشغيل أو إيقاف التقاط الصوت
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
