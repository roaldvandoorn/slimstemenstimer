/* player.js — browser-based player client */

(function () {
    'use strict';

    // ── Constants ────────────────────────────────────────────────────────────

    const HEARTBEAT_MS   = 15000; // 15 s — same as Android app
    const SCORE_MIN      = 0;
    const SCORE_MAX      = 1000;
    const SCORE_STEP     = 20;
    const SCORE_DEFAULT  = 60;

    // ── State ────────────────────────────────────────────────────────────────

    const params    = new URLSearchParams(window.location.search);
    const sessionId = params.get('session');

    let playerId          = null;
    let score             = SCORE_DEFAULT;
    let timerRunning      = false;
    let timerInterval     = null;
    let heartbeatInterval = null;
    let gameEnded         = false;
    let hubConnection     = null;

    // ── DOM refs ─────────────────────────────────────────────────────────────

    const joinView    = document.getElementById('joinView');
    const waitView    = document.getElementById('waitView');
    const gameView    = document.getElementById('gameView');

    const nameInput   = document.getElementById('nameInput');
    const btnJoin     = document.getElementById('btnJoin');
    const joinError   = document.getElementById('joinError');

    const ownNameEl   = document.getElementById('ownName');
    const ownScoreEl  = document.getElementById('ownScore');
    const btnStart    = document.getElementById('btnStart');
    const btnMinus    = document.getElementById('btnMinus');
    const btnPlus     = document.getElementById('btnPlus');
    const btnReset    = document.getElementById('btnReset');
    const gameBanner  = document.getElementById('gameBanner');

    const othersSidebar    = document.getElementById('othersSidebar');
    const othersBottom     = document.getElementById('othersBottom');
    const btnPlayerCorrect = document.getElementById('btnPlayerCorrect');
    const btnPlayerWrong   = document.getElementById('btnPlayerWrong');

    // ── Guard: must have ?session= ────────────────────────────────────────────

    if (!sessionId) {
        window.location.href = '/lobby.html';
        return;
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    function showView(view) {
        [joinView, waitView, gameView].forEach(v => v.style.display = 'none');
        // gameView uses .player-layout { display: flex } from CSS — remove inline override
        if (view === gameView) {
            gameView.style.removeProperty('display');
        } else {
            view.style.display = 'block';
        }
    }

    // ── Join flow ─────────────────────────────────────────────────────────────

    btnJoin.addEventListener('click', joinSession);
    nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') joinSession(); });

    async function joinSession() {
        const name = nameInput.value.trim();
        if (!name) { joinError.textContent = 'Vul je naam in.'; return; }

        btnJoin.disabled = true;
        joinError.textContent = '';

        try {
            const resp = await fetch(`/api/sessions/${sessionId}/players`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerName: name })
            });

            if (resp.status === 409) { joinError.textContent = 'Naam al in gebruik of sessie is vol.'; return; }
            if (resp.status === 422) { joinError.textContent = 'Dit spel is al afgelopen.'; return; }
            if (resp.status === 404) { joinError.textContent = 'Sessie niet gevonden.'; return; }
            if (!resp.ok)            { joinError.textContent = `Aanmelden mislukt (${resp.status}).`; return; }

            const data = await resp.json();
            playerId = data.playerId;
            score    = data.score;

            ownNameEl.textContent = name;
            updateOwnScore(score);
            startHeartbeat();

            // Fetch session state to decide which view to show next
            const sessResp = await fetch(`/api/sessions/${sessionId}`);
            const state    = sessResp.ok ? (await sessResp.json()).state : null;

            connectSignalR();

            if (state === 'Active') {
                await loadOtherPlayers();
                showView(gameView);
            } else {
                showView(waitView);
            }
        } catch (err) {
            console.error('Join error:', err);
            joinError.textContent = 'Verbindingsfout. Probeer opnieuw.';
        } finally {
            btnJoin.disabled = false;
        }
    }

    // ── Heartbeat ─────────────────────────────────────────────────────────────

    function startHeartbeat() {
        heartbeatInterval = setInterval(async () => {
            try {
                await fetch(`/api/sessions/${sessionId}/players/${playerId}/heartbeat`,
                    { method: 'POST' });
            } catch { /* ignore — network blip */ }
        }, HEARTBEAT_MS);
    }

    // ── Timer ─────────────────────────────────────────────────────────────────

    btnStart.addEventListener('click', toggleTimer);

    function toggleTimer() {
        if (gameEnded) return;
        timerRunning ? stopTimer() : startTimer();
    }

    function startTimer() {
        timerRunning = true;
        btnStart.textContent = '⏸ Stop';
        timerInterval = setInterval(tickTimer, 1000);
        if (hubConnection) hubConnection.invoke('BroadcastTimerStarted', sessionId, playerId).catch(() => {});
    }

    function stopTimer() {
        timerRunning = false;
        btnStart.textContent = '▶ Start';
        clearInterval(timerInterval);
        timerInterval = null;
        if (hubConnection) hubConnection.invoke('BroadcastTimerStopped', sessionId, playerId).catch(() => {});
    }

    function tickTimer() {
        if (score <= SCORE_MIN) { stopTimer(); return; }
        applyScore(score - 1);
    }

    // ── Score ─────────────────────────────────────────────────────────────────

    btnMinus.addEventListener('click', () => { if (!gameEnded) applyScore(score - SCORE_STEP); });
    btnPlus.addEventListener('click',  () => { if (!gameEnded) applyScore(score + SCORE_STEP); });

    btnPlayerCorrect.addEventListener('click', () => {
        if (gameEnded || !hubConnection) return;
        hubConnection.invoke('BroadcastAnswerSound', sessionId, 'correct').catch(() => {});
    });

    btnPlayerWrong.addEventListener('click', () => {
        if (gameEnded || !hubConnection) return;
        hubConnection.invoke('BroadcastAnswerSound', sessionId, 'wrong').catch(() => {});
    });
    btnReset.addEventListener('click', () => {
        if (gameEnded) return;
        stopTimer();
        applyScore(SCORE_DEFAULT);
    });

    async function applyScore(newScore) {
        newScore = Math.min(SCORE_MAX, Math.max(SCORE_MIN, newScore));
        if (newScore === score) return;
        score = newScore;
        ownScoreEl.textContent = score;
        try {
            await fetch(`/api/sessions/${sessionId}/players/${playerId}/score`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ score })
            });
        } catch (err) {
            console.error('Score push failed:', err);
        }
    }

    function updateOwnScore(s) {
        ownScoreEl.textContent = s;
    }

    // ── Other players ─────────────────────────────────────────────────────────

    async function loadOtherPlayers() {
        try {
            const resp = await fetch(`/api/sessions/${sessionId}/players`);
            if (!resp.ok) return;
            const players = await resp.json();
            players
                .filter(p => p.playerId !== playerId)
                .forEach(p => upsertOtherTile(p.playerId, p.playerName, p.score, p.isStale));
        } catch { /* SignalR will keep it up to date */ }
    }

    function upsertOtherTile(pid, name, tileScore, isStale) {
        [othersSidebar, othersBottom].forEach(container => {
            const id = `${container.id}-${pid}`;
            let tile = document.getElementById(id);
            if (!tile) {
                tile = document.createElement('div');
                tile.className = 'others-tile';
                tile.id = id;
                tile.innerHTML = '<div class="others-score"></div><div class="others-name"></div>';
                container.appendChild(tile);
            }
            tile.querySelector('.others-score').textContent = tileScore;
            tile.querySelector('.others-name').textContent  = name;
            tile.classList.toggle('stale', !!isStale);
        });
    }

    function setOtherTileStale(pid, stale) {
        [othersSidebar, othersBottom].forEach(container => {
            const tile = document.getElementById(`${container.id}-${pid}`);
            if (tile) tile.classList.toggle('stale', stale);
        });
    }

    function updateOtherTileScore(pid, name, tileScore) {
        [othersSidebar, othersBottom].forEach(container => {
            const tile = document.getElementById(`${container.id}-${pid}`);
            if (tile) {
                tile.querySelector('.others-score').textContent = tileScore;
                tile.querySelector('.others-name').textContent  = name;
                tile.classList.remove('stale');
            } else {
                upsertOtherTile(pid, name, tileScore, false);
            }
        });
    }

    // ── Game ended ────────────────────────────────────────────────────────────

    function onGameEnded() {
        gameEnded = true;
        stopTimer();
        clearInterval(heartbeatInterval);
        btnStart.disabled         = true;
        btnMinus.disabled         = true;
        btnPlus.disabled          = true;
        btnReset.disabled         = true;
        btnPlayerCorrect.disabled = true;
        btnPlayerWrong.disabled   = true;
        gameBanner.style.display = 'block';
        // Make sure we're on the game view (could still be in wait view)
        showView(gameView);
    }

    // ── SignalR ──────────────────────────────────────────────────────────────

    function connectSignalR() {
        const connection = hubConnection = new signalR.HubConnectionBuilder()
            .withUrl('/gamehub')
            .withAutomaticReconnect()
            .build();

        connection.on('GameStarted', async () => {
            await loadOtherPlayers();
            showView(gameView);
        });

        connection.on('GameEnded', onGameEnded);

        connection.on('PlayerJoined', (pid, name, s) => {
            if (pid !== playerId) upsertOtherTile(pid, name, s, false);
        });

        connection.on('ScoreUpdated', (pid, name, s) => {
            if (pid === playerId) {
                score = s;
                updateOwnScore(s);
            } else {
                updateOtherTileScore(pid, name, s);
            }
        });

        connection.on('PlayerWentStale', pid => {
            if (pid !== playerId) setOtherTileStale(pid, true);
        });

        connection.on('PlayerReturned', pid => {
            if (pid !== playerId) setOtherTileStale(pid, false);
        });

        connection.start()
            .then(() => connection.invoke('JoinSessionGroup', sessionId))
            .catch(err => console.error('SignalR connect error:', err));
    }

    // ── Initialise: show join view ────────────────────────────────────────────

    document.getElementById('joinSessionCode').textContent = `Sessie ${sessionId}`;
    showView(joinView);
    nameInput.focus();

}());
