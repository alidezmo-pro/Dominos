// ui.js
import { state } from './state.js';

export function showToast(msg, duration = 2500) {
    let toast = document.getElementById("toast-msg");
    if (!toast) return;
    toast.innerText = msg;
    toast.classList.remove("hidden");
    setTimeout(() => { toast.classList.add("hidden"); }, duration);
}

export function showStartModal() {
    document.getElementById("start-modal")?.classList.remove("hidden");
    document.getElementById("end-modal")?.classList.add("hidden");
}

export function setSelectPlayers(count, btn) {
    state.selectedPlayersCount = count;
    btn.parentElement.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

export function setSelectScore(score, btn) {
    state.selectedTargetScore = score;
    btn.parentElement.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

// === دالة جديدة لتحديث أسماء اللاعبين فوق الصور (الـ Avatars) ===
export function updateNamesUI() {
    if (!state.isOnline) return;

    let comp1NameEl = document.getElementById('comp1-name');
    let comp2NameEl = document.getElementById('comp2-name');

    if (state.playerRole === 'host') {
        if (comp1NameEl) comp1NameEl.innerText = state.roomNames.guest1 || "في الانتظار...";
        if (comp2NameEl) comp2NameEl.innerText = state.roomNames.guest2 || "في الانتظار...";
    } else if (state.playerRole === 'guest1') {
        if (comp1NameEl) comp1NameEl.innerText = state.roomNames.host || "صاحب الغرفة";
        if (comp2NameEl) comp2NameEl.innerText = state.roomNames.guest2 || "في الانتظار...";
    } else if (state.playerRole === 'guest2') {
        if (comp1NameEl) comp1NameEl.innerText = state.roomNames.host || "صاحب الغرفة";
        if (comp2NameEl) comp2NameEl.innerText = state.roomNames.guest1 || "الخصم 1";
    }
}

// === الدالة المعدلة لعرض الأسماء الحقيقية في لوحة النتائج بدلاً من "صاحب الغرفة/الخصم" ===
export function updateScoreUI() {
    let sb = document.getElementById("scoreboard-container");
    if (!sb) return;
    
    let p1Name = "أنت";
    let p2Name = (state.playerRole === 'host') ? (state.roomNames.guest1 || "الخصم 1") : (state.roomNames.host || "صاحب الغرفة");
    
    let myScore = state.roomScores[state.playerRole] || 0;
    let p2Score = (state.playerRole === 'host') ? state.roomScores.guest1 : state.roomScores.host;
    
    let html = `<div class="score-target">الهدف: <b>${state.targetScore}</b> 🏆</div>`;
    html += `<div class="score-players">`;
    html += `<div class="score-box">${p1Name}: <span>${myScore}</span></div>`;
    html += `<div class="score-box">${p2Name}: <span>${p2Score}</span></div>`;
    
    if (state.roomMaxPlayers === 3) {
        let p3Name = (state.playerRole === 'guest2') ? (state.roomNames.guest1 || "الخصم 1") : (state.roomNames.guest2 || "الخصم 2");
        let p3Score = (state.playerRole === 'host') ? state.roomScores.guest2 : (state.playerRole === 'guest1' ? state.roomScores.guest2 : state.roomScores.guest1);
        html += `<div class="score-box">${p3Name}: <span>${p3Score}</span></div>`;
    }
    html += `</div>`;
    
    sb.innerHTML = html;
    sb.classList.remove("hidden");
}

export function updateTurnStatus() {
    if (state.isGameOver) {
        clearInterval(state.turnTimerInterval);
        document.querySelectorAll('.avatar-timer').forEach(el => el.remove());
        return;
    }
    document.getElementById("player-avatar")?.classList.remove("active-neon-player");
    document.getElementById("comp1-avatar")?.classList.remove("active-neon-comp");
    document.getElementById("comp2-avatar")?.classList.remove("active-neon-comp");

    if (state.currentTurn === 'player') document.getElementById("player-avatar")?.classList.add("active-neon-player");
    else if (state.currentTurn === 'comp1') document.getElementById("comp1-avatar")?.classList.add("active-neon-comp");
    else if (state.currentTurn === 'comp2') document.getElementById("comp2-avatar")?.classList.add("active-neon-comp");
}

export function endGame(message) {
    state.isGameOver = true;
    clearInterval(state.turnTimerInterval); 
    document.querySelectorAll('.avatar-timer').forEach(el => el.remove());
    
    let endTitle = document.getElementById("end-title");
    if (endTitle) endTitle.innerText = message;
    
    document.getElementById("end-modal")?.classList.remove("hidden");
}
