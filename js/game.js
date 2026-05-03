(function () {
    // ── Constants ──
    const GRAVITY = 0.35;
    const FLAP_FORCE = -6.5;
    const FLAP_FORWARD = 0.3;
    const MAX_VY = 10;
    const BASE_SPEED = 3;
    const MAX_SPEED = 7;
    const BIRD_RADIUS = 16;
    const OBS_WIDTH = 60;
    const GAP_HEIGHT = 160;
    const OBS_INTERVAL_MIN = 220;
    const OBS_INTERVAL_MAX = 320;
    const OBSTACLE_TYPES = ['stone', 'ice', 'tree', 'fire', 'metal'];

    // ── DOM refs ──
    const canvas = document.getElementById('gameCanvas');
    const scoreEl = document.getElementById('score');
    const bestScoreEl = document.getElementById('best-score');
    const startScreen = document.getElementById('start-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const finalScoreEl = document.getElementById('final-score');
    const finalBestEl = document.getElementById('final-best-score');
    const startBtn = document.getElementById('startBtn');
    const restartBtn = document.getElementById('restartBtn');
    const handStatusEl = document.getElementById('hand-status');
    const flapBarEl = document.getElementById('flap-bar');
    const scoreDisplayEl = document.getElementById('score-display');

    // ── Modules ──
    const audio = new AudioManager();
    const handTracker = new HandTracker();
    const renderer = new Renderer(canvas);

    // ── Game state ──
    let state = 'READY'; // READY | PLAYING | GAME_OVER
    let score = 0;
    let bestScore = parseInt(localStorage.getItem('flapbird_best') || '0');
    let gameSpeed = BASE_SPEED;
    let lastFlapSoundTime = 0;

    bestScoreEl.textContent = bestScore;

    let bird = {
        x: 0, y: 0, vy: 0, vx: 0,
        rotation: 0, wingAngle: 0,
        targetWingAngle: 0
    };

    let obstacles = [];
    let nextObsDistance = 0;
    let distanceTraveled = 0;

    // ── Init ──
    function initGame() {
        const W = window.innerWidth;
        const H = window.innerHeight;
        renderer.resize(W, H);

        bird.x = W * 0.25;
        bird.y = H * 0.4;
        bird.vy = 0;
        bird.vx = 0;
        bird.rotation = 0;
        bird.wingAngle = 0;
        bird.targetWingAngle = 0;

        obstacles = [];
        score = 0;
        gameSpeed = BASE_SPEED;
        distanceTraveled = 0;
        nextObsDistance = OBS_INTERVAL_MIN;
        renderer.particles = [];

        scoreEl.textContent = '0';
        renderer.gameOverFlash = 0;
    }

    function resetBird() {
        const W = window.innerWidth;
        const H = window.innerHeight;
        bird.x = W * 0.25;
        bird.y = H * 0.4;
        bird.vy = 0;
        bird.vx = 0;
        bird.rotation = 0;
        bird.wingAngle = 0;
    }

    // ── Obstacle generation ──
    function spawnObstacle() {
        const H = window.innerHeight;
        const groundY = H * 0.85;
        const minGapY = GAP_HEIGHT / 2 + 40;
        const maxGapY = groundY - GAP_HEIGHT / 2 - 40;
        const gapY = minGapY + Math.random() * (maxGapY - minGapY);
        const type = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];

        obstacles.push({
            x: window.innerWidth + 50,
            gapY,
            gapHeight: GAP_HEIGHT,
            width: OBS_WIDTH,
            type,
            scored: false
        });

        const speedFactor = Math.min(score / 30, 1);
        nextObsDistance = OBS_INTERVAL_MIN + (OBS_INTERVAL_MAX - OBS_INTERVAL_MIN) * (1 - speedFactor * 0.5)
            * (0.8 + Math.random() * 0.4);
    }

    // ── Physics ──
    function updatePhysics(handState) {
        const H = window.innerHeight;
        const groundY = H * 0.85;

        // Apply gravity
        bird.vy += GRAVITY;
        bird.vy = Math.min(bird.vy, MAX_VY);

        // Flap force from hand gesture
        if (handState.isFlapping && state === 'PLAYING') {
            const intensity = handState.normalizedIntensity;
            const flapForce = FLAP_FORCE * intensity;
            bird.vy += flapForce * 0.45;
            bird.vy = Math.max(bird.vy, -MAX_VY);

            // Forward boost
            bird.vx += FLAP_FORWARD * intensity;
            bird.vx = Math.min(bird.vx, 2);

            // Wing animation
            bird.targetWingAngle = -40 * intensity;

            // Flap sound
            const now = Date.now();
            if (now - lastFlapSoundTime > 100) {
                audio.playFlap(intensity);
                lastFlapSoundTime = now;
            }
        } else {
            bird.targetWingAngle = 15;
        }

        // Smooth wing animation
        bird.wingAngle += (bird.targetWingAngle - bird.wingAngle) * 0.3;

        // Forward speed decay
        bird.vx *= 0.97;

        // Apply velocity
        bird.y += bird.vy;
        bird.x += bird.vx;

        // Keep bird in horizontal range
        const minX = window.innerWidth * 0.15;
        const maxX = window.innerWidth * 0.4;
        bird.x = Math.max(minX, Math.min(maxX, bird.x));

        // Rotation based on vy
        const targetRot = Math.atan2(bird.vy, gameSpeed + bird.vx) * 0.6;
        bird.rotation += (targetRot - bird.rotation) * 0.1;
        bird.rotation = Math.max(-0.5, Math.min(0.8, bird.rotation));

        // Ground / ceiling collision
        if (bird.y + BIRD_RADIUS > groundY) {
            bird.y = groundY - BIRD_RADIUS;
            if (state === 'PLAYING') {
                gameOver();
            }
        }
        if (bird.y - BIRD_RADIUS < 0) {
            bird.y = BIRD_RADIUS;
            bird.vy = Math.max(0, bird.vy);
        }

        // Update game speed based on score
        gameSpeed = BASE_SPEED + Math.min(score * 0.08, MAX_SPEED - BASE_SPEED);
    }

    function updateObstacles() {
        distanceTraveled += gameSpeed;

        // Spawn new obstacles
        if (distanceTraveled >= nextObsDistance) {
            spawnObstacle();
            distanceTraveled -= nextObsDistance;
        }

        // Move and check obstacles
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obs = obstacles[i];
            obs.x -= gameSpeed;

            // Score check
            if (!obs.scored && obs.x + obs.width < bird.x) {
                obs.scored = true;
                score++;
                scoreEl.textContent = score;
                audio.playScore();
                renderer.addParticle(bird.x + 30, bird.y, 'score');

                // Score pop animation
                scoreDisplayEl.classList.add('pop');
                setTimeout(() => scoreDisplayEl.classList.remove('pop'), 150);
            }

            // Remove off-screen
            if (obs.x + obs.width < -50) {
                obstacles.splice(i, 1);
            }
        }
    }

    function checkCollision() {
        const bx = bird.x;
        const by = bird.y;
        const br = BIRD_RADIUS;

        for (const obs of obstacles) {
            const topH = obs.gapY - obs.gapHeight / 2;
            const botY = obs.gapY + obs.gapHeight / 2;

            // Circle vs rectangle collision - top pillar
            const closestX1 = Math.max(obs.x, Math.min(bx, obs.x + obs.width));
            const closestY1 = Math.max(0, Math.min(by, topH));
            if (distSq(bx, by, closestX1, closestY1) < br * br) {
                return true;
            }

            // Circle vs rectangle collision - bottom pillar
            const closestX2 = Math.max(obs.x, Math.min(bx, obs.x + obs.width));
            const closestY2 = Math.max(botY, Math.min(by, renderer.H * 0.85));
            if (distSq(bx, by, closestX2, closestY2) < br * br) {
                return true;
            }
        }
        return false;
    }

    function distSq(x1, y1, x2, y2) {
        const dx = x1 - x2;
        const dy = y1 - y2;
        return dx * dx + dy * dy;
    }

    // ── Game state transitions ──
    function startGame() {
        audio.init();
        audio.resume();
        state = 'PLAYING';
        startScreen.classList.add('hidden');
        gameOverScreen.classList.add('hidden');
        initGame();
        audio.startBGM();
    }

    function gameOver() {
        if (state !== 'PLAYING') return;
        state = 'GAME_OVER';

        audio.playHit();
        setTimeout(() => audio.playGameOver(), 300);
        audio.stopBGM();

        renderer.gameOverFlash = 0.8;
        renderer.addParticle(bird.x, bird.y, 'hit');

        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem('flapbird_best', bestScore.toString());
            bestScoreEl.textContent = bestScore;
        }

        finalScoreEl.textContent = score;
        finalBestEl.textContent = bestScore;

        setTimeout(() => {
            gameOverScreen.classList.remove('hidden');
        }, 800);
    }

    // ── Hand indicator update ──
    function updateHandUI(handState) {
        if (handState.handDetected) {
            handStatusEl.textContent = '手部已检测';
            handStatusEl.style.color = '#4caf50';
        } else {
            handStatusEl.textContent = '等待手部检测...';
            handStatusEl.style.color = 'rgba(255,255,255,0.6)';
        }
        flapBarEl.style.width = (handState.normalizedIntensity * 100) + '%';
    }

    // ── Main loop ──
    let currentHandState = { distance: 0, flapSpeed: 0, isFlapping: false, handDetected: false, normalizedIntensity: 0 };

    handTracker.onFrame = function (handState) {
        currentHandState = handState;
        updateHandUI(handState);
    };

    function gameLoop() {
        requestAnimationFrame(gameLoop);

        if (state === 'PLAYING') {
            updatePhysics(currentHandState);
            updateObstacles();

            if (checkCollision()) {
                gameOver();
            }
        } else if (state === 'READY') {
            // Idle bob animation
            bird.y = renderer.H * 0.4 + Math.sin(Date.now() * 0.003) * 15;
            bird.rotation = Math.sin(Date.now() * 0.002) * 0.05;
            bird.wingAngle = Math.sin(Date.now() * 0.006) * 20;
            gameSpeed = 1;
        } else if (state === 'GAME_OVER') {
            // Bird falls
            bird.vy += GRAVITY;
            bird.y += bird.vy;
            bird.rotation += 0.05;
            const groundY = renderer.H * 0.85;
            if (bird.y + BIRD_RADIUS > groundY) {
                bird.y = groundY - BIRD_RADIUS;
                bird.vy = 0;
            }
        }

        renderer.render(bird, obstacles, state === 'PLAYING' ? gameSpeed : (state === 'READY' ? 1 : 0.5), score, state, currentHandState);
    }

    // ── Event listeners ──
    startBtn.addEventListener('click', () => {
        startGame();
    });

    restartBtn.addEventListener('click', () => {
        startGame();
    });

    // Keyboard fallback for testing
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            if (state === 'READY') {
                startGame();
            } else if (state === 'GAME_OVER') {
                startGame();
            } else if (state === 'PLAYING') {
                // Simulate a flap for testing without camera
                currentHandState = {
                    distance: 0.15,
                    flapSpeed: 0.03,
                    isFlapping: true,
                    handDetected: true,
                    normalizedIntensity: 0.8
                };
                setTimeout(() => {
                    currentHandState = {
                        distance: 0.05,
                        flapSpeed: 0,
                        isFlapping: false,
                        handDetected: false,
                        normalizedIntensity: 0
                    };
                }, 150);
            }
        }
    });

    window.addEventListener('resize', () => {
        renderer.resize(window.innerWidth, window.innerHeight);
    });

    // ── Bootstrap ──
    initGame();
    renderer.gameOverFlash = 0;

    // Start hand tracking
    handTracker.init().then(() => {
        console.log('Hand tracker initialized');
    }).catch(err => {
        console.warn('Hand tracker failed to init, use Space key as fallback:', err);
    });

    // Start render loop
    gameLoop();
})();
