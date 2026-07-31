/**
 * لعبة الدومينو الاحترافية - Dominoes Game Script
 * يحتوي هذا الملف على المنطق الكامل للعبة:
 * 1. إدارة الأحجار والسوق واللاعبين.
 * 2. الترتيب الذكي للأوراق على الطاولة.
 * 3. معالجة الخيارات والتفاعل بدون رسائل منبثقة مزعجة (alert/confirm).
 * 4. حساب الفائز بأقل النقاط عند قفل اللعبة.
 */

// Global Variables - المتغيرات العامة
let gameMode = 2; // عدد اللاعبين الافتراضي (2 أو 3)
let fullDeck = [];
let playerHand = [];
let comp1Hand = [];
let comp2Hand = [];
let boneyard = [];
let boardChain = [];

let currentTurn = 'player'; // 'player', 'comp1', 'comp2'
let boardLeft = null;
let boardRight = null;

// متغير للتحكم في اختيار الطرف عند وجود خيارين للاعب
let selectedTileIndex = null;

// ==========================================
// 1. بدء اللعبة والتهيئة (Initialization)
// ==========================================

function showModeModal() {
    document.getElementById('mode-modal').classList.remove('hidden');
    let drawModal = document.getElementById('draw-modal');
    if (drawModal) drawModal.classList.add('hidden');
}

function selectGameMode(mode) {
    gameMode = mode;
    document.getElementById('mode-modal').classList.add('hidden');
    let comp2Badge = document.getElementById('comp2-badge');
    if (comp2Badge) {
        if (mode === 3) comp2Badge.classList.remove('hidden');
        else comp2Badge.classList.add('hidden');
    }
    startGame();
}

document.addEventListener('DOMContentLoaded', () => {
    const restartBtn = document.querySelector('.restart-btn');
    if (restartBtn) restartBtn.addEventListener('click', showModeModal);
});

// إنشاء أحجار الدومينو (28 حجر من 0-0 إلى 6-6)
function createFullDeck() {
    fullDeck = [];
    for (let top = 0; top <= 6; top++) {
        for (let bottom = top; bottom <= 6; bottom++) {
            fullDeck.push({ top: top, bottom: bottom });
        }
    }
}

// خلط الأحجار عشوائياً
function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

// بدء جولة جديدة
function startGame() {
    createFullDeck();
    shuffleDeck(fullDeck);

    // توزيع 7 أحجار لكل لاعب
    playerHand = fullDeck.splice(0, 7);
    comp1Hand = fullDeck.splice(0, 7);
    comp2Hand = (gameMode === 3) ? fullDeck.splice(0, 7) : [];
    boneyard = fullDeck; // الباقي في السوق

    boardChain = [];
    boardLeft = null;
    boardRight = null;
    selectedTileIndex = null;
    currentTurn = 'player';

    renderGame();
    checkTurnMove();
}

// ==========================================
// 2. منطق اللعب والأدوار (Game Logic)
// ==========================================

// فحص الأطراف المتاحة لحجر معين
function getPlayableEnds(tile) {
    if (boardChain.length === 0) return ['any'];
    let ends = [];
    if (tile.top === boardLeft || tile.bottom === boardLeft) ends.push('left');
    if (tile.top === boardRight || tile.bottom === boardRight) ends.push('right');
    return ends;
}

// فحص هل يمتلك اللاعب حركة صالحة
function hasValidMove(hand) {
    if (boardChain.length === 0) return true;
    return hand.some(tile => getPlayableEnds(tile).length > 0);
}

// لعب حجر على الطاولة
function playTile(handOwner, tileIndex, chosenEnd) {
    let hand = (handOwner === 'player') ? playerHand : ((handOwner === 'comp1') ? comp1Hand : comp2Hand);
    let tile = hand[tileIndex];

    hand.splice(tileIndex, 1);

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

    selectedTileIndex = null;
    renderGame();

    // فحص الفوز بالتخلص من جميع الأحجار
    if (checkHandEmptyWin(handOwner)) return;

    // الانتقال للدور التالي
    advanceTurn();
}

// نقل الدور للاعب التالي
function advanceTurn() {
    if (currentTurn === 'player') currentTurn = 'comp1';
    else if (currentTurn === 'comp1') currentTurn = (gameMode === 3) ? 'comp2' : 'player';
    else if (currentTurn === 'comp2') currentTurn = 'player';

    renderGame();

    // فحص هل اللعبة مقفلة بالكامل
    if (checkBlockedGame()) return;

    if (currentTurn !== 'player') {
        setTimeout(playComputerTurn, 1000);
    } else {
        checkTurnMove();
    }
}

// دور الكمبيوتر الذكي
function playComputerTurn() {
    let hand = (currentTurn === 'comp1') ? comp1Hand : comp2Hand;
    let validIndex = hand.findIndex(tile => getPlayableEnds(tile).length > 0);

    if (validIndex !== -1) {
        let tile = hand[validIndex];
        let ends = getPlayableEnds(tile);
        playTile(currentTurn, validIndex, ends[0]);
    } else {
        // إذا لم يجد حجر والسوق فيه أحجار، يسحب من السوق
        if (boneyard.length > 0) {
            hand.push(boneyard.pop());
            renderGame();
            setTimeout(playComputerTurn, 600);
        } else {
            // تجاوز الدور بسلاسة بدون رسائل alert
            updateTurnStatus(`${currentTurn === 'comp1' ? 'الكمبيوتر 1' : 'الكمبيوتر 2'} لا يملك حجر وتم تمرير دوره.`);
            setTimeout(advanceTurn, 1200);
        }
    }
}

// فحص دور اللاعب وسحبه التلقائي من السوق عند عدم وجود حركات
function checkTurnMove() {
    if (currentTurn === 'player') {
        if (!hasValidMove(playerHand)) {
            if (boneyard.length > 0) {
                // سحب تلقائي بدون ظهور نافذةalert/modal
                playerHand.push(boneyard.pop());
                renderGame();
                updateTurnStatus("لا تملك حجر مناسب، تم السحب من السوق تلقائياً 🂠");
                setTimeout(checkTurnMove, 800);
            } else {
                updateTurnStatus("لا تملك حجر للعب والسوق فارغ.. تم تمرير دورك ⏩");
                setTimeout(advanceTurn, 1500);
            }
        }
    }
}

// تفاعل اللاعب عند النقر على حجر من يده
function onPlayerTileClick(index) {
    if (currentTurn !== 'player') return;

    let tile = playerHand[index];
    let ends = getPlayableEnds(tile);

    if (ends.length === 0) return;

    if (boardChain.length === 0) {
        playTile('player', index, 'any');
    } else if (ends.length === 1) {
        playTile('player', index, ends[0]);
    } else if (ends.length > 1) {
        // في حالة وجود خيارين (يمين ويسار)، نحدد الكارت المختار ونطلب النقر على الطرف
        selectedTileIndex = index;
        renderGame();
        updateTurnStatus("اختر الطرف الذي تريد اللعب عليه (انقر على اليمين أو اليسار) 👈👉");
    }
}

// عند اختيار الطرف بالنقر المباشر على الطاولة
function selectBoardEnd(end) {
    if (selectedTileIndex !== null && currentTurn === 'player') {
        let tile = playerHand[selectedTileIndex];
        let ends = getPlayableEnds(tile);
        if (ends.includes(end)) {
            playTile('player', selectedTileIndex, end);
        }
    }
}

// ==========================================
// 3. حساب الفوز والقفل (Win & Points System)
// ==========================================

// فحص الفوز بنفاذ الأوراق
function checkHandEmptyWin(handOwner) {
    let hand = (handOwner === 'player') ? playerHand : ((handOwner === 'comp1') ? comp1Hand : comp2Hand);
    if (hand.length === 0) {
        let winnerName = (handOwner === 'player') ? 'أنت 🎉' : ((handOwner === 'comp1') ? 'الكمبيوتر 1 🤖' : 'الكمبيوتر 2 🤖');
        updateTurnStatus(`🏆 انتهت اللعبة! الفائز هو: ${winnerName}`);
        setTimeout(() => showModeModal(), 2500);
        return true;
    }
    return false;
}

// فحص قفل اللعبة (Blocked Game) وحساب أقل النقاط
function checkBlockedGame() {
    // تكون اللعبة مقفلة إذا كان السوق فارغاً ولا أحد من اللاعبين يملك حركة صالحة
    let noMovesPlayer = !hasValidMove(playerHand);
    let noMovesComp1 = !hasValidMove(comp1Hand);
    let noMovesComp2 = (gameMode === 3) ? !hasValidMove(comp2Hand) : true;

    if (boneyard.length === 0 && noMovesPlayer && noMovesComp1 && noMovesComp2) {
        // حساب مجموع نقاط كل لاعب
        let playerPoints = playerHand.reduce((sum, t) => sum + t.top + t.bottom, 0);
        let comp1Points = comp1Hand.reduce((sum, t) => sum + t.top + t.bottom, 0);
        let comp2Points = (gameMode === 3) ? comp2Hand.reduce((sum, t) => sum + t.top + t.bottom, 0) : 999;

        let scores = [
            { name: 'أنت', score: playerPoints },
            { name: 'الكمبيوتر 1', score: comp1Points }
        ];

        if (gameMode === 3) {
            scores.push({ name: 'الكمبيوتر 2', score: comp2Points });
        }

        // ترتيب اللاعبين تصاعدياً حسب النقاط (الأقل نقاطاً هو الأول)
        scores.sort((a, b) => a.score - b.score);

        let winner = scores[0];
        let isTie = (scores[0].score === scores[1].score);

        if (isTie) {
            updateTurnStatus(`🔒 اللعبة مقفلة! تعادل بين الأقل نقاطاً (${winner.score} نقطة)`);
        } else {
            updateTurnStatus(`🔒 اللعبة مقفلة! الفائز بأقل نقاط هو: ${winner.name} (${winner.score} نقطة) 🏆`);
        }

        setTimeout(() => showModeModal(), 3500);
        return true;
    }
    return false;
}

// ==========================================
// 4. عرض الواجهة وتصميم الأحجار (Render UI)
// ==========================================

function renderGame() {
    // 1. عرض أحجار اللاعب
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

    // 2. تحديث عدادات المنافسين والسوق
    let c1Count = document.getElementById("comp1-count");
    if (c1Count) c1Count.innerText = `🂠 ${comp1Hand.length}`;

    let c2Count = document.getElementById("comp2-count");
    if (c2Count && gameMode === 3) c2Count.innerText = `🂠 ${comp2Hand.length}`;

    let bCount = document.getElementById("boneyard-count");
    if (bCount) bCount.innerText = boneyard.length;

    // 3. عرض أحجار الطاولة بترتيب محاذي ومتسلسل
    let chainArea = document.getElementById("board-chain");
    if (chainArea) {
        chainArea.innerHTML = "";

        if (boardChain.length === 0) {
            chainArea.innerHTML = `<p class="empty-msg">الطاولة فارغة، اختر حجراً للبدء</p>`;
        } else {
            // إضافة زر/منطقة خيار الطرف الأيسر عند التحديد
            if (selectedTileIndex !== null) {
                let playableEnds = getPlayableEnds(playerHand[selectedTileIndex]);
                if (playableEnds.includes('left')) {
                    chainArea.innerHTML += `<div class="end-selector" onclick="selectBoardEnd('left')">◀ هنا</div>`;
                }
            }

            boardChain.forEach((piece, index) => {
                let isDouble = (piece.top === piece.bottom);
                // الأحجار المزدوجة توضع رأسياً، والأحجار العادية أفقياً
                let orientationClass = isDouble ? '' : 'horizontal';

                chainArea.innerHTML += `
                    <div class="domino-piece ${orientationClass}">
                        ${createDotsHTML(piece.top)}
                        <div class="divider"></div>
                        ${createDotsHTML(piece.bottom)}
                    </div>
                `;
            });

            // إضافة زر/منطقة خيار الطرف الأيمن عند التحديد
            if (selectedTileIndex !== null) {
                let playableEnds = getPlayableEnds(playerHand[selectedTileIndex]);
                if (playableEnds.includes('right')) {
                    chainArea.innerHTML += `<div class="end-selector" onclick="selectBoardEnd('right')">هنا ▶</div>`;
                }
            }
        }
    }

    if (selectedTileIndex === null) {
        updateTurnStatus();
    }
}

// دالة رسم النقاط داخل الحجر
function createDotsHTML(number) {
    if (number === 0) return `<div class="domino-half p-0"></div>`;
    let dotsHTML = '';
    for (let i = 1; i <= number; i++) {
        dotsHTML += `<div class="dot dot-${i}"></div>`;
    }
    return `<div class="domino-half p-${number}">${dotsHTML}</div>`;
}

// تحديث نص شريط الحالة العلوي
function updateTurnStatus(customText = null) {
    let banner = document.getElementById("turn-display");
    if (!banner) return;

    if (customText) {
        banner.innerText = customText;
        banner.style.color = "#f59e0b";
    } else if (currentTurn === 'player') {
        banner.innerText = "دورك للعب الآن 🎯";
        banner.style.color = "#38bdf8";
    } else {
        let name = (currentTurn === 'comp1') ? "الكمبيوتر 1 🤖" : "الكمبيوتر 2 🤖";
        banner.innerText = `انتظر دور ${name}...`;
        banner.style.color = "#f59e0b";
    }
}

// تشغيل النافذة المودال عند التحميل
window.onload = function() {
    showModeModal();
};
