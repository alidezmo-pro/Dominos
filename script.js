/* ==========================================================
 * script.js - محرك اللعب والشكل الثعباني المطور (النزول بحجرين)
 * ========================================================== */

// --- المتغيرات العامة للعبة ---
let fullSet = [];          
let boneyard = [];         
let playerHand = [];       
let comp1Hand = [];        
let comp2Hand = [];        
let boardChain = [];       // سلسلة الأحجار الملعوبة

let gameMode = 2;          
let currentTurn = 'player';
let selectedTileIndex = null; 

let leftEndValue = null;   
let rightEndValue = null;  
let isGameOver = false;

window.selectGameMode = selectGameMode;
window.drawFromBoneyard = drawFromBoneyard;
window.selectBoardEnd = selectBoardEnd;
window.showStartModal = showStartModal;

window.onload = function() {
    showStartModal();
};

function selectGameMode(mode) {
    startGame(mode);
}

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

// 🎯 محرك الإضافة: ضَبْط الاتجاهات بحسب أطراف اللعب
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
// 🚀 محرك الـ Snake الجديد (نزول بحجرين في اللفة)
// =========================================================================
function calculateSnakeLayout(chain) {
    if (!chain || chain.length === 0) return [];
    
    let layout = [];
    let current_x = 0, current_y = 0;
    let dir = 'RIGHT'; 
    let next_dir = null;
    let down_count = 0; // عداد للنزول بحجرين
    const ROW_LIMIT = 180; // حدود السطر قبل اللفة

    for (let i = 0; i < chain.length; i++) {
        let piece = chain[i];
        let isDouble = (piece.top === piece.bottom);
        
        // عند الوصول للحد الأقصى للسطر، نبدأ بالنزول بحجرين عموديين
        if (dir === 'RIGHT' && current_x > ROW_LIMIT && !isDouble) {
            dir = 'DOWN';
            down_count = 2; // النزول بحجرين لترك مسافة كافية بين السطور
            next_dir = 'LEFT';
        } else if (dir === 'LEFT' && current_x < -ROW_LIMIT && !isDouble) {
            dir = 'DOWN';
            down_count = 2; // النزول بحجرين لترك مسافة كافية بين السطور
            next_dir = 'RIGHT';
        }

        let rotation = 0;
        let step = isDouble ? 28 : 56;
        let w, h, cx, cy, entry_x, entry_y, exit_x, exit_y;

        if (dir === 'RIGHT') {
            rotation = isDouble ? 0 : -90;
            w = isDouble ? 28 : 56;
            h = isDouble ? 56 : 28;
            cx = current_x + step / 2;
            cy = current_y;
            entry_x = cx - w / 2; entry_y = cy;
            exit_x = cx + w / 2; exit_y = cy;
            current_x += step;
        } else if (dir === 'LEFT') {
            rotation = isDouble ? 0 : 90;
            w = isDouble ? 28 : 56;
            h = isDouble ? 56 : 28;
            cx = current_x - step / 2;
            cy = current_y;
            entry_x = cx + w / 2; entry_y = cy;
            exit_x = cx - w / 2; exit_y = cy;
            current_x -= step;
        } else if (dir === 'DOWN') {
            rotation = isDouble ? 90 : 0;
            w = isDouble ? 56 : 28;
            h = isDouble ? 28 : 56;
            cx = current_x;
            cy = current_y + step / 2;
            entry_x = cx; entry_y = cy - h / 2;
            exit_x = cx; exit_y = cy + h / 2;
            current_y += step;
            
            down_count--;
            // بعد النزول بحجرين، يتم التحول للاتجاه الأفقي الجديد
            if (down_count === 0 && next_dir) {
                dir = next_dir;
                next_dir = null;
            }
        }
        
        layout.push({
            ...piece,
            cx, cy, w, h, rotation, dir,
            entry_x, entry_y, exit_x, exit_y
        });
    }
    return layout;
}

// --- تحديث واجهة اللعبة واحتساب الحجم لتجنب التداخل ---
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
    let c2Count = document.getElementById("comp2-count");
    if (c2Count && gameMode === 3) c2Count.innerText = `🂠 ${comp2Hand.length}`;
    let bCount = document.getElementById("boneyard-count");
    if (bCount) bCount.innerText = boneyard.length;

    // 🎯 رسم الطاولة وحساب التصغير التلقائي لمنع وصول الأحجار إلى يد اللاعب
    let chainArea = document.getElementById("board-chain");
    if (chainArea) {
        chainArea.innerHTML = "";

        if (boardChain.length === 0) {
            chainArea.innerHTML = `<p style="color:rgba(255,255,255,0.5); font-size:12px; position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);">الطاولة فارغة، اختر حجراً للبدء</p>`;
        } else {
            let layout = calculateSnakeLayout(boardChain);

            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            layout.forEach(item => {
                if (item.cx - item.w / 2 < minX) minX = item.cx - item.w / 2;
                if (item.cx + item.w / 2 > maxX) maxX = item.cx + item.w / 2;
                if (item.cy - item.h / 2 < minY) minY = item.cy - item.h / 2;
                if (item.cy + item.h / 2 > maxY) maxY = item.cy + item.h / 2;
            });

            let totalW = maxX - minX;
            let totalH = maxY - minY;
            
            let bboxCenterX = minX + totalW / 2;
            let bboxCenterY = minY + totalH / 2;
            let offsetX = -bboxCenterX;
            let offsetY = -bboxCenterY;

            // تم تقليل الارتفاع المتاح محلياً لضمان عدم خروج الأحجار عن الحدود الزرقاء للطاولة
            let scale = 1;
            let maxAvailableWidth = 520; 
            let maxAvailableHeight = 200; 
            
            if (totalW > maxAvailableWidth || totalH > maxAvailableHeight) {
                scale = Math.min(maxAvailableWidth / totalW, maxAvailableHeight / totalH);
                scale = Math.max(scale, 0.45);
            }

            let first = layout[0];
            let last = layout[layout.length - 1];

            if (selectedTileIndex !== null) {
                let playableEnds = getPlayableEnds(playerHand[selectedTileIndex]);
                if (playableEnds.includes('left')) {
                    let sx = (first.entry_x + offsetX) * scale - (40 * scale);
                    let sy = (first.entry_y + offsetY) * scale;
                    chainArea.innerHTML += `<div class="end-selector" onclick="selectBoardEnd('left')" style="position:absolute; left:calc(50% + ${sx}px); top:calc(50% + ${sy}px); transform:translate(-50%,-50%) scale(${scale}); z-index:10;">◀ هنا</div>`;
                }
                if (playableEnds.includes('right')) {
                    let sx = (last.exit_x + offsetX) * scale;
                    let sy = (last.exit_y + offsetY) * scale;
                    
                    if (last.exit_x > last.cx) sx += (40 * scale);
                    else if (last.exit_x < last.cx) sx -= (40 * scale);
                    else if (last.exit_y > last.cy) sy += (40 * scale);
                    else if (last.exit_y < last.cy) sy -= (40 * scale);

                    chainArea.innerHTML += `<div class="end-selector" onclick="selectBoardEnd('right')" style="position:absolute; left:calc(50% + ${sx}px); top:calc(50% + ${sy}px); transform:translate(-50%,-50%) scale(${scale}); z-index:10;">هنا ▶</div>`;
                }
            }

            layout.forEach(item => {
                let px = (item.cx + offsetX) * scale;
                let py = (item.cy + offsetY) * scale;

                chainArea.innerHTML += `
                    <div class="domino-piece"
                         style="position: absolute; left: calc(50% + ${px}px); top: calc(50% + ${py}px); transform: translate(-50%, -50%) scale(${scale}) rotate(${item.rotation}deg);">
                        ${createDotsHTML(item.top)}
                        <div class="divider"></div>
                        ${createDotsHTML(item.bottom)}
                    </div>
                `;
            });
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
