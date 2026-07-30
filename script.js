// 1. تحديد أرقام الحجر
let topNumber = 6;
let bottomNumber = 6; 

// 2. الوصول إلى الطاولة (الصندوق الفارغ في HTML)
let board = document.getElementById("game-board");

// 3. رسم الحجر بداخل الطاولة
board.innerHTML = `
    <div class="domino-piece">
        <div>${topNumber}</div>
        <div class="divider"></div>
        <div>${bottomNumber}</div>
    </div>
`;
