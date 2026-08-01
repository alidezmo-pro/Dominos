/* ==========================================================
 * script.js - النسخة النهائية (مزامنة الأونلاين + إيقاف الكمبيوتر)
 * ========================================================== */

// ==========================================
// 1. أكواد اللعب الأونلاين (الغرف عبر Firebase)
// ==========================================
let roomId = null;
let playerRole = null; 
let isOnline = false; // متغير سحري لمعرفة هل نحن أونلاين أم لا

window.createRoom = function() {
    roomId = Math.floor(1000 + Math.random() * 9000).toString(); 
    playerRole = 'host';
    isOnline = true;

    const roomRef = window.ref(window.db, 'rooms/' + roomId);
    window.set(roomRef, {
        status: 'waiting',
        host: true,
        guest: false
    }).then(() => {
        alert("تم إنشاء الغرفة بنجاح! 🎲\nكود الغرفة: " + roomId + "\nأرسله لصديقك.");
        document.getElementById("start-modal").classList.add("hidden");
        listenToRoomUpdates(); 
    });
};

window.joinRoom = function() {
    const inputCode = document.getElementById("room-code").value.trim();
    if (!inputCode) return alert("يرجى إدخال الكود!");

    const roomRef = window.ref(window.db, 'rooms/' + inputCode);
    window.onValue(roomRef, (snapshot) => {
        const data = snapshot.val();
        if (data && data.status === 'waiting') {
            roomId = inputCode;
            playerRole = 'guest';
            isOnline = true;
            
            window.update(roomRef, { status: 'playing', guest: true });
            alert("تم الانضمام! ننتظر الأوراق من صاحب الغرفة...");
            document.getElementById("start-modal").classList.add("hidden");
            listenToRoomUpdates();
        } else if (data && data.status === 'playing') {
            alert("الغرفة ممتلئة!");
        } else {
            alert("الكود غير صحيح!");
        }
    }, { onlyOnce: true }); 
};

function listenToRoomUpdates() {
    const roomRef = window.ref(window.db, 'rooms/' + roomId);
    window.onValue(roomRef, (snapshot) => {
        const data = snapshot.val();
        
        // بدء اللعبة وتوزيع الأوراق (لصاحب الغرفة فقط)
        if (data && data.status === 'playing' && !data.gameState && playerRole === 'host') {
            startOnlineGame(); 
        }
        
        // استقبال تحديثات الطاولة باستمرار (للطرفين)
        if (data && data.gameState) {
            syncGameState(data.gameState);
        }
    });
}

function startOnlineGame() {
    let set = [];
    for (let i = 0; i <= 6; i++) {
        for (let j = i; j <= 6; j++) set.push({ top: i, bottom: j });
    }
    
    for (let i = set.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [set[i], set[j]] = [set[j], set[i]];
    }

    const newGameState = {
        hostHand: set.splice(0, 7),
        guestHand: set.splice(0, 7),
        boneyard: set,
        boardChain: [],
        currentTurn: 'host',
        leftEndValue: -1,
        rightEndValue: -1
    };

    window.update(window.ref(window.db, 'rooms/' + roomId), { gameState: newGameState });
}

function syncGameState(onlineState) {
    document.getElementById("start-modal").classList.add("hidden");
    
    if (playerRole === 'host') {
        playerHand = onlineState.hostHand || [];
        comp1Hand = onlineState.guestHand || []; 
        currentTurn = (onlineState.currentTurn === 'host') ? 'player' : 'comp1';
    } else {
        playerHand = onlineState.guestHand || [];
        comp1Hand = onlineState.hostHand || [];
        currentTurn = (onlineState.currentTurn === 'guest') ? 'player' : 'comp1';
    }

    boneyard = onlineState.boneyard || [];
    boardChain = onlineState.boardChain || [];
    leftEndValue = onlineState.leftEndValue !== -1 ? onlineState.leftEndValue : null;
    rightEndValue = onlineState.rightEndValue !== -1 ? onlineState.rightEndValue : null;
    centerTileIndex = onlineState.centerTileIndex || 0;

    renderGame();
}

// دالة جديدة: إرسال حركتك إلى فايربيز
function sendMoveToFirebase() {
    if (!isOnline) return;
    
    let nextTurnRole = (currentTurn === 'player') ? 
        ((playerRole === 'host') ? 'guest' : 'host') : 
        ((playerRole === 'host') ? 'host' : 'guest');

    const state = {
        hostHand: (playerRole === 'host') ? playerHand : comp1Hand,
        guestHand: (playerRole === 'guest') ? playerHand : comp1Hand,
        boneyard: boneyard,
        boardChain: boardChain,
        leftEndValue: leftEndValue !== null ? leftEndValue : -1,
        rightEndValue: rightEndValue !== null ? rightEndValue : -1,
        centerTileIndex: centerTileIndex,
        currentTurn: nextTurnRole
    };

    window.update(window.ref(window.db, 'rooms/' + roomId), { gameState: state });
}

// ==========================================
// 2. متغيرات اللعبة الأساسية
// ==========================================
let fullSet = [], boneyard = [], playerHand = [], comp1Hand = [], comp2Hand = [], boardChain = [];
let gameMode = 2, currentTurn = 'player', selectedTileIndex = null;
let leftEndValue = null, rightEndValue = null, isGameOver = false, centerTileIndex = 0;
let turnTimerInterval, timeLeft = 25;

window.selectGameMode = selectGameMode;
window.drawFromBoneyard = drawFromBoneyard;
window.selectBoardEnd = selectBoardEnd;
window.showStartModal = showStartModal;

window.onload = function() { showStartModal(); };

function showStartModal() {
    document.getElementById("start-modal")?.classList.remove("hidden");
    document.getElementById("end-modal")?.classList.add("hidden");
}

function selectGameMode(mode) {
    isOnline = false; // تأكيد أننا نلعب ضد الكمبيوتر محلياً
    startGame(mode);
}

// ==========================================
// 3. منطق اللعبة
// ==========================================
function createDominoSet(mode) {
    let set = [];
    for (let i = 0; i <= 6; i++) {
        for (let j = i; j <= 6; j++) {
            if (mode === 3 && i === 0 && j === 0) continue; 
            set.push({ top: i, bottom: j });
        }
    }
    return set;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function startGame(mode) {
    gameMode = mode; isGameOver = false; selectedTileIndex = null;
    boardChain = []; centerTileIndex = 0; leftEndValue = null; rightEndValue = null;
    clearInterval(turnTimerInterval);

    document.getElementById("start-modal")?.classList.add("hidden");
    document.getElementById("end-modal")?.classList.add("hidden");

    fullSet = shuffle(createDominoSet(gameMode));
    let handSize = (gameMode === 3) ? 9 : 7;

    playerHand = fullSet.splice(0, handSize);
    comp1Hand = fullSet.splice(0, handSize);
    comp2Hand = (gameMode === 3) ? fullSet.splice(0, handSize) : [];
    boneyard = fullSet; 

    determineFirstTurn();
    renderGame();
    startTimer();

    if (currentTurn !== 'player' && !isOnline) {
        setTimeout(playComputerTurn, 1000);
    }
}

function determineFirstTurn() {
    for (let d = 6; d >= 0; d--) {
        if (playerHand.some(p => p.top === d && p.bottom === d)) { currentTurn = 'player'; return; }
        if (comp1Hand.some(p => p.top === d && p.bottom === d)) { currentTurn = 'comp1'; return; }
        if (gameMode === 3 && comp2Hand.some(p => p.top === d && p.bottom === d)) { currentTurn = 'comp2'; return; }
    }
    currentTurn = 'player';
}

function startTimer() {
    clearInterval(turnTimerInterval);
    timeLeft = 25;
    renderAvatarTimer();

    turnTimerInterval = setInterval(() => {
        timeLeft--;
        let timerElem = document.querySelector(".avatar-timer");
        if (timerElem) {
            timerElem.innerText = timeLeft;
            if (timeLeft <= 5) timerElem.style.color = (timeLeft % 2 === 0) ? "#ffffff" : "#ef4444";
        }
        if (timeLeft <= 0) {
            clearInterval(turnTimerInterval);
            handleTimeOut();
        }
    }, 1000);
}

function renderAvatarTimer() {
    document.querySelectorAll('.avatar-timer').forEach(el => el.remove());
    if (isGameOver) return;

    let activeAvatarContainer = null;
    if (currentTurn === 'player') activeAvatarContainer = document.getElementById("player-avatar");
    else if (currentTurn === 'comp1') activeAvatarContainer = document.getElementById("comp1-avatar");
    else if (currentTurn === 'comp2') activeAvatarContainer = document.getElementById("comp2-avatar");

    if (activeAvatarContainer) {
        let timerElem = document.createElement("div");
        timerElem.className = "avatar-timer";
        timerElem.innerText = timeLeft;
        activeAvatarContainer.appendChild(timerElem);
    }
}

function handleTimeOut() {
    if (currentTurn === 'player' && !isGameOver) {
        let playableIndices = [];
        playerHand.forEach((tile, idx) => {
            let ends = getPlayableEnds(tile);
            if (ends.length > 0 || boardChain.length === 0) playableIndices.push({ index: idx, ends: ends });
        });

        if (playableIndices.length > 0) {
            let chosen = playableIndices[Math.floor(Math.random() * playableIndices.length)];
            playPlayerTile(chosen.index, chosen.ends[0]);
        } else if (boneyard.length > 0) {
            drawFromBoneyard();
            if(!isOnline) setTimeout(nextTurn, 500); 
        } else {
            nextTurn();
        }
    }
}

function updateTurnStatus() {
    if (isGameOver) {
        clearInterval(turnTimerInterval);
        document.querySelectorAll('.avatar-timer').forEach(el => el.remove());
        return;
    }
    document.getElementById("player-avatar")?.classList.remove("active-neon-player");
    document.getElementById("comp1-avatar")?.classList.remove("active-neon-comp");
    document.getElementById("comp2-avatar")?.classList.remove("active-neon-comp");

    if (currentTurn === 'player') document.getElementById("player-avatar")?.classList.add("active-neon-player");
    else if (currentTurn === 'comp1') document.getElementById("comp1-avatar")?.classList.add("active-neon-comp");
    else if (currentTurn === 'comp2') document.getElementById("comp2-avatar")?.classList.add("active-neon-comp");
}

function getPlayableEnds(tile) {
    if (boardChain.length === 0) return ['left', 'right'];
    let ends = [];
    if (tile.top === leftEndValue || tile.bottom === leftEndValue) ends.push('left');
    if (tile.top === rightEndValue || tile.bottom === rightEndValue) ends.push('right');
    return ends;
}

function onPlayerTileClick(index) {
    if (currentTurn !== 'player' || isGameOver) return;
    let tile = playerHand[index];
    let ends = getPlayableEnds(tile);

    if (ends.length === 0 && boardChain.length > 0) return;

    if (ends.length === 2 && leftEndValue !== rightEndValue) {
        selectedTileIndex = (selectedTileIndex === index) ? null : index;
        renderGame();
        return;
    }

    let targetEnd = ends.length > 0 ? ends[0] : 'left';
    playPlayerTile(index, targetEnd);
}

function selectBoardEnd(end) {
    if (selectedTileIndex !== null) {
        playPlayerTile(selectedTileIndex, end);
        selectedTileIndex = null;
    }
}

function playPlayerTile(index, end) {
    let tile = playerHand.splice(index, 1)[0];
    addTileToBoard(tile, end);
    selectedTileIndex = null;

    if (playerHand.length === 0) { 
        endGame("🎉 مبروك! لقد فزت باللعبة!"); 
        if (isOnline) sendMoveToFirebase(); // إرسال حالة الفوز
        return; 
    }
    
    if (isOnline) {
        sendMoveToFirebase(); // إرسال الحركة لصديقك
    } else {
        nextTurn(); // تشغيل الكمبيوتر فقط في اللعب المحلي
    }
}

function addTileToBoard(tile, end) {
    if (boardChain.length === 0) {
        boardChain.push({ top: tile.top, bottom: tile.bottom });
        centerTileIndex = 0;
        leftEndValue = tile.top;
        rightEndValue = tile.bottom;
        return;
    }

    if (end === 'left') {
        let orientedTile = (tile.bottom === leftEndValue) 
            ? { top: tile.top, bottom: tile.bottom } 
            : { top: tile.bottom, bottom: tile.top };
        leftEndValue = orientedTile.top;
        boardChain.unshift(orientedTile);
        centerTileIndex++; 
    } else {
        let orientedTile = (tile.top === rightEndValue) 
            ? { top: tile.top, bottom: tile.bottom } 
            : { top: tile.bottom, bottom: tile.top };
        rightEndValue = orientedTile.bottom;
        boardChain.push(orientedTile);
    }
}

function nextTurn() {
    if (checkBlockGame()) return;

    if (currentTurn === 'player') currentTurn = 'comp1';
    else if (currentTurn === 'comp1') currentTurn = (gameMode === 3) ? 'comp2' : 'player';
    else currentTurn = 'player';
    
    renderGame();
    startTimer();

    if (currentTurn === 'player') {
        let canPlay = playerHand.some(t => getPlayableEnds(t).length > 0);
        if (!canPlay && boneyard.length === 0) {
            if (isOnline) { sendMoveToFirebase(); } 
            else { setTimeout(nextTurn, 600); }
            return;
        }
    }

    if (currentTurn !== 'player' && !isGameOver && !isOnline) {
        setTimeout(playComputerTurn, 900);
    }
}

function playComputerTurn() {
    if (isGameOver || isOnline) return; // منع الكمبيوتر من اللعب نهائياً في وضع الأونلاين
    let hand = (currentTurn === 'comp1') ? comp1Hand : comp2Hand;
    let playableIndices = [];
    
    hand.forEach((tile, idx) => {
        let ends = getPlayableEnds(tile);
        if (ends.length > 0 || boardChain.length === 0) playableIndices.push({ index: idx, ends: ends });
    });

    if (playableIndices.length > 0) {
        let chosen = playableIndices.find(item => hand[item.index].top === hand[item.index].bottom) || playableIndices[0];
        let tile = hand.splice(chosen.index, 1)[0];
        let endToPlay = chosen.ends.length > 0 ? chosen.ends[0] : 'right';

        addTileToBoard(tile, endToPlay);

        if (hand.length === 0) { endGame(`❌ للأسف، لقد خسرت!`); return; }
        nextTurn();
    } else {
        if (boneyard.length > 0) {
            hand.push(boneyard.pop());
            renderGame();
            setTimeout(playComputerTurn, 600);
        } else {
            nextTurn();
        }
    }
}

function drawFromBoneyard() {
    if (currentTurn !== 'player' || isGameOver) return;
    let hasPlayable = playerHand.some(tile => getPlayableEnds(tile).length > 0);
    if (hasPlayable && boardChain.length > 0) return;
    
    if (boneyard.length > 0) {
        playerHand.push(boneyard.pop());
        renderGame();
        if (isOnline) sendMoveToFirebase(); // تحديث السوق عند الخصم
    } else {
        if (isOnline) sendMoveToFirebase();
        else nextTurn();
    }
}

function checkBlockGame() {
    if (boneyard.length > 0 || boardChain.length === 0) return false;
    let playerCanPlay = playerHand.some(t => getPlayableEnds(t).length > 0);
    let comp1CanPlay = comp1Hand.some(t => getPlayableEnds(t).length > 0);
    let comp2CanPlay = (gameMode === 3) ? comp2Hand.some(t => getPlayableEnds(t).length > 0) : false;

    if (!playerCanPlay && !comp1CanPlay && (gameMode === 2 || !comp2CanPlay)) {
        let pScore = playerHand.reduce((s, t) => s + t.top + t.bottom, 0);
        let c1Score = comp1Hand.reduce((s, t) => s + t.top + t.bottom, 0);
        let minScore = Math.min(pScore, c1Score);
        
        let msg = "🔒 انغلقت اللعبة! ";
        if (minScore === pScore) msg += `فزت بأقل نقاط (${pScore})!`;
        else msg += `خسرت، نقاط الخصم أقل (${c1Score})!`;
        
        endGame(msg); return true;
    }
    return false;
}

// ==========================================
// 4. دوال رسم الطاولة والقطع (تبقى كما هي)
// ==========================================
function getPieceSquares(in_dir, out_dir, isDouble) {
    let rot = 0, sq1 = {x:0, y:0}, sq2 = {x:0, y:0};
    const HALF_SIZE = 14;
    
    if (in_dir === 'RIGHT') {
        if (!isDouble) { rot = -90; sq1 = {x: -HALF_SIZE, y:0}; sq2 = {x: HALF_SIZE, y:0}; }
        else { 
            rot = 0; sq1 = {x:0, y:0}; 
            if (out_dir === 'RIGHT') sq2 = {x:0, y:0};
            else if (out_dir === 'DOWN') sq2 = {x:0, y: HALF_SIZE};
            else if (out_dir === 'UP') sq2 = {x:0, y: -HALF_SIZE};
        }
    } else if (in_dir === 'LEFT') {
        if (!isDouble) { rot = 90; sq1 = {x: HALF_SIZE, y:0}; sq2 = {x: -HALF_SIZE, y:0}; }
        else { 
            rot = 0; sq1 = {x:0, y:0}; 
            if (out_dir === 'LEFT') sq2 = {x:0, y:0};
            else if (out_dir === 'DOWN') sq2 = {x:0, y: HALF_SIZE};
            else if (out_dir === 'UP') sq2 = {x:0, y: -HALF_SIZE};
        }
    } else if (in_dir === 'DOWN') {
        if (!isDouble) { rot = 0; sq1 = {x:0, y: -HALF_SIZE}; sq2 = {x:0, y: HALF_SIZE}; }
        else { 
            rot = -90; sq1 = {x:0, y:0}; 
            if (out_dir === 'DOWN') sq2 = {x:0, y:0};
            else if (out_dir === 'RIGHT') sq2 = {x: HALF_SIZE, y:0};
            else if (out_dir === 'LEFT') sq2 = {x: -HALF_SIZE, y:0};
        }
    } else if (in_dir === 'UP') {
        if (!isDouble) { rot = 180; sq1 = {x:0, y: HALF_SIZE}; sq2 = {x:0, y: -HALF_SIZE}; }
        else { 
            rot = -90; sq1 = {x:0, y:0}; 
            if (out_dir === 'UP') sq2 = {x:0, y:0};
            else if (out_dir === 'RIGHT') sq2 = {x: HALF_SIZE, y:0};
            else if (out_dir === 'LEFT') sq2 = {x: -HALF_SIZE, y:0};
        }
    }
    return { rot, sq1, sq2 };
}

function calculateSnakeLayout(chain, centerIdx) {
    if (!chain || chain.length === 0) return [];
    let dirs = new Array(chain.length - 1);
    const MAX_ROW = 9; 
    let travel = 'RIGHT'; let len = 0;
    
    for (let i = centerIdx; i < chain.length - 1; i++) {
        dirs[i] = travel; len++;
        if (travel === 'RIGHT' && len >= MAX_ROW) { travel = 'DOWN'; len = 0; }
        else if (travel === 'DOWN' && len >= 1) { travel = 'LEFT'; len = 0; }
        else if (travel === 'LEFT' && len >= MAX_ROW) { travel = 'DOWN'; len = 0; }
    }
    
    travel = 'LEFT'; len = 0;
    for (let i = centerIdx - 1; i >= 0; i--) {
        dirs[i] = (travel === 'LEFT') ? 'RIGHT' : (travel === 'RIGHT') ? 'LEFT' : (travel === 'UP') ? 'DOWN' : 'UP';
        len++;
        if (travel === 'LEFT' && len >= MAX_ROW) { travel = 'UP'; len = 0; }
        else if (travel === 'UP' && len >= 1) { travel = 'RIGHT'; len = 0; }
        else if (travel === 'RIGHT' && len >= MAX_ROW) { travel = 'UP'; len = 0; }
    }

    let layout = [];
    let cx = 0, cy = 0;
    let p_sq2_abs = { x: 0, y: 0 }; 
    const STEP_SIZE = 28;

    for (let i = 0; i < chain.length; i++) {
        let piece = chain[i];
        let isDouble = piece.top === piece.bottom;
        let in_dir = (i === 0) ? (dirs[0] || 'RIGHT') : dirs[i-1];
        let out_dir = (i === chain.length - 1) ? in_dir : dirs[i];
        let trans = getPieceSquares(in_dir, out_dir, isDouble);
        
        if (i === 0) {
            cx = 0; cy = 0;
        } else {
            let vec = {x:0, y:0};
            if (dirs[i-1] === 'RIGHT') vec = {x: STEP_SIZE, y: 0};
            else if (dirs[i-1] === 'LEFT') vec = {x: -STEP_SIZE, y: 0};
            else if (dirs[i-1] === 'DOWN') vec = {x: 0, y: STEP_SIZE};
            else if (dirs[i-1] === 'UP') vec = {x: 0, y: -STEP_SIZE};

            let target_sq1_abs = { x: p_sq2_abs.x + vec.x, y: p_sq2_abs.y + vec.y };
            cx = target_sq1_abs.x - trans.sq1.x;
            cy = target_sq1_abs.y - trans.sq1.y;
        }
        
        p_sq2_abs = { x: cx + trans.sq2.x, y: cy + trans.sq2.y };
        
        layout.push({
            ...piece, cx: cx, cy: cy, rotation: trans.rot,
            visualW: (trans.rot === 0 || trans.rot === 180) ? STEP_SIZE : (STEP_SIZE * 2),
            visualH: (trans.rot === 0 || trans.rot === 180) ? (STEP_SIZE * 2) : STEP_SIZE,
            start_x: cx + trans.sq1.x, start_y: cy + trans.sq1.y,
            end_x: p_sq2_abs.x, end_y: p_sq2_abs.y,
            in_dir: in_dir, out_dir: out_dir
        });
    }
    return layout;
}

function renderGame() {
    let playerArea = document.getElementById("player-hand");
    if (playerArea) {
        playerArea.innerHTML = "";
        let canPlayerPlay = (currentTurn === 'player');

        playerHand.forEach((piece, index) => {
            let ends = getPlayableEnds(piece);
            let isPlayable = canPlayerPlay && (ends.length > 0 || boardChain.length === 0);
            let isSelected = (selectedTileIndex === index);

            playerArea.innerHTML += `
                <div class="domino-piece ${isPlayable ? 'playable' : ''} ${isSelected ? 'selected' : ''}" 
                     onclick="${isPlayable ? `onPlayerTileClick(${index})` : ''}">
                    ${createDotsHTML(piece.top)}
                    <div class="divider"></div>
                    ${createDotsHTML(piece.bottom)}
                </div>
            `;
        });
    }

    let c1Count = document.getElementById("comp1-count");
    if (c1Count) c1Count.innerText = `🂠 ${comp1Hand.length}`;
    let bCount = document.getElementById("boneyard-count");
    if (bCount) bCount.innerText = boneyard.length;

    let chainArea = document.getElementById("board-chain");
    if (chainArea) {
        chainArea.innerHTML = "";
        if (boardChain.length === 0) {
            chainArea.innerHTML = `<p style="color:rgba(255,255,255,0.3); font-size:12px; position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);">الطاولة فارغة</p>`;
        } else {
            let layout = calculateSnakeLayout(boardChain, centerTileIndex);
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            layout.forEach(item => {
                if (item.cx - item.visualW / 2 < minX) minX = item.cx - item.visualW / 2;
                if (item.cx + item.visualW / 2 > maxX) maxX = item.cx + item.visualW / 2;
                if (item.cy - item.visualH / 2 < minY) minY = item.cy - item.visualH / 2;
                if (item.cy + item.visualH / 2 > maxY) maxY = item.cy + item.visualH / 2;
            });

            let totalW = maxX - minX, totalH = maxY - minY;
            let offsetX = -(minX + totalW / 2), offsetY = -(minY + totalH / 2);
            let tableElem = document.querySelector('.table-container');
            let maxAvailableWidth = tableElem ? tableElem.clientWidth - 80 : 500; 
            let maxAvailableHeight = tableElem ? tableElem.clientHeight - 80 : 200;
            let scale = Math.max(Math.min((maxAvailableWidth / totalW), (maxAvailableHeight / totalH), 1), 0.65);

            let first = layout[0], last = layout[layout.length - 1];

            if (selectedTileIndex !== null) {
                let playableEnds = getPlayableEnds(playerHand[selectedTileIndex]);
                if (playableEnds.includes('left')) {
                    let sx = (first.start_x + offsetX) * scale, sy = (first.start_y + offsetY) * scale;
                    if (first.in_dir === 'RIGHT') sx -= (40 * scale); else if (first.in_dir === 'LEFT') sx += (40 * scale); else if (first.in_dir === 'DOWN') sy -= (40 * scale); else if (first.in_dir === 'UP') sy += (40 * scale);
                    chainArea.innerHTML += `<div class="end-selector" onclick="selectBoardEnd('left')" style="position:absolute; left:calc(50% + ${sx}px); top:calc(50% + ${sy}px); transform:translate(-50%,-50%) scale(${scale}); z-index:10;">◀ هنا</div>`;
                }
                if (playableEnds.includes('right')) {
                    let ex = (last.end_x + offsetX) * scale, ey = (last.end_y + offsetY) * scale;
                    if (last.out_dir === 'RIGHT') ex += (40 * scale); else if (last.out_dir === 'LEFT') ex -= (40 * scale); else if (last.out_dir === 'DOWN') ey += (40 * scale); else if (last.out_dir === 'UP') ey -= (40 * scale);
                    chainArea.innerHTML += `<div class="end-selector" onclick="selectBoardEnd('right')" style="position:absolute; left:calc(50% + ${ex}px); top:calc(50% + ${ey}px); transform:translate(-50%,-50%) scale(${scale}); z-index:10;">هنا ▶</div>`;
                }
            }

            layout.forEach(item => {
                let px = (item.cx + offsetX) * scale, py = (item.cy + offsetY) * scale;
                chainArea.innerHTML += `
                    <div class="domino-piece" style="position: absolute; left: calc(50% + ${px}px); top: calc(50% + ${py}px); transform: translate(-50%, -50%) scale(${scale}) rotate(${item.rotation}deg);">
                        ${createDotsHTML(item.top)}<div class="divider"></div>${createDotsHTML(item.bottom)}
                    </div>`;
            });
        }
    }
    updateTurnStatus();
    renderAvatarTimer();
}

function createDotsHTML(value) {
    let dotsHTML = '';
    for (let i = 1; i <= value; i++) dotsHTML += `<div class="dot dot-${i}"></div>`;
    return `<div class="domino-half p-${value}">${dotsHTML}</div>`;
}

function endGame(message) {
    isGameOver = true;
    clearInterval(turnTimerInterval); 
    document.querySelectorAll('.avatar-timer').forEach(el => el.remove());
    let endTitle = document.getElementById("end-title");
    if (endTitle) endTitle.innerText = message;
    document.getElementById("end-modal")?.classList.remove("hidden");
}
