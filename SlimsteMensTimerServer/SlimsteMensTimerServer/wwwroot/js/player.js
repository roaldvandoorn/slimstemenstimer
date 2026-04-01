/* player.js — browser-based player client */

(function () {
    'use strict';

    // ── Constants ────────────────────────────────────────────────────────────

    const HEARTBEAT_MS  = 15000;
    const SCORE_MIN     = 0;
    const SCORE_MAX     = 1000;
    const SCORE_STEP    = 20;
    const SCORE_DEFAULT = 60;

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

    let currentContext = null;  // last RoundContext from server
    let currentRole    = null;  // 'candidate' | 'quizmaster' | 'other' | 'finalist-active' | 'finalist-inactive'
    let currentRound   = 'None';

    // ── DOM refs ─────────────────────────────────────────────────────────────

    const joinView  = document.getElementById('joinView');
    const waitView  = document.getElementById('waitView');
    const gameView  = document.getElementById('gameView');

    const nameInput = document.getElementById('nameInput');
    const btnJoin   = document.getElementById('btnJoin');
    const joinError = document.getElementById('joinError');

    const ownNameEl  = document.getElementById('ownName');
    const ownScoreEl = document.getElementById('ownScore');
    const gameBanner = document.getElementById('gameBanner');

    const btnStart   = document.getElementById('btnStart');
    const btnMinus   = document.getElementById('btnMinus');
    const btnPlus    = document.getElementById('btnPlus');
    const btnReset   = document.getElementById('btnReset');
    const btnKlaar   = document.getElementById('btnKlaar');
    const btnVolgende = document.getElementById('btnVolgende');
    const klaarPanel     = document.getElementById('klaarPanel');
    const ingelijstPanel = document.getElementById('ingelijstPanel');

    const btnPlayerCorrect = document.getElementById('btnPlayerCorrect');
    const btnPlayerWrong   = document.getElementById('btnPlayerWrong');

    const othersSidebar = document.getElementById('othersSidebar');
    const othersBottom  = document.getElementById('othersBottom');

    // ── Guard ────────────────────────────────────────────────────────────────

    if (!sessionId) {
        window.location.href = '/lobby.html';
        return;
    }

    // ── Identity persistence ─────────────────────────────────────────────────

    const STORAGE_KEY = `player-${sessionId}`;

    function saveIdentity(pid, name) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ playerId: pid, playerName: name }));
    }

    function clearIdentity() { localStorage.removeItem(STORAGE_KEY); }

    function loadIdentity() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); }
        catch { return null; }
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    function showView(view) {
        [joinView, waitView, gameView].forEach(v => v.style.display = 'none');
        if (view === gameView) gameView.style.removeProperty('display');
        else view.style.display = 'block';
    }

    // ── Role system ───────────────────────────────────────────────────────────

    function deriveRole(ctx) {
        if (!ctx || ctx.round === 'None') return null;

        if (ctx.round === 'Finale') {
            if (Array.isArray(ctx.finalistIds) && ctx.finalistIds.includes(playerId)) {
                return ctx.candidateId === playerId ? 'finalist-active' : 'finalist-inactive';
            }
            if (ctx.quizmasterId === playerId) return 'quizmaster';
            return 'other';
        }

        if (ctx.candidateId  === playerId) return 'candidate';
        if (ctx.quizmasterId === playerId) return 'quizmaster';
        return 'other';
    }

    function setRole(role, round) {
        currentRole  = role;
        currentRound = round || 'None';

        const inRound = role !== null && currentRound !== 'None';

        // Default: everything enabled only in pre-round state
        let minusEn   = !inRound;
        let plusEn    = !inRound;
        let startEn   = !inRound;
        let klaarEn   = false;
        let correctEn = !inRound;
        let wrongEn   = !inRound;
        let resetEn   = !inRound;
        let showIng   = false;

        if (inRound) {
            switch (role) {
                case 'candidate':
                    minusEn = true;
                    plusEn  = true;
                    if (currentRound !== 'Round369') {
                        startEn = true;
                        klaarEn = true;
                    }
                    break;

                case 'quizmaster':
                    if (currentRound === 'Ingelijst') {
                        showIng = true;
                    } else {
                        correctEn = true;
                        wrongEn   = true;
                    }
                    break;

                case 'finalist-active':
                    // Start/Stop only — countdown their score
                    startEn = true;
                    break;

                case 'finalist-inactive':
                    // −20 self-deduct (confirmed decision #3)
                    minusEn = true;
                    break;

                // 'other': all false
            }
        }

        btnMinus.disabled         = !minusEn;
        btnPlus.disabled          = !plusEn;
        btnStart.disabled         = !startEn;
        btnPlayerCorrect.disabled = !correctEn;
        btnPlayerWrong.disabled   = !wrongEn;
        btnReset.disabled         = !resetEn;
        btnKlaar.disabled         = !klaarEn;

        klaarPanel.style.display     = klaarEn  ? 'block' : 'none';
        ingelijstPanel.style.display = showIng  ? 'block' : 'none';
    }

    // ── Ingelijst tiles ───────────────────────────────────────────────────────

    document.querySelectorAll('.ingelijst-tile').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (btn.disabled || btn.classList.contains('correct')) return;
            const tileIndex = parseInt(btn.dataset.tile);
            btn.classList.add('correct');
            btn.disabled = true;
            try {
                await fetch(`/api/sessions/${sessionId}/rounds/marktile/${tileIndex}`,
                    { method: 'POST' });
            } catch (err) {
                console.error('marktile failed:', err);
            }
        });
    });

    function syncIngelijstTiles(answerTiles) {
        document.querySelectorAll('.ingelijst-tile').forEach(btn => {
            const i = parseInt(btn.dataset.tile);
            const marked = Array.isArray(answerTiles) && answerTiles[i];
            btn.classList.toggle('correct', marked);
            btn.disabled = marked;
        });
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
            saveIdentity(playerId, name);
            startHeartbeat();

            const sessResp = await fetch(`/api/sessions/${sessionId}`);
            const sessData = sessResp.ok ? await sessResp.json() : null;
            const state    = sessData ? sessData.state : null;

            connectSignalR();

            if (state === 'Active') {
                await loadOtherPlayers();
                if (sessData.roundContext && sessData.roundContext.round !== 'None') {
                    currentContext = sessData.roundContext;
                    setRole(deriveRole(sessData.roundContext), sessData.roundContext.round);
                    if (sessData.roundContext.round === 'Ingelijst') {
                        syncIngelijstTiles(sessData.roundContext.answerTiles);
                    }
                }
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
            } catch { /* ignore */ }
        }, HEARTBEAT_MS);
    }

    // ── Timer ─────────────────────────────────────────────────────────────────

    btnStart.addEventListener('click', toggleTimer);

    function toggleTimer() {
        if (gameEnded || btnStart.disabled) return;
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

    btnMinus.addEventListener('click', () => { if (!gameEnded && !btnMinus.disabled) applyScore(score - SCORE_STEP); });
    btnPlus.addEventListener('click',  () => { if (!gameEnded && !btnPlus.disabled)  applyScore(score + SCORE_STEP); });

    btnReset.addEventListener('click', () => {
        if (gameEnded || btnReset.disabled) return;
        stopTimer();
        applyScore(SCORE_DEFAULT);
    });

    btnPlayerCorrect.addEventListener('click', async () => {
        if (gameEnded || btnPlayerCorrect.disabled) return;
        if (currentRound === 'Round369') {
            // Quizmaster signals correct answer — REST handles tile + advance + sound
            btnPlayerCorrect.disabled = true;
            try {
                await fetch(`/api/sessions/${sessionId}/rounds/correct`, { method: 'POST' });
            } catch (err) {
                console.error('correct failed:', err);
            }
            btnPlayerCorrect.disabled = false;
        } else {
            if (!hubConnection) return;
            hubConnection.invoke('BroadcastAnswerSound', sessionId, 'correct').catch(() => {});
        }
    });

    btnPlayerWrong.addEventListener('click', async () => {
        if (gameEnded || btnPlayerWrong.disabled) return;
        if (currentRound === 'Round369') {
            // Quizmaster signals wrong answer — REST handles turn + sound
            btnPlayerWrong.disabled = true;
            try {
                await fetch(`/api/sessions/${sessionId}/rounds/nextturn`, { method: 'POST' });
            } catch (err) {
                console.error('nextturn failed:', err);
            }
            btnPlayerWrong.disabled = false;
        } else {
            if (!hubConnection) return;
            hubConnection.invoke('BroadcastAnswerSound', sessionId, 'wrong').catch(() => {});
        }
    });

    // ── Round controls ────────────────────────────────────────────────────────

    btnKlaar.addEventListener('click', async () => {
        if (btnKlaar.disabled) return;
        btnKlaar.disabled = true;
        try {
            await fetch(`/api/sessions/${sessionId}/rounds/nextturn`, { method: 'POST' });
        } catch (err) {
            console.error('nextturn failed:', err);
            btnKlaar.disabled = false;
        }
    });

    btnVolgende.addEventListener('click', async () => {
        if (btnVolgende.disabled) return;
        btnVolgende.disabled = true;
        try {
            await fetch(`/api/sessions/${sessionId}/rounds/nextquizmaster`, { method: 'POST' });
        } catch (err) {
            console.error('nextquizmaster failed:', err);
            btnVolgende.disabled = false;
        }
    });

    // ── Score apply ───────────────────────────────────────────────────────────

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

    function updateOwnScore(s) { ownScoreEl.textContent = s; }

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
        clearIdentity();
        setRole(null, 'None');
        btnStart.disabled = true;
        btnReset.disabled = true;
        gameBanner.style.display = 'block';
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

        // ── Round events ─────────────────────────────────────────────────────

        connection.on('RoundChanged', ctx => {
            currentContext = ctx;
            setRole(deriveRole(ctx), ctx.round);
            if (ctx.round === 'Ingelijst') {
                syncIngelijstTiles(ctx.answerTiles);
            }
        });

        connection.on('TurnAdvanced', (candidateId, quizmasterId) => {
            if (!currentContext) return;
            currentContext.candidateId  = candidateId;
            currentContext.quizmasterId = quizmasterId;
            setRole(deriveRole(currentContext), currentContext.round);
        });

        connection.on('TileMarked', (tileIndex, _round) => {
            // Keep ingelijst panel in sync if it's visible
            const btn = document.querySelector(`.ingelijst-tile[data-tile="${tileIndex}"]`);
            if (btn) { btn.classList.add('correct'); btn.disabled = true; }
        });

        connection.onreconnected(() =>
            connection.invoke('JoinSessionGroup', sessionId).catch(() => {}));

        connection.start()
            .then(() => connection.invoke('JoinSessionGroup', sessionId))
            .catch(err => console.error('SignalR connect error:', err));
    }

    // ── Resume ───────────────────────────────────────────────────────────────

    async function tryResume(pid, name) {
        try {
            const hbResp = await fetch(
                `/api/sessions/${sessionId}/players/${pid}/heartbeat`,
                { method: 'POST' });

            if (hbResp.status === 404) {
                clearIdentity();
                showView(joinView);
                nameInput.focus();
                return;
            }

            const sessResp = await fetch(`/api/sessions/${sessionId}`);
            if (!sessResp.ok) {
                clearIdentity();
                showView(joinView);
                nameInput.focus();
                return;
            }
            const sessData = await sessResp.json();
            const me = sessData.players.find(p => p.playerId === pid);

            playerId = pid;
            score    = me ? me.score : SCORE_DEFAULT;
            ownNameEl.textContent = name;
            updateOwnScore(score);
            startHeartbeat();
            connectSignalR();

            sessData.players
                .filter(p => p.playerId !== pid)
                .forEach(p => upsertOtherTile(p.playerId, p.playerName, p.score, p.isStale));

            if (sessData.state === 'Ended') {
                showView(gameView);
                onGameEnded();
            } else if (sessData.state === 'Active') {
                if (sessData.roundContext && sessData.roundContext.round !== 'None') {
                    currentContext = sessData.roundContext;
                    setRole(deriveRole(sessData.roundContext), sessData.roundContext.round);
                    if (sessData.roundContext.round === 'Ingelijst') {
                        syncIngelijstTiles(sessData.roundContext.answerTiles);
                    }
                }
                showView(gameView);
            } else {
                showView(waitView);
            }
        } catch (err) {
            console.error('Resume failed:', err);
            clearIdentity();
            showView(joinView);
            nameInput.focus();
        }
    }

    // ── Initialise ───────────────────────────────────────────────────────────

    document.getElementById('joinSessionCode').textContent = `Sessie ${sessionId}`;

    const saved = loadIdentity();
    if (saved) {
        tryResume(saved.playerId, saved.playerName);
    } else {
        showView(joinView);
        nameInput.focus();
    }

}());
