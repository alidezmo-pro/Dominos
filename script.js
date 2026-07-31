/* ==========================================================
 * script.js - محرك اللعب والشكل الثعباني المطور (النزول بحجرين)
 * ========================================================== */

/* ----------------------------------------------------------
 * 1. المتغيرات العامة للعبة
 * ---------------------------------------------------------- */
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

// ربط الدوال بالنافذة لتكون متاحة في HTML
window.selectGameMode = selectGameMode;
window.drawFromBoneyard = drawFromBoneyard;
window.selectBoardEnd = selectBoardEnd;
window.showStartModal = showStartModal;

window.onload = function() {
    showStartModal();
};

/* ----------------------------------------------------------
 * 2. إعداد وبدء اللعبة
 * ---------------------------------------------------------- */
function showStartModal() {
    document.getElementById("start-modal")?.classList.remove("hidden");
    document.getElementById("end-modal")?.classList.add("hidden");
}

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

    // إخفاء النوافذ المنبثقة
    document.getElementById("start-modal")?.classList.add("hidden");
    document.getElementById("end-modal")?.classList.add("hidden");

    // إعداد لاعب الكمبيوتر الثاني إذا كان النمط 3 لاعبين
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
    currentTurn = 'player'; // افتراضي
}

/* ----------------------------------------------------------
 * 3. منطق اللعب للأطراف وحركة اللاعب
 * ---------------------------------------------------------- */
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

    // إذا كان الحجر قابلاً للعب على كلا الطرفين
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

/* ----------------------------------------------------------
 * 4. إدارة الأدوار والذكاء الاصطناعي والسوق
 * ---------------------------------------------------------- */
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

/* ==========================================================
 * 5. محرك الـ Snake (الرسم والتخطيط على الطاولة) - معدل
 * ========================================================== */
function calculateSnakeLayout(chain) {
    if (!chain || chain.length === 0) return [];
    
    let layout = [];
    let attach_x = 0, attach_y = 0; // نقطة الالتحام الدقيقة بين الأحجار
    let dir = 'RIGHT'; 
    let next_dir = null;
    let down_count = 0; 
    let ROW_LIMIT = 320; // زيادة المساحة الأفقية قبل الالتفاف

    for (let i = 0; i < chain.length; i++) {
        let piece = chain[i];
        let isDouble = (piece.top === piece.bottom);
        
        // الانعطاف ونزول حجرين عند الوصول للحد الأقصى
        if (dir === 'RIGHT' && attach_x > ROW_LIMIT && !isDouble) {
            dir = 'DOWN';
            down_count = 2; 
            next_dir = 'LEFT';
        } else if (dir === 'LEFT' && attach_x < -ROW_LIMIT && !isDouble) {
            dir = 'DOWN';
            down_count = 2; 
            next_dir = 'RIGHT';
        }

        let rotation = 0;
        let cx, cy, visualW, visualH, next_attach_x, next_attach_y;
        let entry_x, entry_y, exit_x, exit_y;

        // حساب الأبعاد بدقة لمنع أي تداخل (Overlap)
        if (dir === 'RIGHT') {
            if (!isDouble) {
                cx = attach_x + 14; cy = attach_y;
                visualW = 56; visualH = 28; rotation = -90;
                next_attach_x = attach_x + 56; next_attach_y = attach_y;
                entry_x = cx - 28; entry_y = cy; exit_x = cx + 28; exit_y = cy;
            } else {
                cx = attach_x; cy = attach_y;
                visualW = 28; visualH = 56; rotation = 0;
                next_attach_x = attach_x + 28; next_attach_y = attach_y;
                entry_x = cx - 14; entry_y = cy; exit_x = cx + 14; exit_y = cy;
            }
        } else if (dir === 'LEFT') {
            if (!isDouble) {
                cx = attach_x - 14; cy = attach_y;
                visualW = 56; visualH = 28; rotation = 90;
                next_attach_x = attach_x - 56; next_attach_y = attach_y;
                entry_x = cx + 28; entry_y = cy; exit_x = cx - 28; exit_y = cy;
            } else {
                cx = attach_x; cy = attach_y;
                visualW = 28; visualH = 56; rotation = 0;
                next_attach_x = attach_x - 28; next_attach_y = attach_y;
                entry_x = cx + 14; entry_y = cy; exit_x = cx - 14; exit_y = cy;
            }
        } else if (dir === 'DOWN') {
            if (!isDouble) {
                cx = attach_x; cy = attach_y + 14;
                visualW = 28; visualH = 56; rotation = 0;
                next_attach_x = attach_x; next_attach_y = attach_y + 56;
                entry_x = cx; entry_y = cy - 28; exit_x = cx; exit_y = cy + 28;
            } else {
                cx = attach_x; cy = attach_y;
                visualW = 56; visualH = 28; rotation = 90;
                next_attach_x = attach_x; next_attach_y = attach_y + 28;
                entry_x = cx; entry_y = cy - 14; exit_x = cx; exit_y = cy + 14;
            }
            
            if (!isDouble) {
                down_count--;
                if (down_count <= 0 && next_dir) {
                    dir = next_dir;
                    next_dir = null;
                }
            }
        }
        
        layout.push({
            ...piece,
            cx, cy, visualW, visualH, rotation, dir,
            entry_x, entry_y, exit_x, exit_y
        });

        attach_x = next_attach_x;
        attach_y = next_attach_y;
    }
    return layout;
}

/* ----------------------------------------------------------
 * 6. واجهة المستخدم وتحديث الشاشة (Rendering) - معدل
 * ---------------------------------------------------------- */
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

    let chainArea = document.getElementById("board-chain");
    if (chainArea) {
        chainArea.innerHTML = "";

        if (boardChain.length === 0) {
            chainArea.innerHTML = `<p style="color:rgba(255,255,255,0.5); font-size:12px; position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);">الطاولة فارغة، اختر حجراً للبدء</p>`;
        } else {
            let layout = calculateSnakeLayout(boardChain);

            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            layout.forEach(item => {
                if (item.cx - item.visualW / 2 < minX) minX = item.cx - item.visualW / 2;
                if (item.cx + item.visualW / 2 > maxX) maxX = item.cx + item.visualW / 2;
                if (item.cy - item.visualH / 2 < minY) minY = item.cy - item.visualH / 2;
                if (item.cy + item.visualH / 2 > maxY) maxY = item.cy + item.visualH / 2;
            });

            let totalW = maxX - minX;
            let totalH = maxY - minY;
            
            let bboxCenterX = minX + totalW / 2;
            let bboxCenterY = minY + totalH / 2;
            let offsetX = -bboxCenterX;
            let offsetY = -bboxCenterY;

            // حساب أبعاد الطاولة ديناميكياً لمنع القص (Cut-off)
            let tableElem = document.querySelector('.poker-table');
            let maxAvailableWidth = tableElem ? tableElem.clientWidth - 40 : 520; 
            let maxAvailableHeight = tableElem ? tableElem.clientHeight - 40 : 200; 

            let scale = 1;
            if (totalW > maxAvailableWidth || totalH > maxAvailableHeight) {
                scale = Math.min(maxAvailableWidth / totalW, maxAvailableHeight / totalH);
                scale = Math.max(scale, 0.25); // السماح بتصغير أكبر لمنع خروج الأحجار
            }

            let first = layout[0];
            let last = layout[layout.length - 1];

            // رسم أزرار تحديد الأطراف ديناميكياً بدون تداخل
            if (selectedTileIndex !== null) {
                let playableEnds = getPlayableEnds(playerHand[selectedTileIndex]);
                if (playableEnds.includes('left')) {
                    let sx = (first.entry_x + offsetX) * scale;
                    let sy = (first.entry_y + offsetY) * scale;
                    if (first.dir === 'RIGHT') sx -= (40 * scale);
                    else if (first.dir === 'LEFT') sx += (40 * scale);
                    else if (first.dir === 'DOWN') sy -= (40 * scale);
                    
                    chainArea.innerHTML += `<div class="end-selector" onclick="selectBoardEnd('left')" style="position:absolute; left:calc(50% + ${sx}px); top:calc(50% + ${sy}px); transform:translate(-50%,-50%) scale(${scale}); z-index:10;">◀ هنا</div>`;
                }
                if (playableEnds.includes('right')) {
                    let sx = (last.exit_x + offsetX) * scale;
                    let sy = (last.exit_y + offsetY) * scale;
                    if (last.dir === 'RIGHT') sx += (40 * scale);
                    else if (last.dir === 'LEFT') sx -= (40 * scale);
                    else if (last.dir === 'DOWN') sy += (40 * scale);

                    chainArea.innerHTML += `<div class="end-selector" onclick="selectBoardEnd('right')" style="position:absolute; left:calc(50% + ${sx}px); top:calc(50% + ${sy}px); transform:translate(-50%,-50%) scale(${scale}); z-index:10;">هنا ▶</div>`;
                }
            }

            // رسم الأحجار
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

function endGame(message) {
    isGameOver = true;
    let endTitle = document.getElementById("end-title");
    if (endTitle) endTitle.innerText = message;
    document.getElementById("end-modal")?.classList.remove("hidden");
}
