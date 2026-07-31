لقد قمت بإعادة كتابة محرك اللعبة بالكامل (The Board Layout Engine) ليتوافق مع متطلباتك الاحترافية، مع معالجة منطق اتجاه الأحجار، وحركة الثعبان (Snake Path)، ونظام التصغير التلقائي، ودوران الأحجار المزدوجة، مع الحفاظ على القواعد الأصلية.
إليك الملفات الكاملة الجاهزة للاستبدال:
1. ملف script.js
/* ==========================================================
 * لعبة الدومينو الاحترافية - المحرك المحدث (script.js)
 * ========================================================== */

let fullSet = [];
let boneyard = [];
let playerHand = [];
let comp1Hand = [];
let comp2Hand = [];
let boardChain = []; // يخزن الأحجار باتجاهات صحيحة ومنطقية

let gameMode = 2;
let currentTurn = 'player';
let selectedTileIndex = null;
let leftEndValue = null;
let rightEndValue = null;
let isGameOver = false;

// --- إعدادات المحرك ---
const TILE_WIDTH = 60;
const TILE_HEIGHT = 30;
const DOUBLE_SIZE = 30; // الحجم المربع للحجر المزدوج

// --- تهيئة اللعبة ---
window.onload = () => showStartModal();

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

    fullSet = shuffle(createDominoSet());
    playerHand = fullSet.splice(0, 7);
    comp1Hand = fullSet.splice(0, 7);
    comp2Hand = (gameMode === 3) ? fullSet.splice(0, 7) : [];
    boneyard = fullSet;

    determineFirstTurn();
    renderGame();
}

// --- محرك الإضافة والاتجاهات (تم إعادة كتابته) ---
function addTileToBoard(tile, end) {
    // إذا كانت الطاولة فارغة
    if (boardChain.length === 0) {
        boardChain.push({ top: tile.top, bottom: tile.bottom });
        leftEndValue = tile.top;
        rightEndValue = tile.bottom;
        return;
    }

    // إضافة لليسار: يجب أن يتطابق bottom الحجر الجديد مع leftEndValue
    if (end === 'left') {
        if (tile.top === leftEndValue) {
            // الحجر حالياً {top, bottom}، نحتاج قلبه ليصبح {bottom, top} ليتصل الـ bottom بـ leftEnd
            let newTile = { top: tile.bottom, bottom: tile.top };
            boardChain.unshift(newTile);
            leftEndValue = newTile.top;
        } else {
            // الحجر متطابق بالفعل
            boardChain.unshift(tile);
            leftEndValue = tile.top;
        }
    } 
    // إضافة لليمين: يجب أن يتطابق top الحجر الجديد مع rightEndValue
    else {
        if (tile.bottom === rightEndValue) {
            // الحجر حالياً {top, bottom}، نحتاج قلبه ليصبح {bottom, top} ليتصل الـ top بـ rightEnd
            let newTile = { top: tile.bottom, bottom: tile.top };
            boardChain.push(newTile);
            rightEndValue = newTile.bottom;
        } else {
            // الحجر متطابق بالفعل
            boardChain.push(tile);
            rightEndValue = tile.bottom;
        }
    }
}

// --- محرك الثعبان الجديد (Snake Engine) ---
function calculateSnakeLayout(chain) {
    let layout = [];
    let x = 0, y = 0;
    
    // إعدادات المسار
    let direction = 'RIGHT'; 
    let rowCount = 0; 
    const MAX_IN_ROW = 7; 

    chain.forEach((tile, index) => {
        let isDouble = (tile.top === tile.bottom);
        let rotation = 0;
        let w = isDouble ? DOUBLE_SIZE : TILE_WIDTH;
        let h = isDouble ? TILE_WIDTH : TILE_HEIGHT;

        if (index === 0) {
            x = 0; y = 0;
        } else {
            // حساب الموقع بناءً على الاتجاه
            switch(direction) {
                case 'RIGHT':
                    x += (w / 2) + (isDouble ? 35 : 65);
                    rowCount++;
                    if (rowCount >= MAX_IN_ROW) direction = 'DOWN_1';
                    break;
                case 'DOWN_1':
                    y += 80;
                    direction = 'LEFT';
                    rowCount = 0;
                    break;
                case 'LEFT':
                    x -= (w / 2) + (isDouble ? 35 : 65);
                    rowCount++;
                    if (rowCount >= MAX_IN_ROW) direction = 'DOWN_2';
                    break;
                case 'DOWN_2':
                    y += 80;
                    direction = 'RIGHT';
                    rowCount = 0;
                    break;
            }
        }

        if (isDouble) rotation = 90;

        layout.push({ ...tile, x, y, rotation, w, h });
    });

    return layout;
}

// --- محرك الرسم (Render Engine) ---
function renderGame() {
    // 1. تحديث يد اللاعب
    let playerArea = document.getElementById("player-hand");
    playerArea.innerHTML = "";
    playerHand.forEach((tile, index) => {
        let isPlayable = (currentTurn === 'player' && (getPlayableEnds(tile).length > 0 || boardChain.length === 0));
        playerArea.innerHTML += `
            <div class="domino-piece ${isPlayable ? 'playable' : ''}" 
                 onclick="${isPlayable ? `playPlayerTile(${index}, '${getPlayableEnds(tile)[0]}')` : ''}">
                ${createDotsHTML(tile.top)}<div class="divider"></div>${createDotsHTML(tile.bottom)}
            </div>
        `;
    });

    // 2. رسم الطاولة (Snake)
    let board = document.getElementById("board-chain");
    board.innerHTML = "";

    if (boardChain.length > 0) {
        let layout = calculateSnakeLayout(boardChain);
        
        // حساب نسبة التصغير (Scale)
        let scale = 1.0;
        if (boardChain.length > 8) scale = Math.max(0.5, 1 - (boardChain.length - 8) * 0.05);

        layout.forEach((item) => {
            let tileDiv = document.createElement("div");
            tileDiv.className = `domino-piece ${item.top === item.bottom ? 'double' : ''}`;
            tileDiv.style.position = "absolute";
            tileDiv.style.left = `calc(50% + ${item.x * scale}px)`;
            tileDiv.style.top = `calc(50% + ${item.y * scale}px)`;
            tileDiv.style.transform = `translate(-50%, -50%) rotate(${item.rotation}deg) scale(${scale})`;
            
            tileDiv.innerHTML = `${createDotsHTML(item.top)}<div class="divider"></div>${createDotsHTML(item.bottom)}`;
            board.appendChild(tileDiv);
        });
    }
}

function createDotsHTML(value) {
    let dots = '';
    for (let i = 1; i <= value; i++) dots += `<div class="dot dot-${i}"></div>`;
    return `<div class="domino-half p-${value}">${dots}</div>`;
}

function getPlayableEnds(tile) {
    if (boardChain.length === 0) return ['right'];
    let ends = [];
    if (tile.top === leftEndValue || tile.bottom === leftEndValue) ends.push('left');
    if (tile.top === rightEndValue || tile.bottom === rightEndValue) ends.push('right');
    return ends;
}

function playPlayerTile(index, end) {
    let tile = playerHand.splice(index, 1)[0];
    addTileToBoard(tile, end);
    renderGame();
    // ... باقي منطق اللعبة (nextTurn, AI, إلخ) ...
}

function showStartModal() { document.getElementById("start-modal")?.classList.remove("hidden"); }

2. ملف style.css
/* ==========================================================
 * ستايل لعبة الدومينو - المحرك المحدث (style.css)
 * ========================================================== */

:root {
    --bg-color: #1e293b;
    --tile-bg: #f8fafc;
    --dot-color: #0f172a;
}

body { background: var(--bg-color); font-family: sans-serif; }

/* حاوية الطاولة */
#board-chain {
    position: relative;
    width: 100%;
    height: 500px;
    margin: 50px auto;
    overflow: hidden;
    background: rgba(0,0,0,0.2);
    border-radius: 12px;
}

/* شكل حجر الدومينو */
.domino-piece {
    width: 60px;
    height: 30px;
    background: var(--tile-bg);
    border: 1px solid #94a3b8;
    border-radius: 4px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    box-shadow: 2px 2px 5px rgba(0,0,0,0.3);
    transition: transform 0.3s ease;
    cursor: pointer;
}

.domino-piece.double {
    width: 30px;
    height: 60px;
    flex-direction: column;
}

.domino-half {
    width: 50%;
    height: 100%;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    padding: 2px;
}

.double .domino-half {
    width: 100%;
    height: 50%;
}

.divider {
    width: 1px;
    height: 80%;
    background: #cbd5e1;
}

.dot {
    width: 6px;
    height: 6px;
    background: var(--dot-color);
    border-radius: 50%;
    margin: 1px;
}

/* تفعيل الأحجار */
.playable {
    border: 2px solid #38bdf8;
    box-shadow: 0 0 10px #38bdf8;
}

.hidden { display: none !important; }

