/* ==========================================================
 * لعبة الدومينو الاحترافية - ملف المحرك الأساسي المكتمل (script.js)
 * ========================================================== */

// --- 1. المتغيرات العامة للعبة (Game State) ---
let fullSet = [];          // الطقم الكامل للأحجار (28 حجر)
let boneyard = [];         // أحجار السوق (البلاط المتبقي)
let playerHand = [];       // أحجار اللاعب البشري
let comp1Hand = [];        // أحجار الكمبيوتر 1
let comp2Hand = [];        // أحجار الكمبيوتر 2
let boardChain = [];       // سلسلة الأحجار الملعوبة على الطاولة

let gameMode = 2;          // نمط اللعبة: 2 (لاعب ضد كمبيوتر) أو 3 (لاعب ضد 2 كمبيوتر)
let currentTurn = 'player';// الدور الحالي: 'player', 'comp1', 'comp2'
let selectedTileIndex = null; // الكارت المختار حالياً من يد اللاعب

let leftEndValue = null;   // الرقم المفتوح على الطرف الأيسر للطاولة
let rightEndValue = null;  // الرقم المفتوح على الطرف الأيمن للطاولة
let isGameOver = false;

// --- 2. ربط دالة اختيار النمط بالمتصفح عالمياً (إصلاح خطأ ReferenceError) ---
function selectGameMode(mode) {
    startGame(mode);
}
// إسناد صريح لنطاق النافذة لضمان الوصول إليها من زر HTML
window.selectGameMode = selectGameMode;
window.drawFromBoneyard = drawFromBoneyard;
window.selectBoardEnd = selectBoardEnd;
window.showStartModal = showStartModal;

// --- 3. تشغيل النافذة عند تحميل الصفحة ---
window.onload = function() {
    showStartModal();
};

// --- 4. إنشاء طقم الدومينو (28 حجر من 0-0 إلى 6-6) ---
function createDominoSet() {
    let set = [];
    for (let i = 0; i <= 6; i++) {
        for (let j = i; j <= 6; j++) {
            set.push({ top: i, bottom: j });
        }
    }
    return set;
}

// --- 5. خلط الأحجار العشوائي (Shuffle) ---
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// --- 6. بدء لعبة جديدة ---
function startGame(mode) {
    gameMode = mode;
    isGameOver = false;
    selectedTileIndex = null;
    boardChain = [];
    leftEndValue = null;
    rightEndValue = null;

    hideModals();

    let comp2Avatar = document.getElementById("comp2-avatar");
    if (comp2Avatar) {
        if (gameMode === 3) {
            comp2Avatar.classList.remove("hidden");
        } else {
            comp2Avatar.classList.add("hidden");
        }
    }

    fullSet = shuffle(createDominoSet());

    playerHand = fullSet.splice(0, 7);
    comp1Hand = fullSet.splice(0, 7);
    comp2Hand = (gameMode === 3) ? fullSet.splice(0, 7) : [];
    boneyard = fullSet;

    determineFirstTurn();
    renderGame();

    if (currentTurn !== 'player') {
        setTimeout(playComputerTurn, 1000);
    }
}

// --- 7. تحديد صاحب أول دور ---
function determineFirstTurn() {
    for (let d = 6; d >= 0; d--) {
        if (playerHand.some(p => p.top === d && p.bottom === d)) {
            currentTurn = 'player';
            return;
        }
        if (comp1Hand.some(p => p.top === d && p.bottom === d)) {
            currentTurn = 'comp1';
            return;
        }
        if (gameMode === 3 && comp2Hand.some(p => p.top === d && p.bottom === d)) {
            currentTurn = 'comp2';
            return;
        }
    }
    currentTurn = 'player';
}

// --- 8. فحص الأطراف القابلة للعب للحجر ---
function getPlayableEnds(tile) {
    if (boardChain.length === 0) return ['left', 'right'];

    let ends = [];
    if (tile.top === leftEndValue || tile.bottom === leftEndValue) ends.push('left');
    if (tile.top === rightEndValue || tile.bottom === rightEndValue) ends.push('right');
    return ends;
}

// --- 9. التفاعل عند النقر على حجر في يد اللاعب ---
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
        return;
    }

    nextTurn();
}

// --- 10. إضافة حجر إلى الطاولة وتوجيهه ---
function addTileToBoard(tile, end) {
    if (boardChain.length === 0) {
        boardChain.push({ top: tile.top, bottom: tile.bottom });
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
    } else {
        let orientedTile = (tile.top === rightEndValue) 
            ? { top: tile.top, bottom: tile.bottom } 
            : { top: tile.bottom, bottom: tile.top };
        rightEndValue = orientedTile.bottom;
        boardChain.push(orientedTile);
    }
}

// --- 11. إدارة الأدوار ---
function nextTurn() {
    if (checkBlockGame()) return;

    if (currentTurn === 'player') {
        currentTurn = 'comp1';
    } else if (currentTurn === 'comp1') {
        currentTurn = (gameMode === 3) ? 'comp2' : 'player';
    } else {
        currentTurn = 'player';
    }

    renderGame();

    if (currentTurn !== 'player' && !isGameOver) {
        setTimeout(playComputerTurn, 900);
    }
}

// --- 12. ذكاء الكمبيوتر الإصطناعي ---
function playComputerTurn() {
    if (isGameOver) return;

    let hand = (currentTurn === 'comp1') ? comp1Hand : comp2Hand;
    let compName = (currentTurn === 'comp1') ? 'الكمبيوتر 1' : 'الكمبيوتر 2';

    let playableIndices = [];
    hand.forEach((tile, idx) => {
        let ends = getPlayableEnds(tile);
        if (ends.length > 0 || boardChain.length === 0) {
            playableIndices.push({ index: idx, ends: ends });
        }
    });

    if (playableIndices.length > 0) {
        let chosen = playableIndices.find(item => hand[item.index].top === hand[item.index].bottom) || playableIndices[0];
        let tile = hand.splice(chosen.index, 1)[0];
        let endToPlay = chosen.ends.length > 0 ? chosen.ends[0] : 'right';

        addTileToBoard(tile, endToPlay);

        if (hand.length === 0) {
            endGame(`❌ للأسف، فاز ${compName} باللعبة!`);
            return;
        }

        nextTurn();
    } else {
        if (boneyard.length > 0) {
            let drawnTile = boneyard.pop();
            hand.push(drawnTile);
            renderGame();
            setTimeout(playComputerTurn, 600);
        } else {
            nextTurn();
        }
    }
}

// --- 13. السحب من السوق ---
function drawFromBoneyard() {
    if (currentTurn !== 'player' || isGameOver) return;

    let hasPlayable = playerHand.some(tile => getPlayableEnds(tile).length > 0);
    if (hasPlayable && boardChain.length > 0) {
        alert("لديك أحجار قابلة للعب! لا يمكنك السحب من السوق.");
        return;
    }

    if (boneyard.length > 0) {
        let tile = boneyard.pop();
        playerHand.push(tile);
        renderGame();
    } else {
        alert("السوق فارغ! تم نقل الدور.");
        nextTurn();
    }
}

// --- 14. فحص القفلة وحساب النقاط ---
function checkBlockGame() {
    if (boneyard.length > 0 || boardChain.length === 0) return false;

    let playerCanPlay = playerHand.some(t => getPlayableEnds(t).length > 0);
    let comp1CanPlay = comp1Hand.some(t => getPlayableEnds(t).length > 0);
    let comp2CanPlay = (gameMode === 3) ? comp2Hand.some(t => getPlayableEnds(t).length > 0) : false;

    if (!playerCanPlay && !comp1CanPlay && (gameMode === 2 || !comp2CanPlay)) {
        let pScore = calculateScore(playerHand);
        let c1Score = calculateScore(comp1Hand);
        let c2Score = (gameMode === 3) ? calculateScore(comp2Hand) : 999;

        let minScore = Math.min(pScore, c1Score, c2Score);
        let winnerMsg = "🔒 انغلقت اللعبة (قَفْلة)! ";

        if (minScore === pScore) winnerMsg += `فزت بأقل عدد نقاط (${pScore})!`;
        else if (minScore === c1Score) winnerMsg += `فاز الكمبيوتر 1 بأقل نقاط (${c1Score})!`;
        else winnerMsg += `فاز الكمبيوتر 2 بأقل نقاط (${c2Score})!`;

        endGame(winnerMsg);
        return true;
    }
    return false;
}

function calculateScore(hand) {
    return hand.reduce((sum, tile) => sum + tile.top + tile.bottom, 0);
}

// --- 15. رسم وتحديث الشاشة (Render Engine) ---
function renderGame() {
    let totalBoardTiles = boardChain.length;
    let scale = 1;

    if (totalBoardTiles > 8 && totalBoardTiles <= 14) scale = 0.85;
    else if (totalBoardTiles > 14 && totalBoardTiles <= 20) scale = 0.72;
    else if (totalBoardTiles > 20) scale = 0.60;

    document.documentElement.style.setProperty('--board-scale', scale);

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

    let c2Count = document.getElementById("comp2-count");
    if (c2Count && gameMode === 3) c2Count.innerText = `🂠 ${comp2Hand.length}`;

    let bCount = document.getElementById("boneyard-count");
    if (bCount) bCount.innerText = boneyard.length;

    let chainArea = document.getElementById("board-chain");
    if (chainArea) {
        chainArea.innerHTML = "";

        if (boardChain.length === 0) {
            chainArea.innerHTML = `<p style="color:rgba(255,255,255,0.5); font-size:12px;">الطاولة فارغة، اختر حجراً للبدء</p>`;
        } else {
            if (selectedTileIndex !== null) {
                let playableEnds = getPlayableEnds(playerHand[selectedTileIndex]);
                if (playableEnds.includes('left')) {
                    chainArea.innerHTML += `<div class="end-selector" onclick="selectBoardEnd('left')">◀ هنا</div>`;
                }
            }

            boardChain.forEach((piece) => {
                let isDouble = (piece.top === piece.bottom);
                let orientationClass = isDouble ? '' : 'horizontal';

                chainArea.innerHTML += `
                    <div class="domino-piece ${orientationClass}">
                        ${createDotsHTML(piece.top)}
                        <div class="divider"></div>
                        ${createDotsHTML(piece.bottom)}
                    </div>
                `;
            });

            if (selectedTileIndex !== null) {
                let playableEnds = getPlayableEnds(playerHand[selectedTileIndex]);
                if (playableEnds.includes('right')) {
                    chainArea.innerHTML += `<div class="end-selector" onclick="selectBoardEnd('right')">هنا ▶</div>`;
                }
            }
        }
    }

    updateTurnStatus();
}

function createDotsHTML(value) {
    let dotsHTML = '';
    for (let i = 1; i <= value; i++) {
        dotsHTML += `<div class="dot dot-${i}"></div>`;
    }
    return `<div class="domino-half p-${value}">${dotsHTML}</div>`;
}

function updateTurnStatus() {
    let statusElem = document.getElementById("turn-status");
    if (!statusElem || isGameOver) return;

    if (currentTurn === 'player') {
        statusElem.innerText = "🎯 دورك للعب الآن";
        statusElem.style.color = "#38bdf8";
    } else if (currentTurn === 'comp1') {
        statusElem.innerText = "🤖 يفكر الكمبيوتر 1...";
        statusElem.style.color = "#f59e0b";
    } else if (currentTurn === 'comp2') {
        statusElem.innerText = "🤖 يفكر الكمبيوتر 2...";
        statusElem.style.color = "#f59e0b";
    }
}

function showStartModal() {
    document.getElementById("start-modal")?.classList.remove("hidden");
    document.getElementById("end-modal")?.classList.add("hidden");
}

function hideModals() {
    document.getElementById("start-modal")?.classList.add("hidden");
    document.getElementById("end-modal")?.classList.add("hidden");
}

function endGame(message) {
    isGameOver = true;
    let endTitle = document.getElementById("end-title");
    if (endTitle) endTitle.innerText = message;
    document.getElementById("end-modal")?.classList.remove("hidden");
}
