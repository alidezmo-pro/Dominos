/* ==========================================================
 * script.js - محرك اللعب المطور (مع التايمر، النيون، وانحناء S المزدوج)
 * ========================================================== */

/* ----------------------------------------------------------
 * 1. المتغيرات العامة للعبة
 * ---------------------------------------------------------- */
let fullSet = [];          
let boneyard = [];         
let playerHand = [];       
let comp1Hand = [];        
let comp2Hand = [];        
let boardChain = [];       

let gameMode = 2;          
let currentTurn = 'player';
let selectedTileIndex = null; 

let leftEndValue = null;   
let rightEndValue = null;  
let isGameOver = false;

// متغير جديد لتتبع ورقة المركز (نقطة الانطلاق)[span_0](start_span)[span_0](end_span)
let centerTileIndex = 0;

// متغيرات التايمر[span_1](start_span)[span_1](end_span)
let turnTimerInterval;
let timeLeft = 25;

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
    centerTileIndex = 0; // تصفير المركز[span_2](start_span)[span_2](end_span)
    leftEndValue = null;
    rightEndValue = null;
    clearInterval(turnTimerInterval);

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

/* ----------------------------------------------------------
 * 3. نظام التايمر وإضاءة النيون
 * ---------------------------------------------------------- */
function startTimer() {
    clearInterval(turnTimerInterval);
    timeLeft = 25;
    let timerElem = document.getElementById("turn-timer");
    
    if(timerElem) {
        timerElem.classList.remove("hidden");
        timerElem.innerText = `⏳ ${timeLeft}`;
        timerElem.style.color = "#ef4444";
    }

    turnTimerInterval = setInterval(() => {
        timeLeft--;
        if(timerElem) {
            timerElem.innerText = `⏳ ${timeLeft}`;
            if (timeLeft <= 5) timerElem.style.color = (timeLeft % 2 === 0) ? "#ffffff" : "#ef4444";
        }
        
        if (timeLeft <= 0) {
            clearInterval(turnTimerInterval);
            handleTimeOut();
        }
    }, 1000);
}

function handleTimeOut() {
    if (currentTurn === 'player' && !isGameOver) {
        let playableIndices = [];
        playerHand.forEach((tile, idx) => {
            let ends = getPlayableEnds(tile);
            if (ends.length > 0 || boardChain.length === 0) {
                playableIndices.push({ index: idx, ends: ends });
            }
        });

        if (playableIndices.length > 0) {
            let chosen = playableIndices[Math.floor(Math.random() * playableIndices.length)];
            playPlayerTile(chosen.index, chosen.ends[0]);
        } else if (boneyard.length > 0) {
            drawFromBoneyard();
            setTimeout(nextTurn, 500); 
        } else {
            nextTurn();
        }
    }
}

function updateTurnStatus() {
    if (isGameOver) {
        clearInterval(turnTimerInterval);
        document.getElementById("turn-timer")?.classList.add("hidden");
        return;
    }

    document.getElementById("player-avatar")?.classList.remove("active-neon-player");
    document.getElementById("comp1-avatar")?.classList.remove("active-neon-comp");
    document.getElementById("comp2-avatar")?.classList.remove("active-neon-comp");

    if (currentTurn === 'player') {
        document.getElementById("player-avatar")?.classList.add("active-neon-player");
    } else if (currentTurn === 'comp1') {
        document.getElementById("comp1-avatar")?.classList.add("active-neon-comp");
    } else if (currentTurn === 'comp2') {
        document.getElementById("comp2-avatar")?.classList.add("active-neon-comp");
    }

    startTimer();
}

/* ----------------------------------------------------------
 * 4. منطق اللعب للأطراف وحركة اللاعب
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
        centerTileIndex = 0; // تعيين المركز لأول ورقة[span_3](start_span)[span_3](end_span)
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
        // تم إضافة ورقة على اليسار، لذا فهرس المركز يتزحزح يميناً خطوة[span_4](start_span)[span_4](end_span)
        centerTileIndex++; 
    } else {
        let orientedTile = (tile.top === rightEndValue) 
            ? { top: tile.top, bottom: tile.bottom } 
            : { top: tile.bottom, bottom: tile.top };
        rightEndValue = orientedTile.bottom;
        boardChain.push(orientedTile);
        // تم الإضافة لليمين، المركز لا يتغير مكانه[span_5](start_span)[span_5](end_span)
    }
}

/* ----------------------------------------------------------
 * 5. إدارة الأدوار والذكاء الاصطناعي والسوق
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
 * 6. محرك الـ S المزدوج (الرسم والتخطيط على الطاولة)
 * ========================================================== */

// دالة مساعدة لحساب إحداثيات قطعة واحدة بناءً على الاتجاه[span_6](start_span)[span_6](end_span)
function plotTilePiece(piece, dir, attach_x, attach_y, isDouble) {
    let cx, cy, visualW, visualH, rotation, next_attach_x, next_attach_y, entry_x, entry_y, exit_x, exit_y;
    
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
    } else if (dir === 'UP') { // اتجاه جديد مخصص للجانب الأيسر
        if (!isDouble) {
            cx = attach_x; cy = attach_y - 14;
            visualW = 28; visualH = 56; rotation = 0; 
            next_attach_x = attach_x; next_attach_y = attach_y - 56;
            entry_x = cx; entry_y = cy + 28; exit_x = cx; exit_y = cy - 28;
        } else {
            cx = attach_x; cy = attach_y;
            visualW = 56; visualH = 28; rotation = 90; 
            next_attach_x = attach_x; next_attach_y = attach_y - 28;
            entry_x = cx; entry_y = cy + 14; exit_x = cx; exit_y = cy - 14;
        }
    }
    
    return {
        ...piece, cx, cy, visualW, visualH, rotation, dir,
        entry_x, entry_y, exit_x, exit_y, next_attach_x, next_attach_y
    };
}

function calculateSnakeLayout(chain, centerIdx) {
    if (!chain || chain.length === 0) return [];
    
    let layout = new Array(chain.length);
    let ROW_LIMIT = 250; // تقليل المسافة قليلاً ليناسب انحناء S المزدوج للشاشات
    
    // 1. وضع حجر المركز
    let centerPiece = chain[centerIdx];
    let isCenterDouble = (centerPiece.top === centerPiece.bottom);
    
    let cx = 0, cy = 0;
    let rotation = isCenterDouble ? 0 : -90;
    let visualW = isCenterDouble ? 28 : 56;
    let visualH = isCenterDouble ? 56 : 28;
    
    let right_attach_x = isCenterDouble ? 14 : 28;
    let left_attach_x = isCenterDouble ? -14 : -28;

    layout[centerIdx] = {
        ...centerPiece, cx, cy, visualW, visualH, rotation,
        entry_x: left_attach_x, entry_y: 0,
        exit_x: right_attach_x, exit_y: 0,
        dir: 'CENTER'
    };

    // 2. رسم الجانب الأيمن (ينحني للأسفل DOWN)
    let dir = 'RIGHT';
    let attach_x = right_attach_x;
    let attach_y = 0;
    let down_count = 0;
    let next_dir = null;

    for (let i = centerIdx + 1; i < chain.length; i++) {
        let piece = chain[i];
        let isDouble = (piece.top === piece.bottom);
        
        if (dir === 'RIGHT' && attach_x > ROW_LIMIT && !isDouble) {
            dir = 'DOWN'; down_count = 2; next_dir = 'LEFT';
        } else if (dir === 'LEFT' && attach_x < -ROW_LIMIT && !isDouble) {
            dir = 'DOWN'; down_count = 2; next_dir = 'RIGHT';
        }

        let result = plotTilePiece(piece, dir, attach_x, attach_y, isDouble);
        layout[i] = result;
        attach_x = result.next_attach_x;
        attach_y = result.next_attach_y;

        if (dir === 'DOWN' && !isDouble) {
            down_count--;
            if (down_count <= 0 && next_dir) {
                dir = next_dir; next_dir = null;
            }
        }
    }

    // 3. رسم الجانب الأيسر (ينحني للأعلى UP لتجنب التداخل)
    dir = 'LEFT';
    attach_x = left_attach_x;
    attach_y = 0;
    let up_count = 0;
    next_dir = null;

    for (let i = centerIdx - 1; i >= 0; i--) {
        let piece = chain[i];
        let isDouble = (piece.top === piece.bottom);

        // هنا نراقب الحدود ولكن بالاتجاه المعاكس[span_7](start_span)[span_7](end_span)
        if (dir === 'LEFT' && attach_x < -ROW_LIMIT && !isDouble) {
            dir = 'UP'; up_count = 2; next_dir = 'RIGHT';
        } else if (dir === 'RIGHT' && attach_x > ROW_LIMIT && !isDouble) {
            dir = 'UP'; up_count = 2; next_dir = 'LEFT';
        }

        let result = plotTilePiece(piece, dir, attach_x, attach_y, isDouble);
        
        // بما أننا نبني للخلف، نقطة الدخول تصبح خروج والعكس صحيح
        let tempX = result.entry_x; let tempY = result.entry_y;
        result.entry_x = result.exit_x; result.entry_y = result.exit_y;
        result.exit_x = tempX; result.exit_y = tempY;

        layout[i] = result;
        attach_x = result.next_attach_x;
        attach_y = result.next_attach_y;

        if (dir === 'UP' && !isDouble) {
            up_count--;
            if (up_count <= 0 && next_dir) {
                dir = next_dir; next_dir = null;
            }
        }
    }

    return layout;
}

/* ----------------------------------------------------------
 * 7. واجهة المستخدم وتحديث الشاشة (Rendering)
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
            chainArea.innerHTML = `<p style="color:rgba(255,255,255,0.3); font-size:12px; position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);">الطاولة فارغة</p>`;
        } else {
            // إرسال المصفوفة مع مؤشر المركز[span_8](start_span)[span_8](end_span)
            let layout = calculateSnakeLayout(boardChain, centerTileIndex);

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

            let tableElem = document.querySelector('.poker-table');
            let maxAvailableWidth = tableElem ? tableElem.clientWidth - 40 : 520; 
            let maxAvailableHeight = tableElem ? tableElem.clientHeight - 40 : 200; 

            let scale = 1;
            if (totalW > maxAvailableWidth || totalH > maxAvailableHeight) {
                scale = Math.min(maxAvailableWidth / totalW, maxAvailableHeight / totalH);
                scale = Math.max(scale, 0.25); 
            }

            let first = layout[0];
            let last = layout[layout.length - 1];

            if (selectedTileIndex !== null) {
                let playableEnds = getPlayableEnds(playerHand[selectedTileIndex]);
                if (playableEnds.includes('left')) {
                    // الاعتماد على نقطة الخروج للجهة اليسرى[span_9](start_span)[span_9](end_span)
                    let sx = (first.exit_x + offsetX) * scale;
                    let sy = (first.exit_y + offsetY) * scale;
                    if (first.dir === 'LEFT') sx -= (40 * scale);
                    else if (first.dir === 'RIGHT') sx += (40 * scale);
                    else if (first.dir === 'UP') sy -= (40 * scale);
                    else if (first.dir === 'DOWN') sy += (40 * scale);
                    
                    chainArea.innerHTML += `<div class="end-selector" onclick="selectBoardEnd('left')" style="position:absolute; left:calc(50% + ${sx}px); top:calc(50% + ${sy}px); transform:translate(-50%,-50%) scale(${scale}); z-index:10;">◀ هنا</div>`;
                }
                if (playableEnds.includes('right')) {
                    // الاعتماد على نقطة الخروج للجهة اليمنى[span_10](start_span)[span_10](end_span)
                    let sx = (last.exit_x + offsetX) * scale;
                    let sy = (last.exit_y + offsetY) * scale;
                    if (last.dir === 'RIGHT') sx += (40 * scale);
                    else if (last.dir === 'LEFT') sx -= (40 * scale);
                    else if (last.dir === 'UP') sy -= (40 * scale);
                    else if (last.dir === 'DOWN') sy += (40 * scale);

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

function endGame(message) {
    isGameOver = true;
    clearInterval(turnTimerInterval); 
    document.getElementById("turn-timer")?.classList.add("hidden"); 

    let endTitle = document.getElementById("end-title");
    if (endTitle) endTitle.innerText = message;
    document.getElementById("end-modal")?.classList.remove("hidden");
}
