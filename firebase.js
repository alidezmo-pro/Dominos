// firebase.js
import { state } from './state.js';
import { showToast, updateScoreUI, updateNamesUI, endGame } from './ui.js'; 
import { createDominoSet, shuffle, startTimer, checkAutoPass } from './logic.js';
import { renderGame } from './render.js';
import { initAudio } from './audio.js';

export function createRoom() {
    state.roomId = Math.floor(1000 + Math.random() * 9000).toString(); 
    state.playerRole = 'host';
    state.isOnline = true;
    state.roomMaxPlayers = state.selectedPlayersCount;
    state.targetScore = state.selectedTargetScore;

    const roomRef = window.ref(window.db, 'rooms/' + state.roomId);
    window.set(roomRef, {
        status: 'waiting',
        maxPlayers: state.roomMaxPlayers,
        targetScore: state.targetScore,
        scores: { host: 0, guest1: 0, guest2: 0 },
        names: { host: state.playerName, guest1: "", guest2: "" },
        host: true,
        guest1: false,
        guest2: false
    }).then(() => {
        const displayCode = document.getElementById("display-room-id");
        if (displayCode) displayCode.innerText = state.roomId;
        document.getElementById("created-code-box")?.classList.remove("hidden");
        listenToRoomUpdates(); 
    }).catch(err => {
        showToast("⚠️ حدث خطأ أثناء إنشاء الغرفة!");
        console.error(err);
    });
}

export function joinRoom() {
    const inputCode = document.getElementById("room-code")?.value.trim();
    if (!inputCode) return showToast("⚠️ يرجى إدخال الكود!");

    const roomRef = window.ref(window.db, 'rooms/' + inputCode);
    window.onValue(roomRef, (snapshot) => {
        const data = snapshot.val();
        if (data && data.status === 'waiting') {
            state.roomMaxPlayers = data.maxPlayers || 2;
            state.targetScore = data.targetScore || 100;
            
            if (state.roomMaxPlayers === 2) {
                state.playerRole = 'guest1';
                state.isOnline = true;
                window.update(roomRef, { guest1: true, status: 'playing', 'names/guest1': state.playerName });
            } else if (state.roomMaxPlayers === 3) {
                if (!data.guest1) {
                    state.playerRole = 'guest1';
                    state.isOnline = true;
                    window.update(roomRef, { guest1: true, 'names/guest1': state.playerName });
                    showToast("تم الانضمام! ننتظر اللاعب الثالث...");
                } else if (!data.guest2) {
                    state.playerRole = 'guest2';
                    state.isOnline = true;
                    window.update(roomRef, { guest2: true, status: 'playing', 'names/guest2': state.playerName });
                }
            }
            
            state.roomId = inputCode;
            document.getElementById("start-modal")?.classList.add("hidden");
            listenToRoomUpdates();
        } else if (data && data.status === 'playing') {
            showToast("⚠️ هذه الغرفة ممتلئة وتلعب حالياً!");
        } else {
            showToast("⚠️ كود الغرفة غير صحيح!");
        }
    }, { onlyOnce: true }); 
}

export function listenToRoomUpdates() {
    const roomRef = window.ref(window.db, 'rooms/' + state.roomId);
    window.onValue(roomRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        state.roomMaxPlayers = data.maxPlayers || 2;
        state.targetScore = data.targetScore || 100;

        if (data.names) {
            state.roomNames = data.names;
            updateNamesUI(); 
        }

        if (data.scores) {
            state.roomScores = data.scores;
            updateScoreUI();
        }
        
        let isFull = (state.roomMaxPlayers === 2 && data.guest1) || (state.roomMaxPlayers === 3 && data.guest1 && data.guest2);
        if (isFull && data.status === 'playing' && !data.gameState && state.playerRole === 'host' && !data.roundAlert) {
            startOnlineGame(); 
        }
        
        if (data.gameState) {
            syncGameState(data.gameState);
            
            // إظهار نافذة النهاية للجميع إذا انتهت الجولة
            if (data.gameState.isRoundOver) {
                if (data.roundAlert) {
                    endGame(data.roundAlert);
                }
                return; // إيقاف التنفيذ لمنع التكرار
            }
            
            if (state.playerRole === 'host') {
                const hHand = data.gameState.hostHand || [];
                const g1Hand = data.gameState.guest1Hand || [];
                const g2Hand = data.gameState.guest2Hand || [];

                if (data.gameState.isBlocked) {
                    processHostRoundEnd('block', data.gameState);
                } else if (hHand.length === 0) {
                    processHostRoundEnd('host', data.gameState);
                } else if (g1Hand.length === 0) {
                    processHostRoundEnd('guest1', data.gameState);
                } else if (state.roomMaxPlayers === 3 && g2Hand.length === 0) {
                    processHostRoundEnd('guest2', data.gameState);
                }
            }
        }
    });
}

export function startOnlineGame() {
    let set = createDominoSet(state.roomMaxPlayers);
    shuffle(set);

    let handSize = state.roomMaxPlayers === 3 ? 9 : 7;
    const newGameState = {
        hostHand: set.splice(0, handSize),
        guest1Hand: set.splice(0, handSize),
        guest2Hand: state.roomMaxPlayers === 3 ? set.splice(0, handSize) : false,
        boneyard: set.length > 0 ? set : false,
        boardChain: false,
        leftEndValue: -1,
        rightEndValue: -1,
        isRoundOver: false
    };

    let startingRole = 'host';
    outer: for (let d = 6; d >= 0; d--) {
        if (newGameState.hostHand && newGameState.hostHand.some(t => t.top === d && t.bottom === d)) { startingRole = 'host'; break outer; }
        if (newGameState.guest1Hand && newGameState.guest1Hand.some(t => t.top === d && t.bottom === d)) { startingRole = 'guest1'; break outer; }
        if (state.roomMaxPlayers === 3 && newGameState.guest2Hand && newGameState.guest2Hand.some(t => t.top === d && t.bottom === d)) { startingRole = 'guest2'; break outer; }
    }
    newGameState.currentTurn = startingRole;
    newGameState.isBlocked = false;

    window.update(window.ref(window.db, 'rooms/' + state.roomId), { gameState: newGameState, roundAlert: null });
}

export function syncGameState(onlineState) {
    document.getElementById("start-modal")?.classList.add("hidden");
    
    // لا تخفي نافذة النهاية إذا كانت الجولة قد انتهت للتو
    if (!onlineState.isRoundOver) {
        document.getElementById("end-modal")?.classList.add("hidden");
        state.isGameOver = false;
    }
    
    state.gameMode = state.roomMaxPlayers; 
    let comp2Avatar = document.getElementById("comp2-avatar");
    if (comp2Avatar) {
        if (state.gameMode === 3) comp2Avatar.classList.remove("hidden");
        else comp2Avatar.classList.add("hidden");
    }
    
    if (state.playerRole === 'host') {
        state.playerHand = onlineState.hostHand || [];
        state.comp1Hand = onlineState.guest1Hand || []; 
        state.comp2Hand = onlineState.guest2Hand || [];
        if (onlineState.currentTurn === 'host') state.currentTurn = 'player';
        else if (onlineState.currentTurn === 'guest1') state.currentTurn = 'comp1';
        else state.currentTurn = 'comp2';
    } else if (state.playerRole === 'guest1') {
        state.playerHand = onlineState.guest1Hand || [];
        state.comp1Hand = (state.roomMaxPlayers === 3) ? (onlineState.guest2Hand || []) : (onlineState.hostHand || []);
        state.comp2Hand = (state.roomMaxPlayers === 3) ? (onlineState.hostHand || []) : [];
        if (state.roomMaxPlayers === 2) {
            state.currentTurn = (onlineState.currentTurn === 'guest1') ? 'player' : 'comp1';
        } else {
            if (onlineState.currentTurn === 'guest1') state.currentTurn = 'player';
            else if (onlineState.currentTurn === 'guest2') state.currentTurn = 'comp1';
            else state.currentTurn = 'comp2';
        }
    } else if (state.playerRole === 'guest2') {
        state.playerHand = onlineState.guest2Hand || [];
        state.comp1Hand = onlineState.hostHand || [];
        state.comp2Hand = onlineState.guest1Hand || [];
        if (onlineState.currentTurn === 'guest2') state.currentTurn = 'player';
        else if (onlineState.currentTurn === 'host') state.currentTurn = 'comp1';
        else state.currentTurn = 'comp2';
    }

    state.boneyard = onlineState.boneyard || [];
    state.boardChain = onlineState.boardChain || [];
    state.leftEndValue = onlineState.leftEndValue !== -1 ? onlineState.leftEndValue : null;
    state.rightEndValue = onlineState.rightEndValue !== -1 ? onlineState.rightEndValue : null;
    state.centerTileIndex = onlineState.centerTileIndex || 0;

    renderGame();
    startTimer();
    checkAutoPass();
}

export function processHostRoundEnd(type, gameState) {
    let hHand = gameState.hostHand || [];
    let g1Hand = gameState.guest1Hand || [];
    let g2Hand = gameState.guest2Hand || [];

    let hScore = hHand.reduce((s, t) => s + t.top + t.bottom, 0);
    let g1Score = g1Hand.reduce((s, t) => s + t.top + t.bottom, 0);
    let g2Score = g2Hand.reduce((s, t) => s + t.top + t.bottom, 0);
    
    let winner = null;
    let points = 0;
    
    if (type === 'host') { winner = 'host'; points = g1Score + g2Score; }
    else if (type === 'guest1') { winner = 'guest1'; points = hScore + g2Score; }
    else if (type === 'guest2') { winner = 'guest2'; points = hScore + g1Score; }
    else if (type === 'block') {
        let min = hScore; winner = 'host';
        if (g1Score < min) { min = g1Score; winner = 'guest1'; }
        if (state.roomMaxPlayers === 3 && g2Score < min) { min = g2Score; winner = 'guest2'; }
        points = (hScore + g1Score + g2Score) - min;
    }
    
    state.roomScores[winner] += points;
    let isFinal = state.roomScores[winner] >= state.targetScore;
    
    let winnerName = (winner === 'host') ? (state.roomNames.host || "صاحب الغرفة") : ((winner === 'guest1') ? (state.roomNames.guest1 || "اللاعب 2") : (state.roomNames.guest2 || "اللاعب 3"));
    let msg = (type === 'block') ? "🔒 انغلقت اللعبة! " : "🎯 انتهت الجولة! ";
    msg += `فاز ${winnerName} بـ (${points}) نقطة.`;
    
    if (isFinal) msg = `🎉 انتهت المباراة! البطل هو ${winnerName}!`;
    
    endGame(msg); // للمضيف

    // إرسال التحديث لفايربيز وإعلام الجميع بأن الجولة انتهت دون مسح لوحة اللعب فوراً
    window.update(window.ref(window.db, 'rooms/' + state.roomId), {
        scores: state.roomScores,
        roundAlert: msg,
        'gameState/isRoundOver': true 
    });
    
    if (!isFinal) {
        setTimeout(() => {
            window.update(window.ref(window.db, 'rooms/' + state.roomId), { roundAlert: null });
            startOnlineGame();
        }, 4000); // تأخير 4 ثوانٍ ليتسنى للجميع رؤية الورقة الأخيرة ونافذة النهاية
    }
}

export function sendMoveToFirebase(isBlocked = false, passTurn = true) {
    if (!state.isOnline) return;
    
    let nextTurnRole = state.playerRole;

    if (passTurn) {
        if (state.roomMaxPlayers === 2) {
            nextTurnRole = (state.playerRole === 'host') ? 'guest1' : 'host';
        } else {
            if (state.playerRole === 'host') nextTurnRole = 'guest1';
            else if (state.playerRole === 'guest1') nextTurnRole = 'guest2';
            else if (state.playerRole === 'guest2') nextTurnRole = 'host';
        }
    }

    let hHand, g1Hand, g2Hand;
    if (state.roomMaxPlayers === 2) {
        if (state.playerRole === 'host') { hHand = state.playerHand; g1Hand = state.comp1Hand; g2Hand = []; }
        else { g1Hand = state.playerHand; hHand = state.comp1Hand; g2Hand = []; }
    } else {
        if (state.playerRole === 'host') { hHand = state.playerHand; g1Hand = state.comp1Hand; g2Hand = state.comp2Hand; }
        else if (state.playerRole === 'guest1') { g1Hand = state.playerHand; g2Hand = state.comp1Hand; hHand = state.comp2Hand; }
        else if (state.playerRole === 'guest2') { g2Hand = state.playerHand; hHand = state.comp1Hand; g1Hand = state.comp2Hand; }
    }

    // إرسال false بدلاً من المصفوفة الفارغة لمنع فايربيز من حذفها تلقائياً
    const gameState = {
        hostHand: (hHand && hHand.length > 0) ? hHand : false,
        guest1Hand: (g1Hand && g1Hand.length > 0) ? g1Hand : false,
        guest2Hand: (g2Hand && g2Hand.length > 0) ? g2Hand : false,
        boneyard: (state.boneyard && state.boneyard.length > 0) ? state.boneyard : false,
        boardChain: (state.boardChain && state.boardChain.length > 0) ? state.boardChain : false,
        leftEndValue: state.leftEndValue !== null ? state.leftEndValue : -1,
        rightEndValue: state.rightEndValue !== null ? state.rightEndValue : -1,
        centerTileIndex: state.centerTileIndex,
        currentTurn: nextTurnRole,
        isBlocked: isBlocked,
        isRoundOver: false
    };

    window.update(window.ref(window.db, 'rooms/' + state.roomId), { gameState: gameState });
}
