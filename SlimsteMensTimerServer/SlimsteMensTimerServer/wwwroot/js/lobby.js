/* lobby.js — manages the lobby page */

(function () {
    'use strict';

    // ── State ────────────────────────────────────────────────────────────────

    let sessionId    = null;
    let connection   = null;
    let playerOrder  = []; // [{playerId, playerName}, ...] — display/game order
    let dragSrcIndex = null;

    // ── DOM refs ─────────────────────────────────────────────────────────────

    const landingView   = document.getElementById('landing');
    const lobbyView     = document.getElementById('lobby');
    const btnNewSession = document.getElementById('btnNewSession');
    const btnStartGame  = document.getElementById('btnStartGame');
    const sessionCode   = document.getElementById('sessionCode');
    const qrImage       = document.getElementById('qrImage');
    const qrLink        = document.getElementById('qrLink');
    const playerList    = document.getElementById('playerList');
    const bannerText    = document.getElementById('bannerText');

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
            const resp = await fetch(`/api/sessions/${id}`);
            if (!resp.ok) return;
            const data = await resp.json();

            // Restore the saved drag order if present, otherwise use join order
            const players = Array.isArray(data.players) ? data.players : [];
            if (data.playerOrder && data.playerOrder.length > 0) {
                playerOrder = data.playerOrder
                    .map(pid => players.find(p => p.playerId === pid))
                    .filter(Boolean)
                    .map(p => ({ playerId: p.playerId, playerName: p.playerName }));
            } else {
                playerOrder = players.map(p => ({ playerId: p.playerId, playerName: p.playerName }));
            }

            renderPlayerList();
            updateStartButton();
        } catch { /* ignore — SignalR will keep it up to date */ }
    }

    // ── Player list rendering ────────────────────────────────────────────────

    function renderPlayerList() {
        playerList.innerHTML = '';

        if (playerOrder.length === 0) {
            const li = document.createElement('li');
            li.className = 'empty-hint';
            li.textContent = 'Wacht op spelers…';
            playerList.appendChild(li);
            return;
        }

        playerOrder.forEach((player, index) => {
            const li = document.createElement('li');
            li.className = 'player-item';
            li.id        = `player-${player.playerId}`;
            li.draggable = true;
            li.dataset.index = index;

            const nameSpan = document.createElement('span');
            nameSpan.textContent = player.playerName;
            li.appendChild(nameSpan);

            if (index === playerOrder.length - 1) {
                const badge = document.createElement('span');
                badge.className   = 'quizmaster-badge';
                badge.textContent = 'Quizmaster';
                li.appendChild(badge);
            }

            li.addEventListener('dragstart',  onDragStart);
            li.addEventListener('dragover',   onDragOver);
            li.addEventListener('dragleave',  onDragLeave);
            li.addEventListener('drop',       onDrop);
            li.addEventListener('dragend',    onDragEnd);

            playerList.appendChild(li);
        });
    }

    // ── Drag-and-drop handlers ───────────────────────────────────────────────

    function onDragStart(e) {
        dragSrcIndex = parseInt(e.currentTarget.dataset.index);
        e.dataTransfer.effectAllowed = 'move';
    }

    function onDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        e.currentTarget.classList.add('drag-over');
    }

    function onDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }

    function onDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        const targetIndex = parseInt(e.currentTarget.dataset.index);
        if (dragSrcIndex === null || dragSrcIndex === targetIndex) return;

        const moved = playerOrder.splice(dragSrcIndex, 1)[0];
        playerOrder.splice(targetIndex, 0, moved);
        dragSrcIndex = null;
        renderPlayerList();
        putPlayerOrder();
    }

    function onDragEnd(e) {
        e.currentTarget.classList.remove('drag-over');
        dragSrcIndex = null;
    }

    async function putPlayerOrder() {
        if (!sessionId) return;
        try {
            await fetch(`/api/sessions/${sessionId}/playerorder`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order: playerOrder.map(p => p.playerId) })
            });
        } catch (err) {
            console.error('Failed to save player order:', err);
        }
    }

    // ── Start button state ───────────────────────────────────────────────────

    function updateStartButton() {
        const count = playerOrder.length;
        btnStartGame.disabled = count < 3;

        let hint = document.getElementById('startHint');
        if (count > 0 && count < 3) {
            if (!hint) {
                hint = document.createElement('p');
                hint.id        = 'startHint';
                hint.className = 'start-hint';
                btnStartGame.insertAdjacentElement('afterend', hint);
            }
            hint.textContent = `Minimaal 3 spelers nodig (${count} van 3)`;
        } else if (hint) {
            hint.remove();
        }
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
            if (!playerOrder.find(p => p.playerId === playerId)) {
                playerOrder.push({ playerId, playerName });
                renderPlayerList();
                updateStartButton();
                // Persist the new join-order addition to the server
                putPlayerOrder();
            }
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
