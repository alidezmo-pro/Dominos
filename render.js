// render.js
import { state } from './state.js';
import { getPlayableEnds } from './logic.js';
import { updateTurnStatus } from './ui.js';

export function getPieceSquares(in_dir, out_dir, isDouble) {
    let rot = 0, sq1 = { x: 0, y: 0 }, sq2 = { x: 0, y: 0 };
    const HALF_SIZE = 14;
    
    if (in_dir === 'RIGHT') {
        if (!isDouble) { rot = -90; sq1 = { x: -HALF_SIZE, y: 0 }; sq2 = { x: HALF_SIZE, y: 0 }; }
        else { 
            rot = 0; sq1 = { x: 0, y: 0 }; 
            if (out_dir === 'RIGHT') sq2 = { x: 0, y: 0 }; 
            else if (out_dir === 'DOWN') sq2 = { x: 0, y: HALF_SIZE }; 
            else if (out_dir === 'UP') sq2 = { x: 0, y: -HALF_SIZE };
        }
    } else if (in_dir === 'LEFT') {
        if (!isDouble) { rot = 90; sq1 = { x: HALF_SIZE, y: 0 }; sq2 = { x: -HALF_SIZE, y: 0 }; }
        else { 
            rot = 0; sq1 = { x: 0, y: 0 }; 
            if (out_dir === 'LEFT') sq2 = { x: 0, y: 0 }; 
            else if (out_dir === 'DOWN') sq2 = { x: 0, y: HALF_SIZE }; 
            else if (out_dir === 'UP') sq2 = { x: 0, y: -HALF_SIZE };
        }
    } else if (in_dir === 'DOWN') {
        if (!isDouble) { rot = 0; sq1 = { x: 0, y: -HALF_SIZE }; sq2 = { x: 0, y: HALF_SIZE }; }
        else { 
            rot = -90; sq1 = { x: 0, y: 0 }; 
            if (out_dir === 'DOWN') sq2 = { x: 0, y: 0 }; 
            else if (out_dir === 'RIGHT') sq2 = { x: HALF_SIZE, y: 0 }; 
            else if (out_dir === 'LEFT') sq2 = { x: -HALF_SIZE, y: 0 };
        }
    } else if (in_dir === 'UP') {
        if (!isDouble) { rot = 180; sq1 = { x: 0, y: HALF_SIZE }; sq2 = { x: 0, y: -HALF_SIZE }; }
        else { 
            rot = -90; sq1 = { x: 0, y: 0 }; 
            if (out_dir === 'UP') sq2 = { x: 0, y: 0 }; 
            else if (out_dir === 'RIGHT') sq2 = { x: HALF_SIZE, y: 0 }; 
            else if (out_dir === 'LEFT') sq2 = { x: -HALF_SIZE, y: 0 };
        }
    }
    return { rot, sq1, sq2 };
}

export function calculateSnakeLayout(chain, centerIdx) {
    if (!chain || chain.length === 0) return [];
    let dirs = new Array(chain.length - 1);
    
    let MAX_ROW = 8; 
    const screenWidth = window.innerWidth;
    if (screenWidth < 400) {
        MAX_ROW = 2; // الهواتف الضيقة جداً: حجرين
    } else if (screenWidth < 600) {
        MAX_ROW = 3; // الموبايلات العادية: 3 أحجار
    } else if (screenWidth < 850) {
        MAX_ROW = 5; // التابلت
    }
    
    // --- التعديل الجذري: خوارزمية (Zig-Zag) لمنع تداخل الأوراق ---
    let travel = 'RIGHT'; let len = 0; let lastHoriz = 'RIGHT';
    
    // بناء الجانب الأيمن من الطاولة
    for (let i = centerIdx; i < chain.length - 1; i++) {
        dirs[i] = travel; len++;
        if (travel === 'RIGHT' && len >= MAX_ROW) { 
            travel = 'DOWN'; len = 0; lastHoriz = 'RIGHT'; 
        }
        else if (travel === 'LEFT' && len >= MAX_ROW) { 
            travel = 'DOWN'; len = 0; lastHoriz = 'LEFT'; 
        }
        else if (travel === 'DOWN' && len >= 1) { 
            travel = (lastHoriz === 'RIGHT') ? 'LEFT' : 'RIGHT'; len = 0; 
        }
    }
    
    // بناء الجانب الأيسر من الطاولة (بالعكس)
    travel = 'LEFT'; len = 0; lastHoriz = 'LEFT';
    for (let i = centerIdx - 1; i >= 0; i--) {
        dirs[i] = (travel === 'LEFT') ? 'RIGHT' : (travel === 'RIGHT') ? 'LEFT' : (travel === 'UP') ? 'DOWN' : 'UP';
        len++;
        if (travel === 'LEFT' && len >= MAX_ROW) { 
            travel = 'UP'; len = 0; lastHoriz = 'LEFT'; 
        }
        else if (travel === 'RIGHT' && len >= MAX_ROW) { 
            travel = 'UP'; len = 0; lastHoriz = 'RIGHT'; 
        }
        else if (travel === 'UP' && len >= 1) { 
            travel = (lastHoriz === 'LEFT') ? 'RIGHT' : 'LEFT'; len = 0; 
        }
    }

    let layout = [];
    let cx = 0, cy = 0, p_sq2_abs = { x: 0, y: 0 }; 
    const STEP_SIZE = 28;

    for (let i = 0; i < chain.length; i++) {
        let piece = chain[i];
        let isDouble = piece.top === piece.bottom;
        let in_dir = (i === 0) ? (dirs[0] || 'RIGHT') : dirs[i-1];
        let out_dir = (i === chain.length - 1) ? in_dir : dirs[i];
        let trans = getPieceSquares(in_dir, out_dir, isDouble);
        
        if (i === 0) { cx = 0; cy = 0; } else {
            let vec = { x: 0, y: 0 };
            if (dirs[i-1] === 'RIGHT') vec = { x: STEP_SIZE, y: 0 }; 
            else if (dirs[i-1] === 'LEFT') vec = { x: -STEP_SIZE, y: 0 }; 
            else if (dirs[i-1] === 'DOWN') vec = { x: 0, y: STEP_SIZE }; 
            else if (dirs[i-1] === 'UP') vec = { x: 0, y: -STEP_SIZE };
            
            let target_sq1_abs = { x: p_sq2_abs.x + vec.x, y: p_sq2_abs.y + vec.y };
            cx = target_sq1_abs.x - trans.sq1.x; 
            cy = target_sq1_abs.y - trans.sq1.y;
        }
        
        p_sq2_abs = { x: cx + trans.sq2.x, y: cy + trans.sq2.y };
        
        layout.push({
            ...piece, cx: cx, cy: cy, rotation: trans.rot,
            visualW: (trans.rot === 0 || trans.rot === 180) ? STEP_SIZE : (STEP_SIZE * 2), 
            visualH: (trans.rot === 0 || trans.rot === 180) ? (STEP_SIZE * 2) : STEP_SIZE,
            start_x: cx + trans.sq1.x, start_y: cy + trans.sq1.y, end_x: p_sq2_abs.x, end_y: p_sq2_abs.y, 
            in_dir: in_dir, out_dir: out_dir
        });
    }
    return layout;
}

export function renderGame() {
    let playerArea = document.getElementById("player-hand");
    if (playerArea) {
        playerArea.innerHTML = "";
        let canPlayerPlay = (state.currentTurn === 'player');

        state.playerHand.forEach((piece, index) => {
            let ends = getPlayableEnds(piece);
            let isPlayable = canPlayerPlay && (ends.length > 0 || state.boardChain.length === 0);
            let isSelected = (state.selectedTileIndex === index);

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
    if (c1Count) c1Count.innerText = state.comp1Hand.length;
    let c2Count = document.getElementById("comp2-count");
    if (c2Count) c2Count.innerText = state.comp2Hand.length;
    let bCount = document.getElementById("boneyard-count");
    if (bCount) bCount.innerText = state.boneyard.length;

    let chainArea = document.getElementById("board-chain");
    if (chainArea) {
        chainArea.innerHTML = "";
        if (state.boardChain.length === 0) {
            chainArea.innerHTML = `<p style="color:rgba(255,255,255,0.3); font-size:12px; position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);">الطاولة فارغة</p>`;
        } else {
            let layout = calculateSnakeLayout(state.boardChain, state.centerTileIndex);
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
            
            let scale = Math.max(Math.min((maxAvailableWidth / totalW), (maxAvailableHeight / totalH), 1), 0.35);

            let first = layout[0], last = layout[layout.length - 1];

            if (state.selectedTileIndex !== null) {
                let playableEnds = getPlayableEnds(state.playerHand[state.selectedTileIndex]);
                if (playableEnds.includes('left')) {
                    let sx = (first.start_x + offsetX) * scale, sy = (first.start_y + offsetY) * scale;
                    if (first.in_dir === 'RIGHT') sx -= (40 * scale); else if (first.in_dir === 'LEFT') sx += (40 * scale); else if (first.in_dir === 'DOWN') sy -= (40 * scale); else if (first.in_dir === 'UP') sy += (40 * scale);
                    chainArea.innerHTML += `<div class="end-selector" onclick="selectBoardEnd('left')" style="position:absolute; left:calc(50% + ${sx}px); top:calc(50% + ${sy}px); transform:translate(-50%,-50%) scale(${scale}); z-index:100; cursor:pointer; background:var(--accent-player); color:#000; padding:6px 12px; border-radius:8px; font-weight:bold; font-size:14px; box-shadow: 0 4px 10px rgba(14,165,233,0.5);">◀ هنا</div>`;
                }
                if (playableEnds.includes('right')) {
                    let ex = (last.end_x + offsetX) * scale, ey = (last.end_y + offsetY) * scale;
                    if (last.out_dir === 'RIGHT') ex += (40 * scale); else if (last.out_dir === 'LEFT') ex -= (40 * scale); else if (last.out_dir === 'DOWN') ey += (40 * scale); else if (last.out_dir === 'UP') ey -= (40 * scale);
                    chainArea.innerHTML += `<div class="end-selector" onclick="selectBoardEnd('right')" style="position:absolute; left:calc(50% + ${ex}px); top:calc(50% + ${ey}px); transform:translate(-50%,-50%) scale(${scale}); z-index:100; cursor:pointer; background:var(--accent-player); color:#000; padding:6px 12px; border-radius:8px; font-weight:bold; font-size:14px; box-shadow: 0 4px 10px rgba(14,165,233,0.5);">هنا ▶</div>`;
                }
            }

            layout.forEach(item => {
                let px = (item.cx + offsetX) * scale, py = (item.cy + offsetY) * scale;
                chainArea.innerHTML += `
                    <div class="domino-piece" style="position: absolute; left: calc(50% + ${px}px); top: calc(50% + ${py}px); transform: translate(-50%, -50%) scale(${scale}) rotate(${item.rotation}deg);">
                        ${createDotsHTML(item.top)}
                        <div class="divider"></div>
                        ${createDotsHTML(item.bottom)}
                    </div>`;
            });
        }
    }
    
    updateTurnStatus();
    renderAvatarTimer();
}

export function createDotsHTML(value) {
    let dotsHTML = '';
    for (let i = 1; i <= value; i++) dotsHTML += `<div class="dot dot-${i}"></div>`;
    return `<div class="domino-half p-${value}">${dotsHTML}</div>`;
}

export function renderAvatarTimer() {
    // --- التعديل: منع التايمر من التصفير عند السحب من السوق ---
    if (state.skipTimerReset) return; 

    document.querySelectorAll('.timer-ring-wrapper').forEach(el => el.remove());
    document.querySelectorAll('.avatar-timer').forEach(el => el.remove());
    
    if (state.isGameOver) return;

    let activeAvatarContainer = null;
    if (state.currentTurn === 'player') activeAvatarContainer = document.getElementById("player-avatar");
    else if (state.currentTurn === 'comp1') activeAvatarContainer = document.getElementById("comp1-avatar");
    else if (state.currentTurn === 'comp2') activeAvatarContainer = document.getElementById("comp2-avatar");

    if (activeAvatarContainer) {
        let ringWrapper = document.createElement("div");
        ringWrapper.className = "timer-ring-wrapper";
        
        ringWrapper.innerHTML = `
            <svg class="ring-svg" viewBox="0 0 100 100">
                <circle class="ring-bg" cx="50" cy="50" r="48"></circle>
                <circle class="ring-progress" cx="50" cy="50" r="48"></circle>
            </svg>
            <div class="avatar-timer" style="display: none;">${state.timeLeft}</div>
        `;
        activeAvatarContainer.appendChild(ringWrapper);
    }
}
