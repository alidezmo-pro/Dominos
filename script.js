// المتغيرات الأساسية للعبة
let fullDeck = [];      // طقم الـ 28 حجراً
let playerHand = [];    // أحجار اللاعب
let computerHand = [];  // أحجار الكمبيوتر
let boneyard = [];      // أحجار السوق
let boardTiles = [];    // الأحجار الملعوبة على الطاولة

// 1. إنشاء الأحجار الـ 28
function createFullDeck() {
    fullDeck = [];
    for (let top = 0; top <= 6; top++) {
        for (let bottom = top; bottom <= 6; bottom++) {
            fullDeck.push({ top: top, bottom: bottom });
        }
    }
}

// 2. خلط الأحجار عشوائياً
function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

// 3. إنشاء عناصر النقاط HTML
function createDotsHTML(number) {
    if (number === 0) return `<div class="domino-half p-0"></div>`;
    let dotsHTML = '';
    for (let i = 1; i <= number; i++) {
        dotsHTML += `<div class="dot dot-${i}"></div>`;
    }
    return `<div class="domino-half p-${number}">${dotsHTML}</div>`;
}

// 4. دالة لبدء اللعبة وتوزيع 7 كروت لكل طرف
function startGame() {
    createFullDeck();
    shuffleDeck(fullDeck);

    playerHand = fullDeck.splice(0, 7);
    computerHand = fullDeck.splice(0, 7);
    boneyard = fullDeck;
    boardTiles = []; // تفريغ الطاولة

    renderGame();
}

// 5. دالة لعب حجر من يد اللاعب وإلقائه على الطاولة
function playTile(index) {
    // اقتطاع الحجر المختار من يد اللاعب
    let tileToPlay = playerHand.splice(index, 1)[0];
    
    // إضافة الحجر إلى قائمة الأحجار على الطاولة
    boardTiles.push(tileToPlay);
    
    // إعادة رسم الشاشة لإظهار التعديلات فوراً
    renderGame();
}

// 6. عرض وتحديث الواجهة (UI)
function renderGame() {
    // أ. عرض أحجار اللاعب وتفعيل حدث الضغط (onclick)
    let playerArea = document.getElementById("player-hand");
    playerArea.innerHTML = "";
    playerHand.forEach((piece, index) => {
        let topHalf = createDotsHTML(piece.top);
        let bottomHalf = createDotsHTML(piece.bottom);
        // إضافة onclick="playTile(index)" لتمكين الضغط
        playerArea.innerHTML += `
            <div class="domino-piece" onclick="playTile(${index})">
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

    // د. عرض الأحجار الملعوبة على الطاولة الوسطى
    let boardArea = document.getElementById("game-board");
    boardArea.innerHTML = "";
    
    if (boardTiles.length === 0) {
        boardArea.innerHTML = `<p style="opacity:0.6; font-size: 13px;">الطاولة فارغة، اضغط على أحد أحجارك لتلعب</p>`;
    } else {
        boardTiles.forEach(piece => {
            let topHalf = createDotsHTML(piece.top);
            let bottomHalf = createDotsHTML(piece.bottom);
            boardArea.innerHTML += `
                <div class="domino-piece" style="cursor: default;">
                    ${topHalf}
                    <div class="divider"></div>
                    ${bottomHalf}
                </div>
            `;
        });
    }
}

// تشغيل اللعبة عند التحميل
startGame();
