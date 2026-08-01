// main.js
import { setSelectPlayers, setSelectScore, showStartModal } from './ui.js';
import { createRoom, joinRoom } from './firebase.js';
import { selectGameMode, drawFromBoneyard, selectBoardEnd } from './logic.js';
// في أعلى ملف main.js
import { state } from './state.js';

// مع بقية المتغيرات التي يتم ربطها بـ window
window.state = state;

// ربط الوظائف للـ HTML Buttons
window.setSelectPlayers = setSelectPlayers;
window.setSelectScore = setSelectScore;
window.createRoom = createRoom;
window.joinRoom = joinRoom;
window.selectGameMode = selectGameMode;
window.drawFromBoneyard = drawFromBoneyard;
window.selectBoardEnd = selectBoardEnd;
window.showStartModal = showStartModal;

window.onload = function() { 
    showStartModal(); 
};
// دالة تشغيل وإغلاق المايك
window.toggleMic = function() {
    const micBtn = document.getElementById("mic-btn");
    const micStatus = document.getElementById("mic-status");
    
    if (micBtn.classList.contains("muted")) {
        micBtn.classList.remove("muted");
        micStatus.innerText = "المايك مفتوح";
        // هنا يمكنك لاحقاً إضافة كود الـ WebRTC الخاص بفتح المايك
    } else {
        micBtn.classList.add("muted");
        micStatus.innerText = "المايك مغلق";
        // هنا يمكنك لاحقاً إضافة كود الـ WebRTC الخاص بغلق المايك
    }
};
