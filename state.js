// state.js
export const state = {
    // Online Configuration
    roomId: null,
    playerRole: null, 
    isOnline: false, 
    roomMaxPlayers: 2,
    targetScore: 100,
    roomScores: { host: 0, guest1: 0, guest2: 0 },
    lastAlert: null,

    // Lobby Selections
    selectedPlayersCount: 2,
    selectedTargetScore: 100,

    // Local / Game Board State
    fullSet: [], 
    boneyard: [], 
    playerHand: [], 
    comp1Hand: [], 
    comp2Hand: [], 
    boardChain: [],
    gameMode: 2, 
    currentTurn: 'player', 
    selectedTileIndex: null,
    leftEndValue: null, 
    rightEndValue: null, 
    isGameOver: false, 
    centerTileIndex: 0,
    
    // Timer
    turnTimerInterval: null, 
    timeLeft: 20,

    // أضف هذه السطور داخل كائن export const state = { ... }
    playerName: localStorage.getItem("dominoPlayerName") || "لاعب",
    roomNames: { host: "انتظار...", guest1: "انتظار...", guest2: "انتظار..." },

};
