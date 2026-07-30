// 1. إنشاء مصفوفة (Array) فارغة لتخزين الـ 28 حجراً
let dominoDeck = [];

// 2. استخدام حلقة تكرار مضاعفة (Nested Loops) لإنشاء الأحجار بدون تكرار
// الرقم العلوي يبدأ من 0 إلى 6
for (let top = 0; top <= 6; top++) {
    // الرقم السفلي يبدأ من قيمة الرقم العلوي لضمان عدم تكرار الأحجار (مثل 0-1 و 1-0)
    for (let bottom = top; bottom <= 6; bottom++) {
        // إضافة الحجر إلى القائمة ككائن (Object) يحتوي على الرقمين
        dominoDeck.push({ top: top, bottom: bottom });
    }
}

// 3. تحديد عنصر الطاولة من صفحة HTML
let board = document.getElementById("game-board");

// 4. تفريغ الطاولة من أي محتوى سابق
board.innerHTML = "";

// 5. تكرار عرض كل حجر داخل المصفوفة على شاشة الطاولة
dominoDeck.forEach(piece => {
    board.innerHTML += `
        <div class="domino-piece">
            <div>${piece.top}</div>
            <div class="divider"></div>
            <div>${piece.bottom}</div>
        </div>
    `;
});
