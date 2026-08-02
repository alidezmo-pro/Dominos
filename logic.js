// logic.js
import { state } from './state.js';
import { renderGame, renderAvatarTimer } from './render.js';
import { showToast, updateTurnStatus, endGame, updateScoreUI } from './ui.js';
import { sendMoveToFirebase } from './firebase.js';

export function selectGameMode(mode) {
    state.isOnline = false; 
    state.targetScore = state.selectedTargetScore;
    state.roomScores = { host: 0, guest1: 0, guest2: 0 };
    document.getElementById("scoreboard-container")?.classList.add("hidden"); 
    startGame(mode);
}

export function createDominoSet(mode) {
    let set = [];
    for (let i = 0; i <= 6; i++) {
        for (let j = i; j <= 6; j++) {
            if (mode === 3 && i === 0 && j === 0) continue; 
            set.push({ top: i, bottom: j });
        }
    }
    return set;
}

export function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export function startGame(mode) {
    state.gameMode = mode; state.isGameOver = false; state.selectedTileIndex = null;
    state.boardChain = []; state.centerTileIndex = 0; state.leftEndValue = null; state.rightEndValue = null;
    clearInterval(state.turnTimerInterval);

    document.getElementById("start-modal")?.classList.add("hidden");
    document.getElementById("end-modal")?.classList.add("hidden");

    let comp2Avatar = document.getElementById("comp2-avatar");
    if (comp2Avatar) {
        if (state.gameMode === 3) comp2Avatar.classList.remove("hidden");
        else comp2Avatar.classList.add("hidden");
    }

    state.fullSet = shuffle(createDominoSet(state.gameMode));
    let handSize = (state.gameMode === 3) ? 9 : 7;

    state.playerHand = state.fullSet.splice(0, handSize);
    state.comp1Hand = state.fullSet.splice(0, handSize);
    state.comp2Hand = (state.gameMode === 3) ? state.fullSet.splice(0, handSize) : [];
    state.boneyard = state.fullSet; 

    determineFirstTurn();
    renderGame();
    startTimer();

    if (state.currentTurn !== 'player' && !state.isOnline) {
        setTimeout(playComputerTurn, 600);
    }
}

export function determineFirstTurn() {
    for (let d = 6; d >= 0; d--) {
        if (state.playerHand.some(p => p.top === d && p.bottom === d)) { state.currentTurn = 'player'; return; }
        if (state.comp1Hand.some(p => p.top === d && p.bottom === d)) { state.currentTurn = 'comp1'; return; }
        if (state.gameMode === 3 && state.comp2Hand.some(p => p.top === d && p.bottom === d)) { state.currentTurn = 'comp2'; return; }
    }
    state.currentTurn = 'player';
}

export function startTimer() {
    clearInterval(state.turnTimerInterval);
    state.timeLeft = 25;
    renderAvatarTimer();

    state.turnTimerInterval = setInterval(() => {
        state.timeLeft--;
        let timerElem = document.querySelector(".avatar-timer");
        if (timerElem) {
            timerElem.innerText = state.timeLeft;
            if (state.timeLeft <= 5) timerElem.style.color = (state.timeLeft % 2 === 0) ? "#ffffff" : "#ef4444";
        }
        if (state.timeLeft <= 0) {
            clearInterval(state.turnTimerInterval);
            handleTimeOut();
        }
    }, 1000);
}

export function handleTimeOut() {
    if (state.currentTurn === 'player' && !state.isGameOver) {
        let playableIndices = [];
        state.playerHand.forEach((tile, idx) => {
            let ends = getPlayableEnds(tile);
            if (ends.length > 0 || state.boardChain.length === 0) playableIndices.push({ index: idx, ends: ends });
        });

        if (playableIndices.length > 0) {
            let chosen = playableIndices[Math.floor(Math.random() * playableIndices.length)];
            playPlayerTile(chosen.index, chosen.ends[0]);
        } else if (state.boneyard.length > 0) {
            drawFromBoneyard();
            if (!state.isOnline) setTimeout(nextTurn, 300); 
        } else {
            if (state.isOnline) sendMoveToFirebase(false, true);
            else nextTurn();
        }
    }
}

export function checkAutoPass() {
    if (state.currentTurn === 'player' && !state.isGameOver && state.boardChain.length > 0) {
        let canPlay = state.playerHand.some(t => getPlayableEnds(t).length > 0);
        if (!canPlay && state.boneyard.length === 0) {
            showToast("لا توجد حركات متاحة، تم تجاوز دورك تلقائياً ⏩");
            setTimeout(() => {
                if (state.isOnline) sendMoveToFirebase(false, true); 
                else nextTurn();
            }, 1000);
        }
    }
}

export function getPlayableEnds(tile) {
    if (state.boardChain.length === 0) return ['left', 'right'];
    let ends = [];
    if (tile.top === state.leftEndValue || tile.bottom === state.leftEndValue) ends.push('left');
    if (tile.top === state.rightEndValue || tile.bottom === state.rightEndValue) ends.push('right');
    return ends;
}

export function onPlayerTileClick(index) {
    if (state.currentTurn !== 'player' || state.isGameOver) return;
    let tile = state.playerHand[index];
    let ends = getPlayableEnds(tile);

    if (ends.length === 0 && state.boardChain.length > 0) return;

    if (ends.length === 2 && state.leftEndValue !== state.rightEndValue) {
        state.selectedTileIndex = (state.selectedTileIndex === index) ? null : index;
        renderGame();
        return;
    }

    let targetEnd = ends.length > 0 ? ends[0] : 'left';
    playPlayerTile(index, targetEnd);
}

window.onPlayerTileClick = onPlayerTileClick; 

export function selectBoardEnd(end) {
    if (state.selectedTileIndex !== null) {
        playPlayerTile(state.selectedTileIndex, end);
        state.selectedTileIndex = null;
    }
}

export function playPlayerTile(index, end) {
    let tile = state.playerHand.splice(index, 1)[0];
    addTileToBoard(tile, end);
    state.selectedTileIndex = null;

    if (state.playerHand.length === 0) { 
        if (state.isOnline) {
            sendMoveToFirebase(); 
        } else {
            processOfflineRoundEnd('player'); 
        }
        return; 
    }
    
    if (state.isOnline) sendMoveToFirebase();
    else nextTurn(); 
}

export function addTileToBoard(tile, end) {
    if (state.boardChain.length === 0) {
        state.boardChain.push({ top: tile.top, bottom: tile.bottom });
        state.centerTileIndex = 0;
        state.leftEndValue = tile.top;
        state.rightEndValue = tile.bottom;
        return;
    }

    if (end === 'left') {
        let orientedTile = (tile.bottom === state.leftEndValue) ? { top: tile.top, bottom: tile.bottom } : { top: tile.bottom, bottom: tile.top };
        state.leftEndValue = orientedTile.top;
        state.boardChain.unshift(orientedTile);
        state.centerTileIndex++; 
    } else {
        let orientedTile = (tile.top === state.rightEndValue) ? { top: tile.top, bottom: tile.bottom } : { top: tile.bottom, bottom: tile.top };
        state.rightEndValue = orientedTile.bottom;
        state.boardChain.push(orientedTile);
    }
}

export function nextTurn() {
    if (checkBlockGame()) return;

    if (state.currentTurn === 'player') state.currentTurn = 'comp1';
    else if (state.currentTurn === 'comp1') state.currentTurn = (state.gameMode === 3) ? 'comp2' : 'player';
    else state.currentTurn = 'player';
    
    renderGame();
    startTimer();
    checkAutoPass();

    if (state.currentTurn !== 'player' && !state.isGameOver && !state.isOnline) {
        setTimeout(playComputerTurn, 600);
    }
}

export function playComputerTurn() {
    if (state.isGameOver || state.isOnline) return; 
    let hand = (state.currentTurn === 'comp1') ? state.comp1Hand : state.comp2Hand;
    let playableIndices = [];
    
    hand.forEach((tile, idx) => {
        let ends = getPlayableEnds(tile);
        if (ends.length > 0 || state.boardChain.length === 0) playableIndices.push({ index: idx, ends: ends });
    });

    if (playableIndices.length > 0) {
        let chosen = playableIndices.find(item => hand[item.index].top === hand[item.index].bottom) || playableIndices[0];
        let tile = hand.splice(chosen.index, 1)[0];
        let endToPlay = chosen.ends.length > 0 ? chosen.ends[0] : 'right';

        addTileToBoard(tile, endToPlay);

        if (hand.length === 0) { 
            processOfflineRoundEnd(state.currentTurn); 
            return; 
        }
        nextTurn();
    } else {
        if (state.boneyard.length > 0) {
            hand.push(state.boneyard.pop());
            renderGame();
            setTimeout(playComputerTurn, 400);
        } else {
            nextTurn();
        }
    }
}

export function drawFromBoneyard() {
    if (state.currentTurn !== 'player' || state.isGameOver) return;
    let hasPlayable = state.playerHand.some(tile => getPlayableEnds(tile).length > 0);
    if (hasPlayable && state.boardChain.length > 0) return;
    
    if (state.boneyard.length > 0) {
        state.playerHand.push(state.boneyard.pop());
        renderGame();
        
        if (state.isOnline) sendMoveToFirebase(false, false); 
        checkAutoPass();
    } else {
        showToast("السوق فارغ!");
        if (state.isOnline) sendMoveToFirebase(false, true); 
        else nextTurn();
    }
}

export function checkBlockGame() {
    if (state.boneyard.length > 0 || state.boardChain.length === 0) return false;
    let playerCanPlay = state.playerHand.some(t => getPlayableEnds(t).length > 0);
    let comp1CanPlay = state.comp1Hand.some(t => getPlayableEnds(t).length > 0);
    let comp2CanPlay = (state.gameMode === 3) ? state.comp2Hand.some(t => getPlayableEnds(t).length > 0) : false;

    if (!playerCanPlay && !comp1CanPlay && (state.gameMode === 2 || !comp2CanPlay)) {
        if (state.isOnline) {
            sendMoveToFirebase(true); 
            return true;
        } else {
            processOfflineRoundEnd('block'); 
            return true;
        }
    }
    return false;
}

export function processOfflineRoundEnd(type) {
    let pScore = state.playerHand.reduce((s, t) => s + t.top + t.bottom, 0);
    let c1Score = state.comp1Hand.reduce((s, t) => s + t.top + t.bottom, 0);
    let c2Score = state.comp2Hand.reduce((s, t) => s + t.top + t.bottom, 0);

    let winner = null;
    let points = 0;
    let msg = "";

    // تحديد الفائز وحساب النقاط
    if (type === 'player') {
        winner = 'host'; 
        points = c1Score + c2Score;
        msg = `🎯 فزت بالجولة! حصدت ${points} نقطة.`;
    } else if (type === 'comp1') {
        winner = 'guest1';
        points = pScore + c2Score;
        msg = `🎯 فاز الخصم 1 بالجولة! حصد ${points} نقطة.`;
    } else if (type === 'comp2') {
        winner = 'guest2';
        points = pScore + c1Score;
        msg = `🎯 فاز الخصم 2 بالجولة! حصد ${points} نقطة.`;
    } else if (type === 'block') {
        let min = pScore; winner = 'host';
        if (c1Score < min) { min = c1Score; winner = 'guest1'; }
        if (state.gameMode === 3 && c2Score < min) { min = c2Score; winner = 'guest2'; }
        points = (pScore + c1Score + c2Score) - min;
        msg = `🔒 انغلقت اللعبة! فاز ${winner === 'host' ? 'أنت' : (winner === 'guest1' ? 'الخصم 1' : 'الخصم 2')} بـ ${points} نقطة.`;
    }

    state.roomScores[winner] += points;
    updateScoreUI(); 

    let isFinal = state.roomScores[winner] >= state.targetScore;

    if (isFinal) {
        let finalMsg = `🎉 انتهت المباراة! الفائز هو ${winner === 'host' ? 'أنت' : (winner === 'guest1' ? 'الخصم 1' : 'الخصم 2')}!`;
        endGame(finalMsg);
    } else {
        showToast(msg, 3500);
        state.isGameOver = true; 
        clearInterval(state.turnTimerInterval);
        setTimeout(() => { startGame(state.gameMode); }, 3500); 
    }
}
