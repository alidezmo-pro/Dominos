// main.js

// 1. استيراد state
import { state } from './state.js';

// 2. استيراد دوال الواجهة (تم دمجها في سطر واحد لتجنب التكرار)
import { setSelectPlayers, setSelectScore, showStartModal, returnToMainMenu } from './ui.js';

// 3. استيراد دوال فايربيز
import { createRoom, joinRoom } from './firebase.js';

// 4. استيراد دوال المنطق واللعب
import { selectGameMode, drawFromBoneyard, selectBoardEnd } from './logic.js';

// 5. استيراد دالة المايك الحقيقية من ملف الصوت
import { toggleMicUI } from './audio.js';

// 6. استيراد دالة الرسم (لإعادة رسم الطاولة عند تدوير الشاشة)
import { renderGame } from './render.js';


// ==========================================
// ربط المتغيرات والدوال بكائن window لتعمل في HTML
// ==========================================

// ربط state بـ window
window.state = state;

// ربط وظائف أزرار الواجهة
window.returnToMainMenu = returnToMainMenu;
window.setSelectPlayers = setSelectPlayers;
window.setSelectScore = setSelectScore;
window.showStartModal = showStartModal;

// ربط وظائف الأونلاين
window.createRoom = createRoom;
window.joinRoom = joinRoom;

// ربط وظائف اللعب
window.selectGameMode = selectGameMode;
window.drawFromBoneyard = drawFromBoneyard;
window.selectBoardEnd = selectBoardEnd;

// ربط زر المايك
window.toggleMic = toggleMicUI;

// ==========================================
// مستمعي الأحداث (Event Listeners)
// ==========================================

// تشغيل الواجهة عند تحميل الصفحة
window.onload = function() { 
    showStartModal(); 
};

// حل مشكلة تدوير الشاشة: إعادة رسم الطاولة تلقائياً عند قلب الموبايل
window.addEventListener('resize', () => {
    // نتأكد أن اللعبة قد بدأت بالفعل لتجنب أي أخطاء
    if (state && (state.boardChain.length > 0 || state.playerHand.length > 0)) {
        renderGame();
    }
});
