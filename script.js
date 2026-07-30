// المتغيرات الأساسية لحفظ حالة اللعبة
let fullDeck = [];      // الطقم الكامل (28 حجراً)
let playerHand = [];    // أحجار اللاعب (7 أحجار)
let computerHand = [];  // أحجار الكمبيوتر (7 أحجار)
let boneyard = [];      // أحجار السوق (14 حجراً)

// 1. دالة إنشاء الـ 28 حجراً
function createFullDeck() {
    fullDeck = [];
    for (let top = 0; top <= 6; top++) {
        for (let bottom = top; bottom <= 6; bottom++) {
            fullDeck.push({ top: top, bottom: bottom });
        }
    }
}

// 2. دالة خلط الأحجار عشوائياً (Fisher-Yates Shuffle)
function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        // تبديل الأماكن عشوائياً
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

// 3. دالة رسم النقاط HTML
function createDotsHTML(number) {
    if (number === 0) return `<div class="domino-half p-0"></div>`;
    let dotsHTML = '';
    for (let i = 1; i <= number; i++) {
        dotsHTML += `<div class="dot dot-${i}"></div>`;
    }
    return `<div class="domino-half p-${number}">${dotsHTML}</div>`;
}

// 4. دالة بدء لعبة جديدة وتوزيع الأحجار
function startGame() {
    // إنشاء الكروت ثم خلطها
    createFullDeck();
    shuffleDeck(fullDeck);

    // توزيع الأحجار:
    // اقتطاع أول 7 كروت للاعب
    playerHand = fullDeck.splice(0, 7);
    // اقتطاع الـ 7 كروت التالية للكمبيوتر
    computerHand = fullDeck.splice(0, 7);
    // الـ 14 كارت المتبقية تذهب للسوق
    boneyard = fullDeck;

    // تنظيف الطاولة وعرض الأحجار الموزعة
    renderGame();
}

// 5. دالة عرض وتحديث الشاشة (UI)
function renderGame() {
    // أ. عرض أحجار اللاعب (مكشوفة بالنقاط)
    let playerArea = document.getElementById("player-hand");
    playerArea.innerHTML = "";
    playerHand.forEach(piece => {
        let topHalf = createDotsHTML(piece.top);
        let bottomHalf = createDotsHTML(piece.bottom);
        playerArea.innerHTML += `
            <div class="domino-piece">
                ${topHalf}
                <div class="divider"></div>
                ${bottomHalf}
            </div>
        `;
    });

    // ب. عرض أحجار الكمبيوتر (مخفية بالظهر)
    let computerArea = document.getElementById("computer-hand");
    computerArea.innerHTML = "";
    computerHand.forEach(() => {
        computerArea.innerHTML += `<div class="domino-piece hidden"></div>`;
    });
    document.getElementById("computer-count").innerText = `(${computerHand.length})`;

    // ج. تحديث عدد أحجار السوق
    document.getElementById("boneyard-info").innerText = `السوق (السحبة): ${boneyard.length} حجر`;

    // د. تفريغ طاولة اللعب الوسطى في البداية
    document.getElementById("game-board").innerHTML = `<p style="opacity:0.6;">الطاولة فارغة، اضغط على أحد أحجارك لتلعب</p>`;
}

// تشغيل اللعبة تلقائياً عند تحميل الصفحة لأول مرة
startGame();
