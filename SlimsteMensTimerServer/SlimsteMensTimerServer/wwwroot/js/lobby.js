/* lobby.js — manages the lobby page */

(function () {
    'use strict';

    // ── State ────────────────────────────────────────────────────────────────

    let sessionId = null;
    let connection = null;

    // ── DOM refs ─────────────────────────────────────────────────────────────

    const landingView    = document.getElementById('landing');
    const lobbyView      = document.getElementById('lobby');
    const btnNewSession  = document.getElementById('btnNewSession');
    const btnStartGame   = document.getElementById('btnStartGame');
    const sessionCode    = document.getElementById('sessionCode');
    const qrImage        = document.getElementById('qrImage');
    const qrLink         = document.getElementById('qrLink');
    const playerList     = document.getElementById('playerList');
    const bannerText     = document.getElementById('bannerText');

    // ── Landing → Create session ─────────────────────────────────────────────

    btnNewSession.addEventListener('click', async () => {
        btnNewSession.disabled = true;
        try {
            const resp = await fetch('/api/sessions', { method: 'POST' });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            sessionId = data.sessionId;
            showLobby(data.sessionId);
        } catch (err) {
            console.error('Failed to create session:', err);
            alert('Kon geen sessie aanmaken. Probeer opnieuw.');
        } finally {
            btnNewSession.disabled = false;
        }
    });

    // ── Lobby: show QR + player list ─────────────────────────────────────────

    function showLobby(id) {
        sessionId = id;
        sessionCode.textContent = id;
        qrImage.src = `/api/sessions/${id}/qr`;
        qrLink.href = `/join/${id}`;
        landingView.style.display = 'none';
        lobbyView.style.display   = 'block';
        connectSignalR(id);
        loadPlayers(id);

        // keep URL in sync so a reload returns to this lobby
        history.replaceState(null, '', `/lobby.html?session=${id}`);
    }

    async function loadPlayers(id) {
        try {
            const resp = await fetch(`/api/sessions/${id}/players`);
            if (!resp.ok) return;
            const players = await resp.json();
            playerList.innerHTML = '';
            players.forEach(addPlayerItem);
            updateStartButton(players.length);
        } catch { /* ignore — SignalR will keep it up to date */ }
    }

    function addPlayerItem(player) {
        // Remove empty hint if present
        const hint = playerList.querySelector('.empty-hint');
        if (hint) hint.remove();

        const li = document.createElement('li');
        li.className = 'player-item';
        li.id = `player-${player.playerId}`;
        li.textContent = player.playerName;
        playerList.appendChild(li);
    }

    function updateStartButton(count) {
        btnStartGame.disabled = count === 0;
    }

    // ── Start game ───────────────────────────────────────────────────────────

    btnStartGame.addEventListener('click', async () => {
        btnStartGame.disabled = true;
        try {
            const resp = await fetch(`/api/sessions/${sessionId}/start`, { method: 'POST' });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            // GameStarted event will navigate — but navigate directly too as fallback
            window.location.href = `/scoreboard.html?session=${sessionId}`;
        } catch (err) {
            console.error('Failed to start session:', err);
            btnStartGame.disabled = false;
        }
    });

    // ── SignalR ──────────────────────────────────────────────────────────────

    function connectSignalR(id) {
        connection = new signalR.HubConnectionBuilder()
            .withUrl('/gamehub')
            .withAutomaticReconnect()
            .build();

        connection.on('PlayerJoined', (playerId, playerName) => {
            addPlayerItem({ playerId, playerName });
            updateStartButton(playerList.querySelectorAll('.player-item').length);
        });

        connection.on('GameStarted', () => {
            window.location.href = `/scoreboard.html?session=${id}`;
        });

        connection.on('GameEnded', () => {
            bannerText.textContent = 'Sessie beëindigd.';
            bannerText.closest('.banner').style.display = 'block';
            btnStartGame.disabled = true;
        });

        connection.start()
            .then(() => connection.invoke('JoinSessionGroup', id))
            .catch(err => console.error('SignalR connect error:', err));
    }

    // ── On page load: check for ?session= query param ────────────────────────

    const params = new URLSearchParams(window.location.search);
    const existingSession = params.get('session');
    if (existingSession) {
        showLobby(existingSession);
    }

}());
