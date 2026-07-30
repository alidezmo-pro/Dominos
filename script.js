// 1. إنشاء مصفوفة تخزين أحجار الدومينو الـ 28
let dominoDeck = [];

// 2. حلقة تكرار مضاعفة لبناء كل الأحجار من (0-0) حتى (6-6)
for (let top = 0; top <= 6; top++) {
    for (let bottom = top; bottom <= 6; bottom++) {
        dominoDeck.push({ top: top, bottom: bottom });
    }
}

// 3. الوصول إلى طاولة اللعب في الصفحة
let board = document.getElementById("game-board");
board.innerHTML = "";

// 4. دالة تحويل الرقم البرمجي إلى عناصر HTML تمثل النقاط
function createDotsHTML(number) {
    // إذا كان الرقم 0 (بلاطة بيضاء) نعيد شبكة فارغة
    if (number === 0) {
        return `<div class="domino-half p-0"></div>`;
    }

    // بناء النقاط بناءً على الرقم
    let dotsHTML = '';
    for (let i = 1; i <= number; i++) {
        dotsHTML += `<div class="dot dot-${i}"></div>`;
    }

    // إرجاع النصف المكتمل بالنواحي الجمالية والنقاط
    return `<div class="domino-half p-${number}">${dotsHTML}</div>`;
}

// 5. طباعة كل حجر بنقاطه على شاشة الطاولة
dominoDeck.forEach(piece => {
    let topHalf = createDotsHTML(piece.top);
    let bottomHalf = createDotsHTML(piece.bottom);

    board.innerHTML += `
        <div class="domino-piece">
            ${topHalf}
            <div class="divider"></div>
            ${bottomHalf}
        </div>
    `;
});
