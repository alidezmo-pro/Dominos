// main.js
import { setSelectPlayers, setSelectScore, showStartModal } from './ui.js';
import { createRoom, joinRoom } from './firebase.js';
import { selectGameMode, drawFromBoneyard, selectBoardEnd } from './logic.js';
// استيراد دالة المايك الحقيقية من ملف الصوت
import { toggleMicUI } from './audio.js';
// في أعلى ملف main.js
import { state } from './state.js';
import { setSelectPlayers, setSelectScore, showStartModal, returnToMainMenu } from './ui.js';





window.returnToMainMenu = returnToMainMenu;


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

// ربط زر المايك بالدالة الحقيقية للاتصال الصوتي
window.toggleMic = toggleMicUI;
