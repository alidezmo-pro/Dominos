/* ==========================================================
 * لعبة الدومينو الاحترافية - محرك اللعب والشكل الثعباني (script.js)
 * ========================================================== */

// --- 1. المتغيرات العامة للعبة (Game State) ---
let fullSet = [];          
let boneyard = [];         
let playerHand = [];       
let comp1Hand = [];        
let comp2Hand = [];        
let boardChain = [];       // سلسلة الأحجار الملعوبة على الطاولة

let gameMode = 2;          
let currentTurn = 'player';
let selectedTileIndex = null; 

let leftEndValue = null;   
let rightEndValue = null;  
let isGameOver = false;

function selectGameMode(mode) {
    startGame(mode);
}
// ربط الدوال بالمتصفح عالمياً
window.selectGameMode = selectGameMode;
window.drawFromBoneyard = drawFromBoneyard;
window.selectBoardEnd = selectBoardEnd;
window.showStartModal = showStartModal;
// أضف هذا السطر في ملف script.js


window.onload = function() {
    showStartModal();
};

function createDominoSet() {
    let set = [];
    for (let i = 0; i <= 6; i++) {
        for (let j = i; j <= 6; j++) {
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
    gameMode = mode;
    isGameOver = false;
    selectedTileIndex = null;
    boardChain = [];
    leftEndValue = null;
    rightEndValue = null;

    document.getElementById("start-modal")?.classList.add("hidden");
    document.getElementById("end-modal")?.classList.add("hidden");

    let comp2Avatar = document.getElementById("comp2-avatar");
    if (comp2Avatar) {
        if (gameMode === 3) comp2Avatar.classList.remove("hidden");
        else comp2Avatar.classList.add("hidden");
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

function determineFirstTurn() {
    for (let d = 6; d >= 0; d--) {
        if (playerHand.some(p => p.top === d && p.bottom === d)) { currentTurn = 'player'; return; }
        if (comp1Hand.some(p => p.top === d && p.bottom === d)) { currentTurn = 'comp1'; return; }
        if (gameMode === 3 && comp2Hand.some(p => p.top === d && p.bottom === d)) { currentTurn = 'comp2'; return; }
    }
    currentTurn = 'player';
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
        return;
    }
    nextTurn();
}

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

function nextTurn() {
    if (checkBlockGame()) return;

    if (currentTurn === 'player') currentTurn = 'comp1';
    else if (currentTurn === 'comp1') currentTurn = (gameMode === 3) ? 'comp2' : 'player';
    else currentTurn = 'player';

    renderGame();

    if (currentTurn !== 'player' && !isGameOver) {
        setTimeout(playComputerTurn, 900);
    }
}

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

// =========================================================================
// 🚀 محرك الرسم الثنائي الأبعاد (2D Snake Layout Engine)
// =========================================================================

function calculateSnakeLayout(chain) {
    if (!chain || chain.length === 0) return [];
    
    let layout = [];
    let x = 0, y = 0;
    let direction = 'RIGHT'; 
    const TILE_L = 56; // طول الحجر
    const TILE_W = 28; // عرض الحجر
    const ROW_LIMIT = 150; // أقصى مسافة لليمين أو اليسار قبل الالتفاف (نقطة الكسر)

    for (let i = 0; i < chain.length; i++) {
        let piece = chain[i];
        let isDouble = piece.top === piece.bottom;
        let width, height, isHorizontal;

        // تحديد الأبعاد بناءً على الاتجاه ونوع الحجر
        if (direction === 'RIGHT' || direction === 'LEFT') {
            isHorizontal = !isDouble;
            width = isDouble ? TILE_W : TILE_L;
            height = isDouble ? TILE_L : TILE_W;
        } else { 
            // إذا كان الاتجاه للأسفل
            isHorizontal = isDouble;
            width = isDouble ? TILE_L : TILE_W;
            height = isDouble ? TILE_W : TILE_L;
        }

        if (i === 0) {
            x = 0; y = 0; // الحجر الأول في المنتصف تماماً
        } else {
            let prev = layout[i - 1];
            let dist = 0;

            if (direction === 'RIGHT') {
                dist = (prev.width / 2) + (width / 2);
                x = prev.x + dist;
                y = prev.y;
                if (x > ROW_LIMIT && !isDouble) direction = 'DOWN_FROM_RIGHT';
            }
            else if (direction === 'DOWN_FROM_RIGHT') {
                // النزول لأسفل بمقدار حجر واحد
                isHorizontal = isDouble;
                width = isDouble ? TILE_L : TILE_W;
                height = isDouble ? TILE_W : TILE_L;
                dist = (prev.height / 2) + (height / 2);
                x = prev.x;
                y = prev.y + dist;
                direction = 'LEFT'; // الاتجاه القادم سيكون لليسار
            }
            else if (direction === 'LEFT') {
                dist = (prev.width / 2) + (width / 2);
                x = prev.x - dist;
                y = prev.y;
                if (x < -ROW_LIMIT && !isDouble) direction = 'DOWN_FROM_LEFT';
            }
            else if (direction === 'DOWN_FROM_LEFT') {
                 // النزول لأسفل بمقدار حجر واحد من الجهة اليسرى
                 isHorizontal = isDouble;
                 width = isDouble ? TILE_L : TILE_W;
                 height = isDouble ? TILE_W : TILE_L;
                 dist = (prev.height / 2) + (height / 2);
                 x = prev.x;
                 y = prev.y + dist;
                 direction = 'RIGHT'; // العودة لليمين مجدداً
            }
        }

        layout.push({ ...piece, x, y, width, height, isHorizontal, direction });
    }
    return layout;
}

// --- تحديث واجهة المستخدم والرسم ---
function renderGame() {
    // 1. رسم يد اللاعب
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

    // 2. تحديث عدادات الأحجار
    let c1Count = document.getElementById("comp1-count");
    if (c1Count) c1Count.innerText = `🂠 ${comp1Hand.length}`;
    let c2Count = document.getElementById("comp2-count");
    if (c2Count && gameMode === 3) c2Count.innerText = `🂠 ${comp2Hand.length}`;
    let bCount = document.getElementById("boneyard-count");
    if (bCount) bCount.innerText = boneyard.length;

    // 3. رسم الطاولة (الشكل الثعباني)
    let chainArea = document.getElementById("board-chain");
    if (chainArea) {
        chainArea.innerHTML = "";
        chainArea.style.position = "relative"; // ضروري جداً لعمل الإحداثيات المطلقة

        if (boardChain.length === 0) {
            chainArea.innerHTML = `<p style="color:rgba(255,255,255,0.5); font-size:12px; position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);">الطاولة فارغة، اختر حجراً للبدء</p>`;
        } else {
            let layout = calculateSnakeLayout(boardChain);

            // حساب الإطار المحيط (Bounding Box) لتوسيط الثعبان برمجياً
            let minX = 0, maxX = 0, minY = 0, maxY = 0;
            layout.forEach(item => {
                if (item.x - item.width/2 < minX) minX = item.x - item.width/2;
                if (item.x + item.width/2 > maxX) maxX = item.x + item.width/2;
                if (item.y - item.height/2 < minY) minY = item.y - item.height/2;
                if (item.y + item.height/2 > maxY) maxY = item.y + item.height/2;
            });

            let totalW = maxX - minX;
            let totalH = maxY - minY;
            let offsetX = - (minX + totalW / 2);
            let offsetY = - (minY + totalH / 2);

            // حساب نسبة التصغير إذا كان الثعبان كبيراً جداً على الشاشة
            let scale = 1;
            if (totalH > 220 || totalW > 300) {
                scale = Math.min(300 / totalW, 220 / totalH);
                if (scale < 0.4) scale = 0.4; // وضع حد أدنى للتصغير
            }

            // رسم الأزرار الخاصة باختيار الأطراف (يمين أو يسار)
            let first = layout[0];
            let last = layout[layout.length - 1];

            if (selectedTileIndex !== null) {
                let playableEnds = getPlayableEnds(playerHand[selectedTileIndex]);
                if (playableEnds.includes('left')) {
                    let sx = (first.x + offsetX - 45) * scale;
                    let sy = (first.y + offsetY) * scale;
                    chainArea.innerHTML += `<div class="end-selector" onclick="selectBoardEnd('left')" style="position:absolute; left:calc(50% + ${sx}px); top:calc(50% + ${sy}px); transform:translate(-50%,-50%) scale(${scale}); z-index:10;">◀ هنا</div>`;
                }
            }

            // رسم أحجار الثعبان
            layout.forEach(item => {
                let orientationClass = item.isHorizontal ? 'horizontal' : '';
                
                // حساب إحداثيات الحجر مع تطبيق نسبة التصغير
                let px = (item.x + offsetX) * scale;
                let py = (item.y + offsetY) * scale;

                // ترتيب النقاط (يتم قلبها بصرياً إذا كان الاتجاه لليسار لضمان اتصال الأرقام بشكل صحيح)
                let firstHalf = createDotsHTML(item.top);
                let secondHalf = createDotsHTML(item.bottom);
                
                if (item.direction === 'LEFT') {
                    firstHalf = createDotsHTML(item.bottom);
                    secondHalf = createDotsHTML(item.top);
                }

                chainArea.innerHTML += `
                    <div class="domino-piece ${orientationClass}"
                         style="position: absolute; left: calc(50% + ${px}px); top: calc(50% + ${py}px); transform: translate(-50%, -50%) scale(${scale}); margin:0;">
                        ${firstHalf}
                        <div class="divider"></div>
                        ${secondHalf}
                    </div>
                `;
            });

            if (selectedTileIndex !== null) {
                let playableEnds = getPlayableEnds(playerHand[selectedTileIndex]);
                if (playableEnds.includes('right')) {
                    let sx = (last.x + offsetX + 45) * scale;
                    let sy = (last.y + offsetY) * scale;
                    chainArea.innerHTML += `<div class="end-selector" onclick="selectBoardEnd('right')" style="position:absolute; left:calc(50% + ${sx}px); top:calc(50% + ${sy}px); transform:translate(-50%,-50%) scale(${scale}); z-index:10;">هنا ▶</div>`;
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

function endGame(message) {
    isGameOver = true;
    let endTitle = document.getElementById("end-title");
    if (endTitle) endTitle.innerText = message;
    document.getElementById("end-modal")?.classList.remove("hidden");
}
