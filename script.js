// =========================================================
// 1. المتغيرات الأساسية (حالة اللعبة)
// =========================================================
let gameMode = 2;          // عدد اللاعبين الافتراضي (2 أو 3)
let fullDeck = [];         // مصفوفة تحتوي على الطقم الكامل (28 حجراً)
let playerHand = [];       // مصفوفة أحجار اللاعب (أنت)
let comp1Hand = [];        // مصفوفة أحجار الكمبيوتر 1
let comp2Hand = [];        // مصفوفة أحجار الكمبيوتر 2
let boneyard = [];         // مصفوفة أحجار السوق (السحبة)
let boardChain = [];       // مصفوفة الأحجار الملعوبة على الطاولة
let currentTurn = 'player';// تحديد من عليه الدور: 'player', 'comp1', 'comp2'
let boardLeft = null;      // الرقم المفتوح على الطرف الأيسر للطاولة
let boardRight = null;     // الرقم المفتوح على الطرف الأيمن للطاولة

// =========================================================
// 2. دوال النوافذ المنبثقة وبدء اللعبة
// =========================================================

// دالة لإظهار نافذة اختيار عدد اللاعبين وإخفاء نافذة السحب
function showModeModal() {
    document.getElementById('mode-modal').classList.remove('hidden');
    document.getElementById('draw-modal').classList.add('hidden');
}

// دالة لالتقاط اختيار المستخدم والبدء
function selectGameMode(mode) {
    gameMode = mode;
    document.getElementById('mode-modal').classList.add('hidden'); // إخفاء النافذة
    
    // إظهار أو إخفاء شارة الكمبيوتر الثاني بناءً على الاختيار
    let comp2Badge = document.getElementById('comp2-badge');
    if (mode === 3) {
        comp2Badge.classList.remove('hidden');
    } else {
        comp2Badge.classList.add('hidden');
    }
    
    startGame(); // استدعاء دالة بدء اللعبة
}

// =========================================================
// 3. تجهيز أحجار الدومينو وتوزيعها
// =========================================================

// دالة لإنشاء 28 حجراً من (0-0) إلى (6-6)
function createFullDeck() {
    fullDeck = [];
    for (let top = 0; top <= 6; top++) {
        for (let bottom = top; bottom <= 6; bottom++) {
            fullDeck.push({ top: top, bottom: bottom });
        }
    }
}

// دالة لخلط الأحجار عشوائياً (خوارزمية Fisher-Yates)
function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]]; // تبديل الأماكن
    }
}

// دالة تهيئة اللعبة والتوزيع
function startGame() {
    createFullDeck();
    shuffleDeck(fullDeck);

    // سحب 7 أحجار لكل لاعب من الطقم
    playerHand = fullDeck.splice(0, 7);
    comp1Hand = fullDeck.splice(0, 7);
    comp2Hand = (gameMode === 3) ? fullDeck.splice(0, 7) : [];

    // ما يتبقى يذهب للسوق
    boneyard = fullDeck;
    boardChain = [];
    boardLeft = null;
    boardRight = null;
    currentTurn = 'player'; // اللاعب يبدأ دائماً

    renderGame(); // تحديث واجهة المستخدم
    checkTurnMove(); // فحص إذا كان اللاعب يمتلك حركة صالحة
}

// =========================================================
// 4. منطق اللعب وقواعد المطابقة
// =========================================================

// دالة لمعرفة الأطراف المتاحة للعب الحجر (يمين، يسار، أو كلاهما)
function getPlayableEnds(tile) {
    if (boardChain.length === 0) return ['any']; // إذا كانت الطاولة فارغة، يمكن اللعب في أي مكان
    
    let ends = [];
    if (tile.top === boardLeft || tile.bottom === boardLeft) ends.push('left');
    if (tile.top === boardRight || tile.bottom === boardRight) ends.push('right');
    
    return ends;
}

// دالة لفحص ما إذا كان اللاعب يمتلك أي حجر صالح للعب
function hasValidMove(hand) {
    if (boardChain.length === 0) return true;
    return hand.some(tile => getPlayableEnds(tile).length > 0);
}

// دالة تنفيذ لعب الحجر على الطاولة
function playTile(handOwner, tileIndex, targetEnd = 'auto') {
    let hand = handOwner === 'player' ? playerHand : (handOwner === 'comp1' ? comp1Hand : comp2Hand);
    let tile = hand[tileIndex];
    let ends = getPlayableEnds(tile);

    // إذا لم يكن الحجر صالحاً والطاولة ليست فارغة، قم بالإلغاء
    if (ends.length === 0 && boardChain.length > 0) return false;

    // تحديد الطرف المراد اللعب عليه
    let chosenEnd = targetEnd === 'auto' ? (ends.includes('left') ? 'left' : 'right') : targetEnd;

    // إزالة الحجر من يد اللاعب
    hand.splice(tileIndex, 1);

    // ربط الحجر بالطاولة وتحديث الأرقام المفتوحة
    if (boardChain.length === 0) {
        boardLeft = tile.top;
        boardRight = tile.bottom;
        boardChain.push(tile);
    } else if (chosenEnd === 'left') {
        if (tile.bottom === boardLeft) {
            boardLeft = tile.top;
            boardChain.unshift(tile);
        } else {
            let flipped = { top: tile.bottom, bottom: tile.top }; // تدوير الحجر
            boardLeft = flipped.top;
            boardChain.unshift(flipped);
        }
    } else if (chosenEnd === 'right') {
        if (tile.top === boardRight) {
            boardRight = tile.bottom;
            boardChain.push(tile);
        } else {
            let flipped = { top: tile.bottom, bottom: tile.top }; // تدوير الحجر
            boardRight = flipped.bottom;
            boardChain.push(flipped);
        }
    }

    renderGame(); // تحديث الشاشة

    // فحص إذا كان هناك فائز
    if (checkWinner(handOwner)) return true;

    advanceTurn(); // نقل الدور
    return true;
}

// =========================================================
// 5. السحب من السوق وإدارة الأدوار (AI)
// =========================================================

// دالة سحب حجر من السوق للمستخدم
function drawFromBoneyard() {
    if (boneyard.length > 0) {
        let drawnTile = boneyard.pop(); // سحب آخر حجر
        playerHand.push(drawnTile); // إضافته ليد اللاعب
        document.getElementById('draw-modal').classList.add('hidden'); // إخفاء النافذة
        renderGame();
        checkTurnMove(); // إعادة فحص هل الحجر الجديد صالح للعب أم سيحتاج سحبة أخرى
    } else {
        // إذا فرغ السوق
        document.getElementById('draw-modal').classList.add('hidden');
        advanceTurn(); // تمرير الدور للكمبيوتر
    }
}

// دالة لنقل الدور بين اللاعبين
function advanceTurn() {
    if (currentTurn === 'player') {
        currentTurn = 'comp1';
        setTimeout(playComputerTurn, 1000); // تأخير زمني لمحاكاة تفكير الكمبيوتر
    } else if (currentTurn === 'comp1') {
        if (gameMode === 3) {
            currentTurn = 'comp2';
            setTimeout(playComputerTurn, 1000);
        } else {
            currentTurn = 'player';
            checkTurnMove();
        }
    } else if (currentTurn === 'comp2') {
        currentTurn = 'player';
        checkTurnMove();
    }
    updateTurnStatus(); // تحديث النص في أعلى الشاشة
}

// دالة تفكير ولعب الكمبيوتر
function playComputerTurn() {
    let hand = currentTurn === 'comp1' ? comp1Hand : comp2Hand;
    let validIndex = hand.findIndex(tile => getPlayableEnds(tile).length > 0);

    if (validIndex !== -1) {
        playTile(currentTurn, validIndex, 'auto'); // لعب الحجر إذا وجده
    } else {
        if (boneyard.length > 0) {
            hand.push(boneyard.pop()); // السحب من السوق
            renderGame();
            setTimeout(playComputerTurn, 800); // تكرار المحاولة بعد السحب
        } else {
            advanceTurn(); // تفويت الدور إذا فرغ السوق
        }
    }
}

// دالة لفحص دور اللاعب وإظهار نافذة السحب الشفافة إن لزم الأمر
function checkTurnMove() {
    if (currentTurn === 'player') {
        if (!hasValidMove(playerHand) && boneyard.length > 0) {
            document.getElementById('draw-modal').classList.remove('hidden');
        } else {
            document.getElementById('draw-modal').classList.add('hidden');
        }
    }
}

// =========================================================
// 6. دوال رسم واجهة المستخدم (UI)
// =========================================================

// دالة لرسم النقاط السوداء داخل كل نصف من حجر الدومينو
function createDotsHTML(number) {
    if (number === 0) return `<div class="domino-half p-0"></div>`;
    let dotsHTML = '';
    for (let i = 1; i <= number; i++) {
        dotsHTML += `<div class="dot dot-${i}"></div>`;
    }
    return `<div class="domino-half p-${number}">${dotsHTML}</div>`;
}

// الدالة الرئيسية المسؤولة عن تحديث كامل الشاشة
function renderGame() {
    // 1. رسم أحجار اللاعب في المنطقة السفلية
    let playerArea = document.getElementById("player-hand");
    playerArea.innerHTML = "";
    let canPlayerPlay = (currentTurn === 'player');

    playerHand.forEach((piece, index) => {
        let ends = getPlayableEnds(piece);
        let isPlayable = canPlayerPlay && (ends.length > 0 || boardChain.length === 0);
        
        // رسم الحجر مع تفعيل النقر إذا كان قابلاً للعب
        playerArea.innerHTML += `
            <div class="domino-piece ${isPlayable ? 'playable' : ''}" 
                 onclick="${isPlayable ? `onPlayerTileClick(${index})` : ''}">
                ${createDotsHTML(piece.top)}
                <div class="divider"></div>
                ${createDotsHTML(piece.bottom)}
            </div>
        `;
    });

    // 2. تحديث عدادات كروت الخصوم (بدون رسم الكروت لتوفير المساحة)
    document.getElementById("comp1-count").innerText = `🂠 ${comp1Hand.length}`;
    if (gameMode === 3) {
        document.getElementById("comp2-count").innerText = `🂠 ${comp2Hand.length}`;
    }

    // 3. تحديث أيقونة السوق
    document.getElementById("boneyard-count").innerText = boneyard.length;

    // 4. رسم الطاولة الوسطى والسلسلة أفقياً
    let chainArea = document.getElementById("board-chain");
    chainArea.innerHTML = "";

    if (boardChain.length === 0) {
        chainArea.innerHTML = `<p class="empty-msg">الطاولة فارغة، اختر حجراً من يدك للبدء</p>`;
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

// دالة التقاط نقرة المستخدم على أحد أحجاره
function onPlayerTileClick(index) {
    if (currentTurn !== 'player') return;
    let tile = playerHand[index];
    let ends = getPlayableEnds(tile);

    // إذا كان الحجر يصلح للطرفين، اسأل اللاعب
    if (ends.length > 1) {
        let choice = confirm("اضغط OK للعب على اليمين، أو Cancel للعب على اليسار.");
        playTile('player', index, choice ? 'right' : 'left');
    } else {
        playTile('player', index, ends[0]);
    }
}

// دالة تحديث النص العلوي الذي يخبرك بمن عليه الدور
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

// دالة للتحقق من انتهاء أحجار أحد اللاعبين وإعلان الفوز
function checkWinner(lastPlayer) {
    let hand = lastPlayer === 'player' ? playerHand : (lastPlayer === 'comp1' ? comp1Hand : comp2Hand);
    if (hand.length === 0) {
        let name = lastPlayer === 'player' ? 'أنت 🎉' : 'الكمبيوتر 🤖';
        setTimeout(() => {
            alert(`🏆 مبروك! الفائز هو: ${name}`);
            showModeModal(); // إعادة إظهار نافذة البداية للعب مجدداً
        }, 300);
        return true;
    }
    return false;
}

// تشغيل دالة البداية فور تحميل الصفحة
window.onload = function() {
    showModeModal();
};
