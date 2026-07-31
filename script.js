// دالة عرض اللعبة وتحديث الأحجام تلقائياً
function renderGame() {
    // 1. حساب الحجم الديناميكي لأحجار الطاولة حسب العدد الملعوب
    let totalBoardTiles = boardChain.length;
    let scale = 1;

    if (totalBoardTiles > 8 && totalBoardTiles <= 14) {
        scale = 0.85; // تصغير بنسبة 15%
    } else if (totalBoardTiles > 14 && totalBoardTiles <= 20) {
        scale = 0.72; // تصغير بنسبة 28%
    } else if (totalBoardTiles > 20) {
        scale = 0.60; // تصغير بنسبة 40%
    }

    // تطبيق الحجم المحسوب على عنصر الجذر في CSS
    document.documentElement.style.setProperty('--board-scale', scale);

    // 2. عرض أحجار يد اللاعب
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

    // 3. تحديث بطاقات اللاعبين والمنافسين والسوق
    let c1Count = document.getElementById("comp1-count");
    if (c1Count) c1Count.innerText = `🂠 ${comp1Hand.length}`;

    let c2Count = document.getElementById("comp2-count");
    if (c2Count && gameMode === 3) c2Count.innerText = `🂠 ${comp2Hand.length}`;

    let bCount = document.getElementById("boneyard-count");
    if (bCount) bCount.innerText = boneyard.length;

    // 4. عرض أحجار الطاولة
    let chainArea = document.getElementById("board-chain");
    if (chainArea) {
        chainArea.innerHTML = "";

        if (boardChain.length === 0) {
            chainArea.innerHTML = `<p class="empty-msg">الطاولة فارغة، اختر حجراً للبدء</p>`;
        } else {
            if (selectedTileIndex !== null) {
                let playableEnds = getPlayableEnds(playerHand[selectedTileIndex]);
                if (playableEnds.includes('left')) {
                    chainArea.innerHTML += `<div class="end-selector" onclick="selectBoardEnd('left')">◀ هنا</div>`;
                }
            }

            boardChain.forEach((piece) => {
                let isDouble = (piece.top === piece.bottom);
                let orientationClass = isDouble ? '' : 'horizontal';

                chainArea.innerHTML += `
                    <div class="domino-piece ${orientationClass}">
                        ${createDotsHTML(piece.top)}
                        <div class="divider"></div>
                        ${createDotsHTML(piece.bottom)}
                    </div>
                `;
            });

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
