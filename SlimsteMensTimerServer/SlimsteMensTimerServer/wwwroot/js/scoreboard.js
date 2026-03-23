/* scoreboard.js — manages the real-time scoreboard page */

(function () {
    'use strict';

    // ── State ────────────────────────────────────────────────────────────────

    const params    = new URLSearchParams(window.location.search);
    const sessionId = params.get('session');

    // ── DOM refs ─────────────────────────────────────────────────────────────

    const grid       = document.getElementById('scoreGrid');
    const banner     = document.getElementById('banner');
    const sessionEl  = document.getElementById('sessionSubtitle');
    const btnEnd     = document.getElementById('btnEndGame');
    const btnNew     = document.getElementById('btnNewGame');

    // ── Guard ────────────────────────────────────────────────────────────────

    if (!sessionId) {
        banner.textContent = 'Geen sessie opgegeven.';
        banner.style.display = 'block';
        btnEnd.style.display = 'none';
    } else {
        sessionEl.textContent = `Sessie: ${sessionId}`;
        init();
    }

    // ── Host controls ────────────────────────────────────────────────────────

    btnEnd.addEventListener('click', async () => {
        btnEnd.disabled = true;
        try {
            const resp = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
            if (resp.ok) {
                showGameEnded(); // update host UI immediately; other tabs get it via SignalR
            } else {
                btnEnd.disabled = false;
            }
        } catch (err) {
            console.error('Failed to end session:', err);
            btnEnd.disabled = false;
        }
    });

    btnNew.addEventListener('click', () => {
        window.location.href = '/lobby.html';
    });

    function showGameEnded() {
        banner.innerHTML = 'Het spel is afgelopen. <a href="/lobby.html" class="banner-link">Nieuw Spel</a>';
        banner.style.display = 'block';
        btnEnd.style.display = 'none';
        btnNew.style.display = 'inline-block';
    }

    // ── Init ─────────────────────────────────────────────────────────────────

    async function init() {
        await loadPlayers();
        connectSignalR();
    }

    async function loadPlayers() {
        try {
            const resp = await fetch(`/api/sessions/${sessionId}/players`);
            if (!resp.ok) return;
            const players = await resp.json();
            players.forEach(p => upsertTile(p.playerId, p.playerName, p.score, p.isStale));
        } catch (err) {
            console.error('Failed to load players:', err);
        }
    }

    // ── Tile management ───────────────────────────────────────────────────────

    function tileId(playerId) {
        return `tile-${playerId}`;
    }

    function upsertTile(playerId, playerName, score, isStale) {
        let tile = document.getElementById(tileId(playerId));
        if (!tile) {
            tile = document.createElement('div');
            tile.className = 'player-tile';
            tile.id = tileId(playerId);
            tile.innerHTML = `<div class="score">0</div><div class="name"></div>`;
            grid.appendChild(tile);
        }
        tile.querySelector('.score').textContent = score;
        tile.querySelector('.name').textContent  = playerName;
        tile.classList.toggle('stale', !!isStale);
    }

    function setTileStale(playerId, stale) {
        const tile = document.getElementById(tileId(playerId));
        if (tile) tile.classList.toggle('stale', stale);
    }

    // ── SignalR ──────────────────────────────────────────────────────────────

    function connectSignalR() {
        const connection = new signalR.HubConnectionBuilder()
            .withUrl('/gamehub')
            .withAutomaticReconnect()
            .build();

        connection.on('PlayerJoined', (playerId, playerName, score) => {
            upsertTile(playerId, playerName, score, false);
        });

        connection.on('ScoreUpdated', (playerId, playerName, score) => {
            upsertTile(playerId, playerName, score, false);
        });

        connection.on('PlayerWentStale', (playerId) => {
            setTileStale(playerId, true);
        });

        connection.on('PlayerReturned', (playerId) => {
            setTileStale(playerId, false);
        });

        connection.on('GameEnded', () => {
            showGameEnded();
        });

        connection.start()
            .then(() => connection.invoke('JoinSessionGroup', sessionId))
            .catch(err => console.error('SignalR connect error:', err));
    }

}());
