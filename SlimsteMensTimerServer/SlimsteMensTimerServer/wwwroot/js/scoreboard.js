/* scoreboard.js — manages the real-time scoreboard page */

(function () {
    'use strict';

    // ── State ────────────────────────────────────────────────────────────────

    const params    = new URLSearchParams(window.location.search);
    const sessionId = params.get('session');

    let currentContext = null;  // last received RoundContext

    // ── DOM refs ─────────────────────────────────────────────────────────────

    const grid           = document.getElementById('scoreGrid');
    const banner         = document.getElementById('banner');
    const sessionEl      = document.getElementById('sessionSubtitle');
    const btnEnd         = document.getElementById('btnEndGame');
    const btnNew         = document.getElementById('btnNewGame');
    const btnMute        = document.getElementById('btnMute');
    const roundHeaderEl  = document.getElementById('roundHeader');
    const roundNameEl    = document.getElementById('roundName');
    const roundTilesEl   = document.getElementById('roundTiles');
    const roundControlsEl = document.getElementById('roundControls');

    // ── Sound engine ─────────────────────────────────────────────────────────

    const sounds = {
        gameStart: new Audio('/audio/game-start.mp3'),
        clock:     new Audio('/audio/clock-tick.mp3'),
        scoreZero: new Audio('/audio/score-zero.mp3'),
        correct:   new Audio('/audio/correct.mp3'),
        wrong:     new Audio('/audio/wrong.mp3'),
    };
    sounds.clock.loop = true;

    let muted        = false;
    let activeTimers = new Set();

    function playSound(sound) {
        if (muted) return;
        sound.currentTime = 0;
        sound.play().catch(() => {});
    }

    function updateClockLoop() {
        if (activeTimers.size > 0) {
            if (sounds.clock.paused) playSound(sounds.clock);
        } else {
            sounds.clock.pause();
            sounds.clock.currentTime = 0;
        }
    }

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
                showGameEnded();
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

    // ── Mute toggle ───────────────────────────────────────────────────────────

    btnMute.addEventListener('click', () => {
        muted = !muted;
        if (muted) {
            sounds.clock.pause();
            btnMute.textContent = '🔇';
            btnMute.title = 'Geluid uit';
            btnMute.classList.add('muted');
        } else {
            updateClockLoop();
            btnMute.textContent = '🔊';
            btnMute.title = 'Geluid aan';
            btnMute.classList.remove('muted');
        }
    });

    function showGameEnded() {
        banner.innerHTML = 'Het spel is afgelopen. <a href="/lobby.html" class="banner-link">Nieuw Spel</a>';
        banner.style.display = 'block';
        btnEnd.style.display = 'none';
        btnNew.style.display = 'inline-block';
        roundHeaderEl.style.display = 'none';
        roundTilesEl.style.display  = 'none';
        roundControlsEl.style.display = 'none';
    }

    // ── Init ─────────────────────────────────────────────────────────────────

    async function init() {
        await loadSession();
        connectSignalR();
        playSound(sounds.gameStart);
    }

    async function loadSession() {
        try {
            const resp = await fetch(`/api/sessions/${sessionId}`);
            if (!resp.ok) return;
            const data = await resp.json();

            // Render player tiles
            if (Array.isArray(data.players)) {
                data.players.forEach(p => upsertTile(p.playerId, p.playerName, p.score, p.isStale));
            }

            // Restore round state if game is already in progress
            if (data.roundContext && data.roundContext.round !== 'None') {
                renderRound(data.roundContext);
            }
        } catch (err) {
            console.error('Failed to load session:', err);
        }
    }

    // ── Score tile management ─────────────────────────────────────────────────

    function tileId(playerId) { return `tile-${playerId}`; }

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

        // Re-apply role highlights if a round is active
        if (currentContext) highlightRoles(currentContext);
    }

    function setTileStale(playerId, stale) {
        const tile = document.getElementById(tileId(playerId));
        if (tile) tile.classList.toggle('stale', stale);
    }

    // ── Round rendering ───────────────────────────────────────────────────────

    const ROUND_LABELS = {
        Round369:  '3-6-9',
        OpenDeur:  'Open Deur',
        Puzzel:    'Puzzel',
        Ingelijst: 'Ingelijst',
        Finale:    'Finale',
    };
    const SCORING_QUESTIONS = new Set([3, 6, 9, 12, 15]);

    function renderRound(ctx) {
        currentContext = ctx;

        // Round header
        const label = ROUND_LABELS[ctx.round] || '';
        if (label) {
            const suffix = ctx.round === 'Round369'
                ? ` — Vraag ${Math.min(ctx.questionIndex, 15)} / 15`
                : '';
            roundNameEl.textContent = label + suffix;
            roundHeaderEl.style.display = 'block';
        } else {
            roundHeaderEl.style.display = 'none';
        }

        // Score tile visibility (Finale hides non-finalists)
        document.querySelectorAll('.player-tile').forEach(tile => {
            const pid = tile.id.replace('tile-', '');
            if (ctx.round === 'Finale') {
                tile.style.display = ctx.finalistIds.includes(pid) ? '' : 'none';
            } else {
                tile.style.display = '';
            }
        });

        // Role highlights
        highlightRoles(ctx);

        // Round-specific tile area
        renderRoundTiles(ctx);
    }

    function highlightRoles(ctx) {
        document.querySelectorAll('.player-tile').forEach(tile => {
            const pid = tile.id.replace('tile-', '');
            tile.classList.remove('candidate-highlight', 'quizmaster-highlight');
            if (pid === ctx.candidateId)   tile.classList.add('candidate-highlight');
            else if (pid === ctx.quizmasterId) tile.classList.add('quizmaster-highlight');
        });
    }

    function addStartRoundButton(roundName, label) {
        const btn = document.createElement('button');
        btn.className   = 'btn btn-start-round';
        btn.textContent = label;
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            try {
                await fetch(`/api/sessions/${sessionId}/rounds/start/${roundName}`, { method: 'POST' });
            } catch (err) {
                console.error(`start/${roundName} failed:`, err);
                btn.disabled = false;
            }
        });
        roundControlsEl.appendChild(btn);
        roundControlsEl.style.display = 'flex';
    }

    function renderRoundTiles(ctx) {
        roundTilesEl.innerHTML   = '';
        roundControlsEl.innerHTML = '';
        roundTilesEl.style.display   = 'none';
        roundControlsEl.style.display = 'none';

        switch (ctx.round) {
            case 'Round369':  renderRound369Tiles(ctx);              break;
            case 'OpenDeur':
                renderAnswerTiles(ctx.answerTiles, 4);
                addStartRoundButton('puzzel', 'Start Puzzel');
                break;
            case 'Puzzel':
                renderAnswerTiles(ctx.answerTiles, 3);
                addStartRoundButton('ingelijst', 'Start Ingelijst');
                break;
            case 'Ingelijst': renderIngelijstTiles(ctx);             break;
            // Finale: no tile area; start button handled in S9
        }
    }

    function renderRound369Tiles(ctx) {
        roundTilesEl.className   = 'round-tiles round-tiles-369';
        roundTilesEl.style.display = 'flex';
        for (let i = 1; i <= 15; i++) {
            const box = document.createElement('div');
            box.className = 'round-tile';
            if (SCORING_QUESTIONS.has(i))  box.classList.add('scoring');
            if (i === ctx.questionIndex)   box.classList.add('current');
            if (ctx.answerTiles[i - 1])    box.classList.add('correct');
            box.textContent = i;
            roundTilesEl.appendChild(box);
        }

        // After all 15 questions, offer transition to next round
        if (ctx.questionIndex > 15) {
            addStartRoundButton('opendeur', 'Start Open Deur');
        }
    }

    function renderAnswerTiles(answerTiles, count) {
        roundTilesEl.className   = 'round-tiles';
        roundTilesEl.style.display = 'flex';
        for (let i = 0; i < count; i++) {
            const box = document.createElement('div');
            box.className = 'round-tile' + (answerTiles[i] ? ' correct' : '');
            box.textContent = i + 1;
            roundTilesEl.appendChild(box);
        }
    }

    function renderIngelijstTiles(ctx) {
        roundTilesEl.className   = 'round-tiles tile-grid-2x5';
        roundTilesEl.style.display = 'grid';
        for (let i = 0; i < 10; i++) {
            const box = document.createElement('div');
            box.className = 'round-tile' + (ctx.answerTiles[i] ? ' correct' : '');
            box.textContent = i + 1;
            roundTilesEl.appendChild(box);
        }

        // Volgende button — visible on scoreboard per confirmed decision #1
        const btn = document.createElement('button');
        btn.className   = 'btn btn-volgende';
        btn.textContent = 'Volgende';
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            try {
                await fetch(`/api/sessions/${sessionId}/rounds/nextquizmaster`, { method: 'POST' });
            } catch (err) {
                console.error('nextquizmaster failed:', err);
            }
            btn.disabled = false;
        });
        roundControlsEl.appendChild(btn);
        roundControlsEl.style.display = 'flex';
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
            if (score === 0) {
                activeTimers.delete(playerId);
                updateClockLoop();
                playSound(sounds.scoreZero);
            }
        });

        connection.on('PlayerWentStale', playerId => setTileStale(playerId, true));
        connection.on('PlayerReturned',  playerId => setTileStale(playerId, false));

        connection.on('GameEnded', () => {
            activeTimers.clear();
            updateClockLoop();
            showGameEnded();
        });

        connection.on('AnswerSound', soundType => {
            if (soundType === 'correct') playSound(sounds.correct);
            else if (soundType === 'wrong') playSound(sounds.wrong);
        });

        connection.on('TimerStarted', playerId => {
            activeTimers.add(playerId);
            updateClockLoop();
        });

        connection.on('TimerStopped', playerId => {
            activeTimers.delete(playerId);
            updateClockLoop();
        });

        // ── Round events ─────────────────────────────────────────────────────

        connection.on('RoundChanged', ctx => {
            renderRound(ctx);
        });

        connection.on('TileMarked', (tileIndex, _round) => {
            if (!currentContext) return;
            currentContext.answerTiles[tileIndex] = true;
            renderRoundTiles(currentContext);
        });

        connection.on('QuestionAdvanced', questionIndex => {
            if (!currentContext) return;
            currentContext.questionIndex = questionIndex;
            renderRound(currentContext);  // re-render header + tiles
        });

        connection.on('TurnAdvanced', (candidateId, quizmasterId) => {
            if (!currentContext) return;
            currentContext.candidateId   = candidateId;
            currentContext.quizmasterId  = quizmasterId;
            highlightRoles(currentContext);
        });

        connection.start()
            .then(() => connection.invoke('JoinSessionGroup', sessionId))
            .catch(err => console.error('SignalR connect error:', err));
    }

}());
