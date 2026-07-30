// =========================================================
// 1. المتغيرات الأساسية وحالة اللعبة (Game State)
// =========================================================
let gameMode = 2;          // عدد اللاعبين (2 أو 3)
let fullDeck = [];          // الطقم الكامل (28 حجراً)
let playerHand = [];        // أحجار اللاعب (أنت)
let comp1Hand = [];         // أحجار الكمبيوتر 1
let comp2Hand = [];         // أحجار الكمبيوتر 2
let boneyard = [];          // أحجار السوق (السحبة)
let boardChain = [];        // الأحجار الملعوبة على الطاولة
let currentTurn = 'player'; // تحديد الدور الحالي: 'player', 'comp1', 'comp2'
let boardLeft = null;       // الرقم المفتوح على الطرف الأيسر للطاولة
let boardRight = null;      // الرقم المفتوح على الطرف الأيمن للطاولة

// =========================================================
// 2. إدارة وضع اللعبة والنوافذ المنبثقة
// =========================================================
function showModeModal() {
    document.getElementById('mode-modal').classList.remove('hidden');
}

function selectGameMode(mode) {
    gameMode = mode;
    document.getElementById('mode-modal').classList.add('hidden');
    
    // إظهار أو إخفاء حاوية المنافس الثاني بناءً على الخيار
    let comp2Container = document.getElementById('comp2-container');
    if (mode === 3) {
        comp2Container.classList.remove('hidden');
    } else {
        comp2Container.classList.add('hidden');
    }
    
    startGame();
}

// =========================================================
// 3. إنشاء الأحجار وخلطها عشوائياً (Fisher-Yates)
// =========================================================
function createFullDeck() {
    fullDeck = [];
    for (let top = 0; top <= 6; top++) {
        for (let bottom = top; bottom <= 6; bottom++) {
            fullDeck.push({ top: top, bottom: bottom });
        }
    }
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

// =========================================================
// 4. دالة بدء لعبة جديدة والتوزيع
// =========================================================
function startGame() {
    createFullDeck();
    shuffleDeck(fullDeck);

    // توزيع 7 أحجار لكل لاعب
    playerHand = fullDeck.splice(0, 7);
    comp1Hand = fullDeck.splice(0, 7);
    
    if (gameMode === 3) {
        comp2Hand = fullDeck.splice(0, 7);
    } else {
        comp2Hand = [];
    }

    // الأحجار المتبقية تذهب للسوق
    boneyard = fullDeck;
    boardChain = [];
    boardLeft = null;
    boardRight = null;
    currentTurn = 'player';

    renderGame();
    checkPlayerPlayableTiles();
}

// =========================================================
// 5. فحص مطابقة الأحجار مع طرفي الطاولة
// =========================================================
function getPlayableEnds(tile) {
    if (boardChain.length === 0) return ['any'];
    
    let ends = [];
    if (tile.top === boardLeft || tile.bottom === boardLeft) ends.push('left');
    if (tile.top === boardRight || tile.bottom === boardRight) ends.push('right');
    
    return ends;
}

function hasValidMove(hand) {
    if (boardChain.length === 0) return true;
    return hand.some(tile => getPlayableEnds(tile).length > 0);
}

// =========================================================
// 6. تنفيذ لعب الحجر وإضافته للسلسلة أفقياً
// =========================================================
function playTile(handOwner, tileIndex, targetEnd = 'auto') {
    let hand = handOwner === 'player' ? playerHand : (handOwner === 'comp1' ? comp1Hand : comp2Hand);
    let tile = hand[tileIndex];
    let ends = getPlayableEnds(tile);

    if (ends.length === 0 && boardChain.length > 0) return false;

    // تحديد الطرف المستهدف للعب
    let chosenEnd = targetEnd;
    if (chosenEnd === 'auto') {
        chosenEnd = ends.includes('left') ? 'left' : 'right';
    }

    // اقتطاع الحجر من يد اللاعب
    hand.splice(tileIndex, 1);

    // ربط الحجر بالطرف المناسب وتدويره إن لزم الأمر
    if (boardChain.length === 0) {
        boardLeft = tile.top;
        boardRight = tile.bottom;
        boardChain.push(tile);
    } else if (chosenEnd === 'left') {
        if (tile.bottom === boardLeft) {
            boardLeft = tile.top;
            boardChain.unshift(tile);
        } else {
            let flipped = { top: tile.bottom, bottom: tile.top };
            boardLeft = flipped.top;
            boardChain.unshift(flipped);
        }
    } else if (chosenEnd === 'right') {
        if (tile.top === boardRight) {
            boardRight = tile.bottom;
            boardChain.push(tile);
        } else {
            let flipped = { top: tile.bottom, bottom: tile.top };
            boardRight = flipped.bottom;
            boardChain.push(flipped);
        }
    }

    renderGame();

    // التحقق من الفوز
    if (checkWinner(handOwner)) return true;

    // نقل الدور لللاعب التالي
    advanceTurn();
    return true;
}

// =========================================================
// 7. آلية السحب من السوق (عند عدم وجود أحجار مطابقة)
// =========================================================
function drawFromBoneyard() {
    if (currentTurn !== 'player') return;

    // منع السحب إذا كان اللاعب يمتلك أحجاراً صالحة بالفعل
    if (hasValidMove(playerHand)) {
        alert("لديك حجر مناسب في يدك! قم ببلعبه أولاً.");
        return;
    }

    if (boneyard.length > 0) {
        let drawnTile = boneyard.pop();
        playerHand.push(drawnTile);
        renderGame();
        checkPlayerPlayableTiles();
    } else {
        alert("السوق فارغ! تم نقل الدور للمنافس.");
        advanceTurn();
    }
}

// =========================================================
// 8. الذكاء الاصطناعي للكمبيوتر وإدارة الأدوار
// =========================================================
function advanceTurn() {
    if (currentTurn === 'player') {
        currentTurn = 'comp1';
        setTimeout(playComputerTurn, 1000);
    } else if (currentTurn === 'comp1') {
        if (gameMode === 3) {
            currentTurn = 'comp2';
            setTimeout(playComputerTurn, 1000);
        } else {
            currentTurn = 'player';
            checkPlayerPlayableTiles();
        }
    } else if (currentTurn === 'comp2') {
        currentTurn = 'player';
        checkPlayerPlayableTiles();
    }
    updateTurnBanner();
}

function playComputerTurn() {
    let hand = currentTurn === 'comp1' ? comp1Hand : comp2Hand;

    // البحث عن حجر صالح للعب
    let validIndex = hand.findIndex(tile => getPlayableEnds(tile).length > 0);

    if (validIndex !== -1) {
        playTile(currentTurn, validIndex, 'auto');
    } else {
        // إذا لم يجد حجر، يسحب من السوق
        if (boneyard.length > 0) {
            let drawnTile = boneyard.pop();
            hand.push(drawnTile);
            renderGame();
            setTimeout(playComputerTurn, 800);
        } else {
            // تفويت الدور إن كان السوق فارغاً
            advanceTurn();
        }
    }
}

// =========================================================
// 9. رسم الشاشة وإنشاء العناصر (UI Rendering)
// =========================================================
function createDotsHTML(number) {
    if (number === 0) return `<div class="domino-half p-0"></div>`;
    let dotsHTML = '';
    for (let i = 1; i <= number; i++) {
        dotsHTML += `<div class="dot dot-${i}"></div>`;
    }
    return `<div class="domino-half p-${number}">${dotsHTML}</div>`;
}

function renderGame() {
    // أ. عرض أحجار اللاعب وتحديد الأحجار القابلة للعب
    let playerArea = document.getElementById("player-hand");
    playerArea.innerHTML = "";
    let canPlayerPlay = (currentTurn === 'player');

    playerHand.forEach((piece, index) => {
        let ends = getPlayableEnds(piece);
        let isPlayable = canPlayerPlay && (ends.length > 0 || boardChain.length === 0);
        
        let topHalf = createDotsHTML(piece.top);
        let bottomHalf = createDotsHTML(piece.bottom);
        
        playerArea.innerHTML += `
            <div class="domino-piece ${isPlayable ? 'playable' : ''}" 
                 onclick="${isPlayable ? `onPlayerTileClick(${index})` : ''}">
                ${topHalf}
                <div class="divider"></div>
                ${bottomHalf}
            </div>
        `;
    });

    // ب. عرض أحجار الكمبيوتر 1 (مخفية)
    let comp1Area = document.getElementById("comp1-hand");
    comp1Area.innerHTML = "";
    comp1Hand.forEach(() => {
        comp1Area.innerHTML += `<div class="domino-piece hidden-back"></div>`;
    });
    document.getElementById("comp1-count").innerText = `${comp1Hand.length} أحجار`;

    // ج. عرض أحجار الكمبيوتر 2 (في حال نظام 3 لاعبين)
    if (gameMode === 3) {
        let comp2Area = document.getElementById("comp2-hand");
        comp2Area.innerHTML = "";
        comp2Hand.forEach(() => {
            comp2Area.innerHTML += `<div class="domino-piece hidden-back"></div>`;
        });
        document.getElementById("comp2-count").innerText = `${comp2Hand.length} أحجار`;
    }

    // د. تحديث شارة السوق
    let boneyardTag = document.getElementById("boneyard-info");
    boneyardTag.innerText = `السوق 📦: ${boneyard.length}`;
    boneyardTag.onclick = drawFromBoneyard;

    // هـ. عرض السلسلة الملعوبة على الطاولة أفقياً
    let chainArea = document.getElementById("board-chain");
    chainArea.innerHTML = "";

    if (boardChain.length === 0) {
        chainArea.innerHTML = `<p class="empty-msg">الطاولة فارغة، اضغط على أحد أحجارك لبدء السلسلة</p>`;
    } else {
        boardChain.forEach(piece => {
            let topHalf = createDotsHTML(piece.top);
            let bottomHalf = createDotsHTML(piece.bottom);
            chainArea.innerHTML += `
                <div class="domino-piece horizontal">
                    ${topHalf}
                    <div class="divider"></div>
                    ${bottomHalf}
                </div>
            `;
        });
    }

    updateTurnBanner();
}

function onPlayerTileClick(index) {
    if (currentTurn !== 'player') return;
    let tile = playerHand[index];
    let ends = getPlayableEnds(tile);

    if (ends.length > 1) {
        // خيار للعب على الطرف الأيمن أم الأيسر إذا كان الحجر يناسب الطرفين
        let choice = confirm("اضغط OK للعب الحجر على الطرف الأيمن، أو Cancel للطرف الأيسر.");
        playTile('player', index, choice ? 'right' : 'left');
    } else {
        playTile('player', index, ends[0]);
    }
}

function checkPlayerPlayableTiles() {
    let boneyardTag = document.getElementById("boneyard-info");
    if (currentTurn === 'player' && !hasValidMove(playerHand) && boneyard.length > 0) {
        boneyardTag.classList.add("draw-pulse");
    } else {
        boneyardTag.classList.remove("draw-pulse");
    }
}

function updateTurnBanner() {
    let banner = document.getElementById("turn-display");
    let statusTag = document.getElementById("player-status-tag");
    
    if (currentTurn === 'player') {
        banner.innerText = "دورك للعب الآن 🎯";
        banner.style.color = "#48cae4";
        if(statusTag) statusTag.innerText = "دورك";
    } else if (currentTurn === 'comp1') {
        banner.innerText = "يفكر الكمبيوتر 1 🤖...";
        banner.style.color = "#f7d070";
        if(statusTag) statusTag.innerText = "انتظار";
    } else if (currentTurn === 'comp2') {
        banner.innerText = "يفكر الكمبيوتر 2 🤖...";
        banner.style.color = "#f7d070";
        if(statusTag) statusTag.innerText = "انتظار";
    }
}

function checkWinner(lastPlayer) {
    let hand = lastPlayer === 'player' ? playerHand : (lastPlayer === 'comp1' ? comp1Hand : comp2Hand);
    if (hand.length === 0) {
        let name = lastPlayer === 'player' ? 'أنت 🎉' : (lastPlayer === 'comp1' ? 'الكمبيوتر 1 🤖' : 'الكمبيوتر 2 🤖');
        setTimeout(() => {
            alert(`🏆 مبروك! الفائز باللعبة هو: ${name}`);
            showModeModal();
        }, 300);
        return true;
    }
    return false;
}

// تشغيل الشاشة عند تحميل الملف
window.onload = function() {
    showModeModal();
};
