let gameMode = 2;
let fullDeck = [];
let playerHand = [];
let comp1Hand = [];
let comp2Hand = [];
let boneyard = [];
let boardChain = [];
let currentTurn = 'player';
let boardLeft = null;
let boardRight = null;

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
    currentTurn = 'player';

    renderGame();
    checkTurnMove();
}

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

    let chosenEnd = targetEnd === 'auto' ? (ends.includes('left') ? 'left' : 'right') : targetEnd;

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

    renderGame();

    if (checkWinner(handOwner)) return true;

    advanceTurn();
    return true;
}

function drawFromBoneyard() {
    if (boneyard.length > 0) {
        let drawnTile = boneyard.pop();
        playerHand.push(drawnTile);
        document.getElementById('draw-modal').classList.add('hidden');
        renderGame();
        checkTurnMove();
    } else {
        document.getElementById('draw-modal').classList.add('hidden');
        advanceTurn();
    }
}

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
            checkTurnMove();
        }
    } else if (currentTurn === 'comp2') {
        currentTurn = 'player';
        checkTurnMove();
    }
    updateTurnStatus();
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
            setTimeout(playComputerTurn, 800);
        } else {
            advanceTurn();
        }
    }
}

function checkTurnMove() {
    if (currentTurn === 'player') {
        if (!hasValidMove(playerHand) && boneyard.length > 0) {
            document.getElementById('draw-modal').classList.remove('hidden');
        } else {
            document.getElementById('draw-modal').classList.add('hidden');
        }
    }
}

function createDotsHTML(number) {
    if (number === 0) return `<div class="domino-half p-0"></div>`;
    let dotsHTML = '';
    for (let i = 1; i <= number; i++) {
        dotsHTML += `<div class="dot dot-${i}"></div>`;
    }
    return `<div class="domino-half p-${number}">${dotsHTML}</div>`;
}

function renderGame() {
    // 1. رسم أحجار اللاعب
    let playerArea = document.getElementById("player-hand");
    playerArea.innerHTML = "";
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

    // 2. تحديث عداد كروت الخصوم
    document.getElementById("comp1-count").innerText = `🂠 ${comp1Hand.length}`;
    if (gameMode === 3) {
        document.getElementById("comp2-count").innerText = `🂠 ${comp2Hand.length}`;
    }

    // 3. تحديث عدد السوق
    document.getElementById("boneyard-count").innerText = boneyard.length;

    // 4. رسم الطاولة
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

function onPlayerTileClick(index) {
    if (currentTurn !== 'player') return;
    let tile = playerHand[index];
    let ends = getPlayableEnds(tile);

    if (ends.length > 1) {
        let choice = confirm("اضغط OK للعب على اليمين، أو Cancel للعب على اليسار.");
        playTile('player', index, choice ? 'right' : 'left');
    } else {
        playTile('player', index, ends[0]);
    }
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
            alert(`🏆 مبروك! الفائز هو: ${name}`);
            showModeModal();
        }, 300);
        return true;
    }
    return false;
}

window.onload = function() {
    showModeModal();
};
