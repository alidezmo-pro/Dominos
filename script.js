// =========================================================
// 1. المتغيرات الأساسية (حالة اللعبة)
// =========================================================
let gameMode = 2;          // عدد اللاعبين الافتراضي (2 أو 3)
let fullDeck = [];         // مصفوفة الطقم الكامل
let playerHand = [];       // أحجارك
let comp1Hand = [];        // أحجار الكمبيوتر 1
let comp2Hand = [];        // أحجار الكمبيوتر 2
let boneyard = [];         // أحجار السوق
let boardChain = [];       // السلسلة الموجودة على الطاولة
let currentTurn = 'player';// من عليه الدور الآن؟
let boardLeft = null;      // الرقم المفتوح يساراً
let boardRight = null;     // الرقم المفتوح يميناً

// =========================================================
// 2. دوال البداية والنوافذ المنبثقة
// =========================================================
function showModeModal() {
    document.getElementById('mode-modal').classList.remove('hidden');
    document.getElementById('draw-modal').classList.add('hidden');
}

function selectGameMode(mode) {
    gameMode = mode;
    document.getElementById('mode-modal').classList.add('hidden');
    
    let comp2Badge = document.getElementById('comp2-badge');
    if (mode === 3) {
        comp2Badge.classList.remove('hidden');
    } else {
        comp2Badge.classList.add('hidden');
    }
    
    startGame();
}

// ربط زر "لعبة جديدة" بالدالة
document.addEventListener('DOMContentLoaded', () => {
    const restartBtn = document.querySelector('.restart-btn');
    if(restartBtn) {
        restartBtn.addEventListener('click', showModeModal);
    }
});

// =========================================================
// 3. تجهيز وتوزيع الأحجار
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

function startGame() {
    createFullDeck();
    shuffleDeck(fullDeck);

    playerHand = fullDeck.splice(0, 7);
    comp1Hand = fullDeck.splice(0, 7);
    comp2Hand = (gameMode === 3) ? fullDeck.splice(0, 7) : [];
    boneyard = fullDeck;
    
    boardChain = [];
    boardLeft = null;
    boardRight = null;
    currentTurn = 'player'; // أنت تبدأ دائماً

    renderGame();
    checkTurnMove();
}

// =========================================================
// 4. قواعد اللعب والمطابقة
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

function playTile(handOwner, tileIndex, targetEnd = 'auto') {
    let hand = handOwner === 'player' ? playerHand : (handOwner === 'comp1' ? comp1Hand : comp2Hand);
    let tile = hand[tileIndex];
    let ends = getPlayableEnds(tile);

    if (ends.length === 0 && boardChain.length > 0) return false;

    // تحديد الجانب الذي سيتم اللعب فيه
    let chosenEnd = targetEnd;
    if (chosenEnd === 'auto') {
        chosenEnd = ends[0]; // افتراضياً نختار أول خيار متاح للكمبيوتر
    }

    hand.splice(tileIndex, 1); // سحب الحجر من اليد

    // وضع الحجر على الطاولة
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

    renderGame(); // تحديث الشاشة فوراً بعد اللعب

    if (checkWinner(handOwner)) return true;

    advanceTurn(); // تمرير الدور
    return true;
}

// =========================================================
// 5. إدارة الأدوار والذكاء الاصطناعي
// =========================================================
function advanceTurn() {
    // تغيير الدور بناءً على اللاعب الحالي
    if (currentTurn === 'player') {
        currentTurn = 'comp1';
    } else if (currentTurn === 'comp1') {
        currentTurn = (gameMode === 3) ? 'comp2' : 'player';
    } else if (currentTurn === 'comp2') {
        currentTurn = 'player';
    }

    renderGame(); // مهم جداً: تحديث الشاشة لتفعيل أو إلغاء تفعيل أزرارك

    if (currentTurn !== 'player') {
        // إذا كان الدور للكمبيوتر، ننتظر ثانية ثم يلعب
        setTimeout(playComputerTurn, 1000);
    } else {
        // إذا عاد الدور إليك، نفحص إذا كنت تحتاج للسحب
        checkTurnMove();
    }
}

function playComputerTurn() {
    let hand = currentTurn === 'comp1' ? comp1Hand : comp2Hand;
    let validIndex = hand.findIndex(tile => getPlayableEnds(tile).length > 0);

    if (validIndex !== -1) {
        playTile(currentTurn, validIndex, 'auto');
    } else {
        if (boneyard.length > 0) {
            hand.push(boneyard.pop());
            renderGame();
            setTimeout(playComputerTurn, 800); // يحاول مجدداً بعد السحب
        } else {
            advanceTurn(); // إذا انتهى السوق ولا يوجد لعب، يمرر الدور
        }
    }
}

function checkTurnMove() {
    if (currentTurn === 'player') {
        if (!hasValidMove(playerHand) && boneyard.length > 0) {
            document.getElementById('draw-modal').classList.remove('hidden');
        } else if (!hasValidMove(playerHand) && boneyard.length === 0) {
            // إذا لم يكن لديك لعب والسوق فارغ، يمر الدور تلقائياً
            setTimeout(() => {
                alert("لا يوجد لديك أحجار للعب والسوق فارغ. تم تمرير الدور.");
                advanceTurn();
            }, 1000);
        } else {
            document.getElementById('draw-modal').classList.add('hidden');
        }
    }
}

function drawFromBoneyard() {
    if (boneyard.length > 0) {
        playerHand.push(boneyard.pop());
        document.getElementById('draw-modal').classList.add('hidden');
        renderGame();
        checkTurnMove();
    }
}

// =========================================================
// 6. التفاعل ورسم واجهة المستخدم
// =========================================================
function onPlayerTileClick(index) {
    if (currentTurn !== 'player') return; // منع اللعب إذا لم يكن دورك
    
    let tile = playerHand[index];
    let ends = getPlayableEnds(tile);

    if (ends.length > 1) {
        // إذا كان الحجر يصلح للطرفين، نسأل اللاعب (موافق=يمين، إلغاء=يسار)
        let choice = confirm("هل تريد اللعب على اليمين؟ \n(اضغط 'موافق' لليمين، أو 'إلغاء' لليسار)");
        playTile('player', index, choice ? 'right' : 'left');
    } else if (ends.length === 1) {
        playTile('player', index, ends[0]);
    }
}

function renderGame() {
    // رسم أحجار اللاعب
    let playerArea = document.getElementById("player-hand");
    playerArea.innerHTML = "";
    
    // شرط التفعيل: يجب أن يكون دورك، والحجر قابل للعب
    let canPlayerPlay = (currentTurn === 'player');

    playerHand.forEach((piece, index) => {
        let ends = getPlayableEnds(piece);
        let isPlayable = canPlayerPlay && (ends.length > 0 || boardChain.length === 0);
        
        playerArea.innerHTML += `
            <div class="domino-piece ${isPlayable ? 'playable' : ''}" 
                 onclick="${isPlayable ? `onPlayerTileClick(${index})` : ''}">
                ${createDotsHTML(piece.top)}
                <div class="divider"></div>
                ${createDotsHTML(piece.bottom)}
            </div>
        `;
    });

    // تحديث أرقام الخصوم والسوق
    document.getElementById("comp1-count").innerText = `🂠 ${comp1Hand.length}`;
    if (gameMode === 3) document.getElementById("comp2-count").innerText = `🂠 ${comp2Hand.length}`;
    document.getElementById("boneyard-count").innerText = boneyard.length;

    // رسم أحجار الطاولة
    let chainArea = document.getElementById("board-chain");
    chainArea.innerHTML = "";
    if (boardChain.length === 0) {
        chainArea.innerHTML = `<p class="empty-msg">الطاولة فارغة، اختر حجراً للبدء</p>`;
    } else {
        boardChain.forEach(piece => {
            chainArea.innerHTML += `
                <div class="domino-piece horizontal">
                    ${createDotsHTML(piece.top)}
                    <div class="divider"></div>
                    ${createDotsHTML(piece.bottom)}
                </div>
            `;
        });
    }

    updateTurnStatus();
}

function createDotsHTML(number) {
    if (number === 0) return `<div class="domino-half p-0"></div>`;
    let dotsHTML = '';
    for (let i = 1; i <= number; i++) {
        dotsHTML += `<div class="dot dot-${i}"></div>`;
    }
    return `<div class="domino-half p-${number}">${dotsHTML}</div>`;
}

function updateTurnStatus() {
    let banner = document.getElementById("turn-display");
    if (currentTurn === 'player') {
        banner.innerText = "دورك للعب الآن 🎯";
        banner.style.color = "#38bdf8";
    } else {
        banner.innerText = "انتظر دور المنافس 🤖...";
        banner.style.color = "#f59e0b";
    }
}

function checkWinner(lastPlayer) {
    let hand = lastPlayer === 'player' ? playerHand : (lastPlayer === 'comp1' ? comp1Hand : comp2Hand);
    if (hand.length === 0) {
        let name = lastPlayer === 'player' ? 'أنت 🎉' : 'الكمبيوتر 🤖';
        setTimeout(() => {
            alert(`🏆 انتهت اللعبة! الفائز هو: ${name}`);
            showModeModal(); // إعادة إظهار نافذة البداية
        }, 300);
        return true;
    }
    return false;
}

window.onload = function() {
    showModeModal();
};
