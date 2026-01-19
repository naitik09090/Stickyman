import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Coins, Settings, Play, Pause, RotateCcw, Star, Zap, Shield, ArrowUp, Skull } from 'lucide-react';

const StickmanArcherGame = () => {
    const canvasRef = useRef(null);
    const [score, setScore] = useState(0);
    const [coins, setCoins] = useState(100);
    const [isPaused, setIsPaused] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [difficulty, setDifficulty] = useState('medium');
    const [killStreak, setKillStreak] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [totalKills, setTotalKills] = useState(0);
    const [level, setLevel] = useState(1);
    const [levelComplete, setLevelComplete] = useState(false);
    const [currentLevelKills, setCurrentLevelKills] = useState(0);
    const [powerUps, setPowerUps] = useState({
        doublePoints: false,
        shield: false
    });
    const [killMessage, setKillMessage] = useState(null);
    const [gameTime, setGameTime] = useState(0);
    const [gameWon, setGameWon] = useState(false);
    const [gameOverReason, setGameOverReason] = useState(null); // 'HEADSHOT!' or 'BODY SHOT!'
    const [playerSelfKill, setPlayerSelfKill] = useState(false); // Track player self-kill
    const [enemySelfKill, setEnemySelfKill] = useState(false); // Track enemy self-kill

    // Responsive canvas state
    const [canvasWidth, setCanvasWidth] = useState(1100);
    const [canvasHeight, setCanvasHeight] = useState(700);
    const [scaleFactor, setScaleFactor] = useState(1);
    const [isMobile, setIsMobile] = useState(false);
    const [isTablet, setIsTablet] = useState(false);

    const WIN_TIME_SECONDS = 300; // Win after 5 minutes (300 seconds)
    const killTimeoutRef = useRef(null); // Ref to track kill animation timeout

    // Base canvas dimensions (internal game coordinates)
    const BASE_WIDTH = 1250;
    const BASE_HEIGHT = 700;

    const gameState = useRef({
        player: { x: 350, y: 400, health: 3, arrowHits: [], isDead: false, deathFrame: 0, isInvulnerable: false },
        enemy: { x: 800, y: 400, health: 3, arrowHits: [], isDead: false, deathFrame: 0, isInvulnerable: false, targetX: 800, targetY: 400 },
        enemy2: { x: 1000, y: 350, health: 3, arrowHits: [], isDead: false, deathFrame: 0, isInvulnerable: false, targetX: 1000, targetY: 350 }, // Second enemy for Level 1
        arrows: [],
        enemyArrows: [],
        enemy2Arrows: [], // Arrows for second enemy
        isCharging: false,
        chargeTime: 0,
        angle: -25,
        enemyAngle: 185, // Enemy bow angle (negated for flip)
        enemy2Angle: 185, // Enemy 2 bow angle
        enemyIsCharging: false,
        enemyChargeTime: 0,
        enemyShootTimer: 0,
        enemy2IsCharging: false, // Second enemy charging state
        enemy2ChargeTime: 0, // Second enemy charge time
        enemy2ShootTimer: 0, // Second enemy shoot timer
        particles: [],
        ammo: 10,
        maxAmmo: 10,
        ammoReloadTimer: 0,
        playerPositions: [
            // Level 1-5: Lower positions
            { x: 150, y: 500 }, { x: 200, y: 480 }, { x: 120, y: 520 },
            // Level 6-10: Mid-low positions
            { x: 180, y: 450 }, { x: 150, y: 470 }, { x: 220, y: 460 },
            // Level 11-15: Mid positions
            { x: 150, y: 400 }, { x: 200, y: 420 }, { x: 100, y: 410 },
            // Level 16-20: Mid-high positions
            { x: 180, y: 350 }, { x: 150, y: 370 }, { x: 210, y: 360 },
            // Level 21+: High positions (challenging)
            { x: 150, y: 300 }, { x: 200, y: 320 }, { x: 120, y: 310 }
        ],
        enemyPositions: [
            // Level 1-5: Mid-right positions
            { x: 800, y: 450 }, { x: 850, y: 470 }, { x: 780, y: 460 },
            // Level 6-10: Varied right positions
            { x: 820, y: 400 }, { x: 800, y: 420 }, { x: 860, y: 410 },
            // Level 11-15: High-right positions
            { x: 800, y: 350 }, { x: 850, y: 370 }, { x: 780, y: 360 },
            // Level 16-20: Very high positions
            { x: 820, y: 300 }, { x: 800, y: 320 }, { x: 860, y: 310 },
            // Level 21+: Extreme positions (very challenging)
            { x: 800, y: 500 }, { x: 850, y: 520 }, { x: 780, y: 510 }
        ],
        currentPlayerPosIndex: 0,
        currentEnemyPosIndex: 0,
        keys: { left: false, right: false, up: false, down: false },
        autoMoveTimer: 0,
        obstacles: []
    });

    // Responsive Canvas Sizing
    useEffect(() => {
        const updateCanvasSize = () => {
            const viewportWidth = window.innerWidth;
            let newWidth, newHeight, scale;

            // Determine device type and calculate canvas size
            if (viewportWidth < 768) {
                // Mobile
                setIsMobile(true);
                setIsTablet(false);
                newWidth = Math.min(viewportWidth * 0.95, 500);
            } else if (viewportWidth < 1024) {
                // Tablet
                setIsMobile(false);
                setIsTablet(true);
                newWidth = Math.min(viewportWidth * 0.90, 800);
            } else {
                // Desktop/Laptop - Use exact dimensions
                setIsMobile(false);
                setIsTablet(false);
                newWidth = 1220; // Fixed width for desktop
            }

            // Maintain 16:10 aspect ratio
            newHeight = (newWidth / BASE_WIDTH) * BASE_HEIGHT;
            scale = newWidth / BASE_WIDTH;

            setCanvasWidth(newWidth);
            setCanvasHeight(newHeight);
            setScaleFactor(scale);
        };

        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);

        return () => window.removeEventListener('resize', updateCanvasSize);
    }, []);

    // Get level-specific positions for player and enemy
    const getPositionsForLevel = (currentLevel) => {
        const levelPositions = {
            // Level 1-4: Single enemy (tutorial/easy)
            1: { player: { x: 150, y: 500 }, enemy: { x: 900, y: 450 } },
            2: { player: { x: 200, y: 480 }, enemy: { x: 850, y: 470 } },
            3: { player: { x: 120, y: 520 }, enemy: { x: 950, y: 460 } },
            4: { player: { x: 180, y: 490 }, enemy: { x: 880, y: 440 } },

            // Level 5-9: Two enemies (medium difficulty)
            5: {
                player: { x: 150, y: 510 },
                enemy: { x: 920, y: 480 },
                enemy2: { x: 700, y: 350 }
            },
            6: {
                player: { x: 180, y: 450 },
                enemy: { x: 870, y: 400 },
                enemy2: { x: 650, y: 320 }
            },
            7: {
                player: { x: 150, y: 470 },
                enemy: { x: 900, y: 420 },
                enemy2: { x: 720, y: 300 }
            },
            8: {
                player: { x: 220, y: 460 },
                enemy: { x: 850, y: 410 },
                enemy2: { x: 680, y: 340 }
            },
            9: {
                player: { x: 160, y: 440 },
                enemy: { x: 920, y: 390 },
                enemy2: { x: 700, y: 320 }
            },
            10: {
                player: { x: 190, y: 480 },
                enemy: { x: 880, y: 430 },
                enemy2: { x: 650, y: 350 }
            },

            // Level 11-14: Two enemies (challenging)
            11: {
                player: { x: 150, y: 400 },
                enemy: { x: 900, y: 350 },
                enemy2: { x: 680, y: 280 }
            },
            12: {
                player: { x: 200, y: 420 },
                enemy: { x: 850, y: 370 },
                enemy2: { x: 720, y: 300 }
            },
            13: {
                player: { x: 100, y: 410 },
                enemy: { x: 950, y: 360 },
                enemy2: { x: 700, y: 290 }
            },
            14: {
                player: { x: 170, y: 390 },
                enemy: { x: 880, y: 340 },
                enemy2: { x: 660, y: 270 }
            },

            // Level 15-20: Two enemies (very challenging, high positions)
            15: {
                player: { x: 130, y: 430 },
                enemy: { x: 920, y: 380 },
                enemy2: { x: 700, y: 310 }
            },
            16: {
                player: { x: 180, y: 350 },
                enemy: { x: 870, y: 300 },
                enemy2: { x: 680, y: 230 }
            },
            17: {
                player: { x: 150, y: 370 },
                enemy: { x: 900, y: 320 },
                enemy2: { x: 720, y: 250 }
            },
            18: {
                player: { x: 210, y: 360 },
                enemy: { x: 850, y: 310 },
                enemy2: { x: 700, y: 240 }
            },
            19: {
                player: { x: 140, y: 340 },
                enemy: { x: 920, y: 290 },
                enemy2: { x: 680, y: 220 }
            },
            20: {
                player: { x: 190, y: 380 },
                enemy: { x: 880, y: 330 },
                enemy2: { x: 660, y: 260 }
            },
        };

        // For levels 21+, use dynamic positions with increasing difficulty
        if (currentLevel > 20) {
            const variation = (currentLevel - 20) % 5;
            return {
                player: {
                    x: 120 + (variation * 20),
                    y: 300 + (variation * 10)
                },
                enemy: {
                    x: 850 + (variation * 20),
                    y: 250 + (variation * 15)
                },
                enemy2: {
                    x: 600 + (variation * 20),
                    y: 200 + (variation * 15)
                }
            };
        }

        return levelPositions[currentLevel] || levelPositions[1];
    };

    // Level Show 

    useEffect(() => {
        const state = gameState.current;
        state.obstacles = [];

        // Get level-specific positions and update player/enemy
        const positions = getPositionsForLevel(level);

        // Update player position
        state.player.x = positions.player.x;
        state.player.y = positions.player.y;

        // Update enemy position and target
        state.enemy.x = positions.enemy.x;
        state.enemy.y = positions.enemy.y;
        state.enemy.targetX = positions.enemy.x;
        state.enemy.targetY = positions.enemy.y;

        // Update enemy2 position for levels 5-20 (if exists)
        if (positions.enemy2) {
            state.enemy2.x = positions.enemy2.x;
            state.enemy2.y = positions.enemy2.y;
            state.enemy2.targetX = positions.enemy2.x;
            state.enemy2.targetY = positions.enemy2.y;
            state.enemy2.isDead = false; // Make sure enemy2 is alive
            state.enemy2.health = 3; // Reset health
            state.enemy2.deathFrame = 0; // Reset death animation
            state.enemy2.isInvulnerable = false; // Reset invulnerability
        } else {
            // Hide enemy2 for other levels by moving it off-screen
            state.enemy2.x = -1000;
            state.enemy2.y = -1000;
            state.enemy2.isDead = true; // Mark as dead so it doesn't render
        }

        // Each level has completely unique obstacle configuration
        switch (level) {
            case 1:
                break;
            case 2:
                break;
            case 3:
                // Tutorial levels - no obstacles
                break;

            case 4:
                // Single thin vertical wall - left side
                state.obstacles.push({ x: 450, y: 150, w: 30, h: 200, type: 'static', color: '#696969' });
                break;

            case 5:
                // Single wide wall - center
                state.obstacles.push({ x: 480, y: 250, w: 40, h: 180, type: 'static', color: '#696969' });
                break;

            case 6:
                // Single short wall - right side
                state.obstacles.push({ x: 500, y: 350, w: 35, h: 150, type: 'static', color: '#696969' });
                break;

            case 7:
                // Two walls - diagonal pattern (top-left, bottom-right)
                state.obstacles.push({ x: 450, y: 250, w: 35, h: 170, type: 'static', color: '#696969' });
                state.obstacles.push({ x: 550, y: 250, w: 35, h: 170, type: 'static', color: '#696969' });
                break;

            case 8:
                // Two walls - narrow vertical passage (top and bottom center)
                state.obstacles.push({ x: 480, y: 60, w: 40, h: 180, type: 'static', color: '#696969' });
                state.obstacles.push({ x: 480, y: 300, w: 40, h: 140, type: 'static', color: '#696969' });
                break;

            case 9:
                // Two walls - wide horizontal spread
                state.obstacles.push({ x: 380, y: 320, w: 38, h: 160, type: 'static', color: '#696969' });
                state.obstacles.push({ x: 720, y: 120, w: 38, h: 160, type: 'static', color: '#696969' });
                break;

            case 10:
                // First moving wall - slow vertical center
                state.obstacles.push({ x: 480, y: 250, w: 40, h: 220, type: 'moving', vy: 2, minY: 100, maxY: 380, color: '#696969' });
                break;

            case 11:
                // Moving wall - medium speed, left offset
                state.obstacles.push({ x: 400, y: 250, w: 38, h: 200, type: 'moving', vy: 3, minY: 60, maxY: 520, color: '#696969' });
                break;

            case 12:
                // Moving wall - fast, right offset
                state.obstacles.push({ x: 400, y: 250, w: 38, h: 200, type: 'moving', vy: 3, minY: 60, maxY: 520, color: '#696969' });
                state.obstacles.push({ x: 580, y: 250, w: 42, h: 200, type: 'moving', vy: 3, minY: 60, maxY: 560, color: '#696969' });
                break;

            case 13:
                // Two moving walls - opposite directions
                state.obstacles.push({ x: 380, y: 150, w: 35, h: 180, type: 'moving', vy: 3, minY: 100, maxY: 420, color: '#696969' });
                state.obstacles.push({ x: 620, y: 250, w: 35, h: 180, type: 'moving', vy: 3, minY: 160, maxY: 560, color: '#696969' });
                break;

            case 14:
                // Three static walls - zigzag pattern
                state.obstacles.push({ x: 320, y: 120, w: 32, h: 150, type: 'moving', vy: 3, minY: 60, maxY: 320, color: '#696969' });
                state.obstacles.push({ x: 500, y: 280, w: 32, h: 150, type: 'moving', vy: 3, minY: 220, maxY: 580, color: '#696969' });
                state.obstacles.push({ x: 680, y: 140, w: 32, h: 150, type: 'moving', vy: 3, minY: 60, maxY: 320, color: '#696969' });
                break;

            case 15:
                // Moving wall + static wall combo
                state.obstacles.push({ x: 450, y: 200, w: 40, h: 200, type: 'moving', vy: 4, minY: 60, maxY: 400, color: '#696969' });
                state.obstacles.push({ x: 650, y: 250, w: 40, h: 180, type: 'moving', vy: 4, minY: 60, maxY: 320, color: '#FF8C00' });
                break;

            case 16:
                // Fast moving wall - very narrow gap
                state.obstacles.push({ x: 500, y: 260, w: 45, h: 80, type: 'moving', vy: 5, minY: 150, maxY: 440, color: '#696969' });
                break;

            case 17:
                // Two fast moving walls - synchronized
                state.obstacles.push({ x: 380, y: 150, w: 38, h: 200, type: 'moving', vy: 4, minY: 100, maxY: 400, color: '#696969' });
                state.obstacles.push({ x: 620, y: 150, w: 38, h: 200, type: 'moving', vy: 4, minY: 100, maxY: 400, color: '#696969' });
                break;

            case 18:
                // Four static walls - grid pattern
                state.obstacles.push({ x: 450, y: 120, w: 30, h: 140, type: 'static', color: '#696969' });
                state.obstacles.push({ x: 700, y: 120, w: 30, h: 140, type: 'static', color: '#696969' });
                state.obstacles.push({ x: 350, y: 360, w: 30, h: 140, type: 'static', color: '#696969' });
                state.obstacles.push({ x: 600, y: 360, w: 30, h: 140, type: 'static', color: '#696969' });
                break;

            case 19:
                // Three moving walls - chaos mode
                state.obstacles.push({ x: 350, y: 150, w: 35, h: 180, type: 'moving', vy: 3, minY: 100, maxY: 420, color: '#696969' });
                state.obstacles.push({ x: 500, y: 300, w: 35, h: 180, type: 'static', color: '#696969' });
                state.obstacles.push({ x: 650, y: 200, w: 35, h: 180, type: 'moving', vy: 5, minY: 100, maxY: 420, color: '#696969' });
                break;

            case 20:
                // Ultimate challenge - moving + static combo
                state.obstacles.push({ x: 300, y: 300, w: 35, h: 160, type: 'static', color: '#696969' });
                state.obstacles.push({ x: 500, y: 180, w: 42, h: 140, type: 'moving', vy: 5, minY: 150, maxY: 460, color: '#696969' });
                state.obstacles.push({ x: 700, y: 300, w: 35, h: 160, type: 'static', color: '#696969' });
                break;

            default:
                // Levels 21+ - extreme random patterns
                if (level > 20) {
                    const numObstacles = Math.min(Math.floor(level / 5), 4);
                    for (let i = 0; i < numObstacles; i++) {
                        const isMoving = Math.random() > 0.5;
                        const x = 300 + (i * 150);
                        const y = 150 + (Math.random() * 200);
                        const h = 180 + (Math.random() * 80);

                        if (isMoving) {
                            state.obstacles.push({
                                x, y, w: 38, h,
                                type: 'moving',
                                vy: 3 + Math.random() * 3,
                                minY: 100,
                                maxY: 420,
                                color: '#696969'
                            });
                        } else {
                            state.obstacles.push({
                                x, y, w: 35, h,
                                type: 'static',
                                color: '#696969'
                            });
                        }
                    }
                }
                break;
        }
    }, [level]);

    // Game Timer Effect - Win Condition
    useEffect(() => {
        // Timer pauses during game over/win/level complete popups
        if (isPaused || gameOver || gameWon || levelComplete) return;

        const timer = setInterval(() => {
            setGameTime(prev => {
                const newTime = prev + 1;
                // Check win condition - trigger at 300s and every 60s after that
                // This allows the win popup to reappear periodically
                if (newTime >= WIN_TIME_SECONDS && newTime % 60 === 0 && !gameWon) {
                    setGameWon(true);
                }
                return newTime;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isPaused, gameOver, gameWon, levelComplete, WIN_TIME_SECONDS]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationId;

        const createParticles = (x, y, color, count = 20) => {
            const state = gameState.current;
            for (let i = 0; i < count; i++) {
                state.particles.push({
                    x, y,
                    vx: (Math.random() - 0.5) * 8,
                    vy: (Math.random() - 0.5) * 8 - 3,
                    life: 30,
                    color,
                    size: Math.random() * 4 + 2
                });
            }
        };

        const drawParticles = () => {
            const state = gameState.current;
            state.particles = state.particles.filter(particle => {
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vy += 0.3;
                particle.life--;

                const alpha = particle.life / 30;
                ctx.fillStyle = particle.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fill();

                return particle.life > 0;
            });
        };

        const drawAnimeHand = (x, y, angle = 0) => {
            // Defensive: Only player uses this (left side). If x > 500, it's a glitch/ghost.
            if (x > 500) return;

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);

            // Simple Circle Hand (Mitten Style) to prevent "dot" artifacts
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        };

        const drawStickman = (x, y, isDead, isEnemy = false, deathFrame = 0, health = 3, isCharging = false, angle = 0) => {
            ctx.strokeStyle = isEnemy ? '#000' : '#000';
            ctx.lineWidth = 3;

            if (isDead) {
                const progress = Math.min(deathFrame / 30, 1);
                const rotation = progress * Math.PI / 2;

                ctx.save();
                ctx.translate(x, y - 30);
                ctx.rotate(rotation);

                ctx.beginPath();
                ctx.arc(0, -20, 10, 0, Math.PI * 2);
                ctx.stroke();

                ctx.strokeStyle = '#f00';
                ctx.lineWidth = 2;
                for (let i = 0; i < 2; i++) {
                    const offsetX = i === 0 ? -4 : 1;
                    ctx.beginPath();
                    ctx.moveTo(offsetX, -22);
                    ctx.lineTo(offsetX + 3, -18);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(offsetX + 3, -22);
                    ctx.lineTo(offsetX, -18);
                    ctx.stroke();
                }

                ctx.strokeStyle = isEnemy ? '#000' : '#000';
                ctx.lineWidth = 3;

                ctx.beginPath();
                ctx.moveTo(0, -10);
                ctx.lineTo(0, 20);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(-15 - progress * 5, 5);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(15 + progress * 5, 5);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(0, 20);
                ctx.lineTo(-10 - progress * 5, 30 + progress * 5);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, 20);
                ctx.lineTo(10 + progress * 5, 30 + progress * 5);
                ctx.stroke();

                ctx.restore();
                // ctx.fillStyle = '#000';
                // ctx.fillRect(x - 20, y + 10, 40, 5);
            } else {
                ctx.beginPath();
                ctx.arc(x, y - 50, 10, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = isEnemy ? '#ff0000' : '#000000';
                ctx.beginPath();
                ctx.arc(x - 3, y - 52, 1.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(x + 3, y - 52, 1.5, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = isEnemy ? '#000' : '#000';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(x, y - 48, 4, 0.2, Math.PI - 0.2);
                ctx.stroke();

                ctx.lineWidth = 3;

                ctx.beginPath();
                ctx.moveTo(x, y - 40);
                ctx.lineTo(x, y - 10);
                ctx.stroke();

                if (isCharging && !isEnemy) {
                    const pullAngle = (angle * Math.PI) / 180;
                    const bowArmX = x + Math.cos(pullAngle) * 15;
                    const bowArmY = y - 30 + Math.sin(pullAngle) * 15;

                    ctx.beginPath();
                    ctx.moveTo(x, y - 30);
                    ctx.lineTo(bowArmX, bowArmY);
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.moveTo(x, y - 30);
                    ctx.lineTo(x + 10, y - 35);
                    ctx.stroke();


                    // Hand drawing moved to drawBow to fix Z-order and duplicate issues
                    // drawAnimeHand(bowArmX, bowArmY, pullAngle);
                    // drawAnimeHand(x + 10, y - 35, pullAngle - Math.PI / 4);
                } else if (isEnemy) {
                    ctx.beginPath();
                    ctx.moveTo(x, y - 30);
                    ctx.lineTo(x - 15, y - 20);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(x, y - 30);
                    ctx.lineTo(x - 10, y - 35);
                    ctx.stroke();

                    // Draw simple arms for enemy to prevent artifacts
                    // drawAnimeHand(x - 15, y - 20, Math.PI);
                    // drawAnimeHand(x - 10, y - 35, Math.PI + Math.PI / 4);

                    ctx.beginPath();
                    ctx.moveTo(x, y - 30);
                    ctx.lineTo(x - 15, y - 20);
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.moveTo(x, y - 30);
                    ctx.lineTo(x - 10, y - 35);
                    ctx.stroke();
                } else {
                    ctx.beginPath();
                    ctx.moveTo(x, y - 30);
                    ctx.lineTo(x + 15, y - 20);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(x, y - 30);
                    ctx.lineTo(x + 10, y - 35);
                    ctx.stroke();

                    // Draw anime hands with fingers
                    drawAnimeHand(x + 15, y - 20, 0);
                    drawAnimeHand(x + 10, y - 35, -Math.PI / 4);
                }

                ctx.beginPath();
                ctx.moveTo(x, y - 10);
                ctx.lineTo(x - 10, y + 10);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x, y - 10);
                ctx.lineTo(x + 10, y + 10);
                ctx.stroke();

                ctx.fillStyle = isEnemy ? '#000' : '#000';
                ctx.fillRect(x - 20, y + 10, 40, 5);

                for (let i = 0; i < 3; i++) {
                    // Only draw active red hearts to prevent "gray dot" artifacts
                    if (i >= health) continue;

                    const heartX = x - 20 + i * 20;
                    const heartY = y - 80;
                    ctx.fillStyle = '#ff0000';
                    ctx.beginPath();
                    ctx.arc(heartX - 3, heartY, 4, 0, Math.PI * 2);
                    ctx.arc(heartX + 3, heartY, 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.moveTo(heartX - 7, heartY);
                    ctx.lineTo(heartX, heartY + 7);
                    ctx.lineTo(heartX + 7, heartY);
                    ctx.fill();
                }
            }
        };

        const drawBow = (x, y, angle, isCharging, chargeTime, isEnemy = false) => {
            ctx.save();
            ctx.translate(x, y - 30);

            // Flip horizontally for enemy
            if (isEnemy) {
                ctx.scale(-1, 1);
                // Adjust angle for flipped view so it visualizes correct global direction
                // 180 - angle converts Global Left-facing angle to Local Right-facing angle
                ctx.rotate(((180 - angle) * Math.PI) / 180);
            } else {
                ctx.rotate((angle * Math.PI) / 180);
            }

            // Draw bow body (arc) - make it thicker and more visible
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, 15, -Math.PI / 2, Math.PI / 2);
            ctx.stroke();

            if (isCharging) {
                const pullback = (chargeTime / 30) * 10;

                // Draw bowstring (pulled back)
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(0, -15);
                ctx.lineTo(-20 - pullback, 0);
                ctx.lineTo(0, 15);
                ctx.stroke();

                ctx.save();
                // Draw arrow shaft
                ctx.strokeStyle = '#654321';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(-20 - pullback, 0);
                ctx.lineTo(+20 - pullback, 0);
                ctx.stroke();

                // Draw arrow tip
                ctx.fillStyle = '#C0C0C0';
                ctx.beginPath();
                ctx.moveTo(20 - pullback, 0);
                ctx.lineTo(10 - pullback, -4);
                ctx.lineTo(10 - pullback, 4);
                ctx.closePath();
                ctx.fill();

                // Draw arrow fletching
                ctx.fillStyle = '#FF6B6B';
                ctx.beginPath();
                ctx.moveTo(20 - pullback, 0);
                ctx.lineTo(23 - pullback, -4);
                ctx.lineTo(21 - pullback, 0);
                ctx.lineTo(23 - pullback, 4);
                ctx.closePath();
                ctx.fill();

                // Draw charge glow
                const glowIntensity = chargeTime / 30;
                ctx.shadowBlur = 10 * glowIntensity;
                ctx.shadowColor = 'rgba(255, 255, 100, ' + glowIntensity + ')';
                ctx.strokeStyle = 'rgba(255, 255, 100, ' + glowIntensity + ')';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(-20 - pullback, 0);
                ctx.lineTo(-25 - pullback, 0);
                ctx.stroke();
                ctx.shadowBlur = 0;

                ctx.restore();

                // Draw Grip Hand (holding wood) - Added to ensure correct Z-order (Hand > Bow)
                drawAnimeHand(20 - pullback, 0, 0);

                // Draw anime hand on bowstring (pulling hand) - need to save position
                // Note: We don't need to re-flip here because we are inside the coordinate system
                // BUT drawAnimeHand expects global coords usually? No, it draws relative.
                // However, the complexity of drawBow means we should just re-use the current transform
                // The previous code had nested transforms which might be tricky.
                // Let's simplify: direct drawing relative to current context

                // Actually, the previous code restarted the transform stack for the second hand.
                // Let's stick to the simpler approach: The context is ALREADY rotated and scaled.
                // Just draw the hand at the string position (-20 - pullback).
                drawAnimeHand(-20 - pullback, 0, Math.PI);

            } else {
                // Draw relaxed bowstring when not charging
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-5, -15);
                ctx.lineTo(-8, 0);
                ctx.lineTo(-5, 15);
                ctx.stroke();
            }
            ctx.restore();
        };

        // const drawAmmoBox = () => {
        //     const state = gameState.current;
        //     const boxX = 100;
        //     const boxY = 120;
        //     const boxWidth = 200;
        //     const boxHeight = 80;
        //     const arrowSize = 30;
        //     const arrowSpacing = 5;

        //     // Draw box background
        //     ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        //     ctx.strokeStyle = '#8B4513';
        //     ctx.lineWidth = 3;
        //     ctx.beginPath();
        //     ctx.roundRect(boxX + 400, boxY, boxWidth, boxHeight, 5);
        //     ctx.fill();
        //     ctx.stroke();

        //     // Draw title
        //     ctx.fillStyle = '#FFD700';
        //     ctx.font = 'bold 16px Arial';
        //     ctx.fillText('AMMO', boxX + 420, boxY + 25);

        //     // Draw ammo count text
        //     ctx.fillStyle = '#FFFFFF';
        //     ctx.font = 'bold 14px Arial';
        //     ctx.fillText(`${state.ammo}/${state.maxAmmo}`, boxX + boxWidth + 220, boxY + 45);

        //     // Draw arrow icons
        //     const startX = boxX + 420;
        //     const startY = boxY + 50;
        //     const arrowsPerRow = 5;

        //     for (let i = 0; i < state.maxAmmo; i++) {
        //         const row = Math.floor(i / arrowsPerRow);
        //         const col = i % arrowsPerRow;
        //         const x = startX + col * (arrowSize + arrowSpacing);
        //         const y = startY + row * (arrowSize + arrowSpacing);

        //         ctx.save();
        //         ctx.translate(x + arrowSize / 2, y + arrowSize / 2);

        //         if (i < state.ammo) {
        //             // Draw available arrow (colored)
        //             ctx.strokeStyle = '#654321';
        //             ctx.lineWidth = 2;
        //             ctx.beginPath();
        //             ctx.moveTo(-10, 0);
        //             ctx.lineTo(8, 0);
        //             ctx.stroke();

        //             ctx.fillStyle = '#C0C0C0';
        //             ctx.beginPath();
        //             ctx.moveTo(8, 0);
        //             ctx.lineTo(4, -3);
        //             ctx.lineTo(4, 3);
        //             ctx.closePath();
        //             ctx.fill();

        //             ctx.fillStyle = '#FF6B6B';
        //             ctx.beginPath();
        //             ctx.moveTo(-10, 0);
        //             ctx.lineTo(-12, -2);
        //             ctx.lineTo(-11, 0);
        //             ctx.lineTo(-12, 2);
        //             ctx.closePath();
        //             ctx.fill();
        //         } else {
        //             // Draw empty arrow slot (grayed out)
        //             ctx.strokeStyle = '#444444';
        //             ctx.lineWidth = 2;
        //             ctx.beginPath();
        //             ctx.moveTo(-10, 0);
        //             ctx.lineTo(8, 0);
        //             ctx.stroke();

        //             ctx.fillStyle = '#555555';
        //             ctx.beginPath();
        //             ctx.moveTo(8, 0);
        //             ctx.lineTo(4, -3);
        //             ctx.lineTo(4, 3);
        //             ctx.closePath();
        //             ctx.fill();

        //             ctx.fillStyle = '#666666';
        //             ctx.beginPath();
        //             ctx.moveTo(-10, 0);
        //             ctx.lineTo(-12, -2);
        //             ctx.lineTo(-11, 0);
        //             ctx.lineTo(-12, 2);
        //             ctx.closePath();
        //             ctx.fill();
        //         }

        //         ctx.restore();
        //     }

        //     // Show reload message if out of ammo
        //     if (state.ammo === 0) {
        //         ctx.fillStyle = '#FF0000';
        //         ctx.font = 'bold 12px Arial';
        //         const reloadTime = Math.ceil((180 - state.ammoReloadTimer) / 60);
        //         ctx.fillText(`Reloading in ${reloadTime}s...`, boxX + 420, boxY + boxHeight - 10);
        //     }
        // };

        const drawArrow = (arrow) => {
            ctx.save();
            ctx.translate(arrow.x, arrow.y);
            ctx.rotate(Math.atan2(arrow.vy, arrow.vx));

            ctx.strokeStyle = '#654321';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-20, 0);
            ctx.lineTo(15, 0);
            ctx.stroke();

            ctx.fillStyle = '#C0C0C0';
            ctx.beginPath();
            ctx.moveTo(15, 0);
            ctx.lineTo(8, -5);
            ctx.lineTo(8, 5);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#FF6B6B';
            ctx.beginPath();
            ctx.moveTo(-20, 0);
            ctx.lineTo(-25, -4);
            ctx.lineTo(-22, 0);
            ctx.lineTo(-25, 4);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        };

        const checkCollision = (arrow, target) => {
            const arrowAngle = Math.atan2(arrow.vy, arrow.vx);
            const arrowTipX = arrow.x + Math.cos(arrowAngle) * 20;
            const arrowTipY = arrow.y + Math.sin(arrowAngle) * 20;

            const targetCenterX = target.x;
            const targetTop = target.y - 65;
            const targetBottom = target.y + 15;
            const hitboxWidth = 35;

            const inXRange = arrowTipX > targetCenterX - hitboxWidth && arrowTipX < targetCenterX + hitboxWidth;
            const inYRange = arrowTipY > targetTop && arrowTipY < targetBottom;

            if (inXRange && inYRange) {
                const relativeY = arrowTipY - targetTop;
                const bodyHeight = 80;
                const hitPercent = relativeY / bodyHeight;

                if (hitPercent < 0.22) return 'head';
                else if (hitPercent < 0.48) return 'chest';
                else if (hitPercent < 0.72) return 'stomach';
                else return 'leg';
            }

            return null;
        };

        const getDifficultyMultiplier = () => {
            // Base difficulty + Level scaling (1 to 10)
            let base = 1;
            if (difficulty === 'easy') base = 0.7;
            if (difficulty === 'hard') base = 1.3;
            return base + (level * 0.15); // Harder every level
        };

        const drawObstacles = () => {
            const state = gameState.current;
            state.obstacles.forEach(obs => {
                ctx.fillStyle = obs.color || '#555';
                ctx.save();
                ctx.shadowColor = 'black';
                ctx.shadowBlur = 10;
                ctx.fillRect(obs.x, obs.y, obs.w, obs.h);

                // Bevel effect
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 2;
                ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
                ctx.restore();

                // Move obstacles
                if (obs.type === 'moving' && !isPaused && !gameOver && !levelComplete) {
                    obs.y += obs.vy;
                    if (obs.y < obs.minY || obs.y + obs.h > obs.maxY) {
                        obs.vy *= -1;
                    }
                }
            });
        };

        const gameLoop = () => {
            if (isPaused || gameOver || gameWon) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Reset context to prevent stray artifacts
            ctx.fillStyle = 'transparent';
            ctx.strokeStyle = 'transparent';

            // Draw Background Elements (Obstacles)
            drawObstacles();

            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, 'transparent');
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            const clouds = [{ x: 100, y: 75 }, { x: 350, y: 150 }, { x: 600, y: 75 }, { x: 850, y: 150 }, { x: 1100, y: 75 }];
            clouds.forEach(cloud => {
                ctx.beginPath();
                ctx.arc(cloud.x, cloud.y, 30, 0, Math.PI * 2);
                ctx.arc(cloud.x + 25, cloud.y, 35, 0, Math.PI * 2);
                ctx.arc(cloud.x + 50, cloud.y, 30, 0, Math.PI * 2);
                ctx.fill();
            });

            const state = gameState.current;
            const diffMultiplier = getDifficultyMultiplier();

            state.arrows = state.arrows.filter(arrow => {
                // Apply air resistance for smoother motion
                arrow.vx *= 0.99; // Slight air resistance
                arrow.x += arrow.vx;
                arrow.y += arrow.vy;
                arrow.vy += 0.25; // Slightly reduced gravity for smoother arc
                if (arrow.age !== undefined) arrow.age++;
                else arrow.age = 0; // fallback

                // Check Obstacle Collision for Player Arrows
                let obstacleHit = false;
                for (let obs of state.obstacles) {
                    if (arrow.x >= obs.x && arrow.x <= obs.x + obs.w &&
                        arrow.y >= obs.y && arrow.y <= obs.y + obs.h) {
                        obstacleHit = true;
                        // Enhanced particle effect - sparks flying from impact
                        createParticles(arrow.x, arrow.y, '#FFA500', 20); // Orange sparks
                        createParticles(arrow.x, arrow.y, '#FFD700', 15); // Gold sparks
                        createParticles(arrow.x, arrow.y, '#888', 10); // Gray dust
                        break;
                    }
                }

                if (obstacleHit) return false; // Remove arrow

                // Check Friendly Fire (Self Damage)
                // Only allow self-damage after arrow has been alive for a bit to prevent instant hit on spawn
                // OR if the arrow is falling (vy > 0) which implies it went up and is coming down
                // Reduced age threshold and vy threshold to catch arrows on first contact
                if (arrow.age > 10 || (arrow.vy > 0 && arrow.age > 5)) {
                    const playerHitPoint = checkCollision(arrow, state.player);
                    if (playerHitPoint && !state.player.isDead && !state.player.isInvulnerable && !powerUps.shield) {
                        createParticles(arrow.x, arrow.y, '#ff0000');

                        // Apply damage logic - show self-kill message and popup
                        if (playerHitPoint === 'head') {
                            state.player.health = 0;
                            state.player.isDead = true;
                            setKillStreak(0);

                            // Show self-kill message immediately
                            setKillMessage({ text: "SELF-KILL!", color: "#FF6B6B" });
                            setTimeout(() => setKillMessage(null), 1500);

                            // Show popup with retry button after death animation
                            setTimeout(() => {
                                setPlayerSelfKill(true);
                                setIsPaused(true);
                            }, 1000);
                            return false;
                        }

                        state.player.health--;

                        if (state.player.health <= 0) {
                            setKillStreak(0);
                            state.player.isDead = true;

                            // Show self-kill message immediately
                            setKillMessage({ text: "SELF-KILL!", color: "#FF6B6B" });
                            setTimeout(() => setKillMessage(null), 1500);

                            // Show popup with retry button after death animation
                            setTimeout(() => {
                                setPlayerSelfKill(true);
                                setIsPaused(true);
                            }, 1000);
                        } else {
                            state.player.isInvulnerable = true;
                            setTimeout(() => { state.player.isInvulnerable = false; }, 200);
                        }

                        return false; // Remove arrow after hitting player
                    }
                }

                const hitPoint = checkCollision(arrow, state.enemy);
                if (hitPoint && !state.enemy.isDead && !state.enemy.isInvulnerable) {
                    createParticles(arrow.x, arrow.y, '#ff0000');

                    if (hitPoint === 'head') {
                        state.enemy.health = 0;
                        const pointsMultiplier = powerUps.doublePoints ? 2 : 1;
                        setScore(s => s + 5 * pointsMultiplier);
                        setCoins(c => c + 20);
                        setKillStreak(k => k + 1);
                        setTotalKills(t => t + 1);
                        setCurrentLevelKills(prev => {
                            const newKills = prev + 1;
                            // Levels 5-20 have 2 enemies, levels 1-4 have 1 enemy
                            const requiredKills = (level >= 5 && level <= 20) ? 2 : 1;
                            if (newKills >= requiredKills) {
                                setLevelComplete(true);
                                // Clear enemy arrows immediately to prevent post-kill damage
                                state.enemyArrows = [];
                                if (level >= 5 && level <= 20) state.enemy2Arrows = [];
                            }
                            return newKills;
                        });

                        // Clear any existing timeout
                        if (killTimeoutRef.current) clearTimeout(killTimeoutRef.current);

                        killTimeoutRef.current = setTimeout(() => {
                            setKillMessage({ text: "HEADSHOT!", color: "#FF0000" });
                            setTimeout(() => setKillMessage(null), 1500);

                            state.enemy.isDead = true;
                            state.enemy.deathFrame = 0;
                            state.enemy.isInvulnerable = true;

                            setTimeout(() => {
                                // Don't respawn enemy if level is complete OR if it's Level 1 (two enemies)
                                if (!levelComplete && level !== 1) {
                                    state.enemy.isDead = false;
                                    state.enemy.health = 3;
                                    state.enemy.arrowHits = [];
                                    state.enemy.isInvulnerable = false;
                                    state.currentEnemyPosIndex = (state.currentEnemyPosIndex + 1) % state.enemyPositions.length;
                                    const newPos = state.enemyPositions[state.currentEnemyPosIndex];
                                    // Set target position for smooth movement
                                    state.enemy.targetX = newPos.x;
                                    state.enemy.targetY = newPos.y;
                                    state.arrows = [];
                                }
                            }, 1500);
                        });

                        return false;
                    }

                    state.enemy.health--;
                    const pointsMultiplier = powerUps.doublePoints ? 2 : 1;
                    setScore(s => s + 2 * pointsMultiplier);
                    setCoins(c => c + 5);

                    if (state.enemy.health <= 0) {
                        setKillStreak(k => k + 1);
                        setTotalKills(t => t + 1);
                        setCurrentLevelKills(prev => {
                            const newKills = prev + 1;
                            // Levels 5-20 have 2 enemies, levels 1-4 have 1 enemy
                            const requiredKills = (level >= 5 && level <= 20) ? 2 : 1;
                            if (newKills >= requiredKills) {
                                setLevelComplete(true);
                                // Clear enemy arrows immediately to prevent post-kill damage
                                state.enemyArrows = [];
                                if (level >= 5 && level <= 20) state.enemy2Arrows = [];
                            }
                            return newKills;
                        });

                        // Clear any existing timeout
                        if (killTimeoutRef.current) clearTimeout(killTimeoutRef.current);

                        killTimeoutRef.current = setTimeout(() => {
                            setKillMessage({ text: "ENEMY KILLED", color: "#FFA500" });
                            setTimeout(() => setKillMessage(null), 1500);

                            state.enemy.isDead = true;
                            state.enemy.deathFrame = 0;

                            setTimeout(() => {
                                // Don't respawn enemy if level is complete OR if it's Level 1 (two enemies)
                                if (!levelComplete && level !== 1) {
                                    state.enemy.isDead = false;
                                    state.enemy.health = 3;
                                    state.enemy.arrowHits = [];
                                    state.enemy.isInvulnerable = false;
                                    state.currentEnemyPosIndex = (state.currentEnemyPosIndex + 1) % state.enemyPositions.length;
                                    const newPos = state.enemyPositions[state.currentEnemyPosIndex];
                                    // Set target position for smooth movement
                                    state.enemy.targetX = newPos.x;
                                    state.enemy.targetY = newPos.y;
                                    state.arrows = [];
                                }
                            }, 1500);
                        });
                    } else {
                        state.enemy.isInvulnerable = true;
                        setTimeout(() => { state.enemy.isInvulnerable = false; }, 200);
                    }

                    return false;
                }

                // Check collision with enemy2 (for levels 5-20 with 2 enemies)
                if (state.enemy2.x > 0) { // Check if enemy2 exists
                    const hitPoint2 = checkCollision(arrow, state.enemy2);
                    if (hitPoint2 && !state.enemy2.isDead && !state.enemy2.isInvulnerable) {
                        createParticles(arrow.x, arrow.y, '#ff0000');

                        if (hitPoint2 === 'head') {
                            state.enemy2.health = 0;
                            const pointsMultiplier = powerUps.doublePoints ? 2 : 1;
                            setScore(s => s + 5 * pointsMultiplier);
                            setCoins(c => c + 20);
                            setKillStreak(k => k + 1);
                            setTotalKills(t => t + 1);
                            setCurrentLevelKills(prev => {
                                const newKills = prev + 1;
                                // Levels 5-20 have 2 enemies, levels 1-4 have 1 enemy
                                const requiredKills = (level >= 5 && level <= 20) ? 2 : 1;
                                if (newKills >= requiredKills) {
                                    setLevelComplete(true);
                                    // Clear all enemy arrows
                                    state.enemyArrows = [];
                                    if (level >= 5 && level <= 20) state.enemy2Arrows = [];
                                }
                                return newKills;
                            });

                            setKillMessage({ text: "HEADSHOT!", color: "#FF0000" });
                            setTimeout(() => setKillMessage(null), 1500);

                            state.enemy2.isDead = true;
                            state.enemy2.deathFrame = 0;
                            state.enemy2.isInvulnerable = true;

                            return false;
                        }

                        state.enemy2.health--;
                        const pointsMultiplier = powerUps.doublePoints ? 2 : 1;
                        setScore(s => s + 2 * pointsMultiplier);
                        setCoins(c => c + 5);

                        if (state.enemy2.health <= 0) {
                            setKillStreak(k => k + 1);
                            setTotalKills(t => t + 1);
                            setCurrentLevelKills(prev => {
                                const newKills = prev + 1;
                                // Levels 5-20 have 2 enemies, levels 1-4 have 1 enemy
                                const requiredKills = (level >= 5 && level <= 20) ? 2 : 1;
                                if (newKills >= requiredKills) {
                                    setLevelComplete(true);
                                    // Clear all enemy arrows
                                    state.enemyArrows = [];
                                    if (level >= 5 && level <= 20) state.enemy2Arrows = [];
                                }
                                return newKills;
                            });

                            setKillMessage({ text: "ENEMY 2 KILLED", color: "#FFA500" });
                            setTimeout(() => setKillMessage(null), 1500);

                            state.enemy2.isDead = true;
                            state.enemy2.deathFrame = 0;
                        } else {
                            state.enemy2.isInvulnerable = true;
                            setTimeout(() => { state.enemy2.isInvulnerable = false; }, 200);
                        }

                        return false;
                    }
                }

                drawArrow(arrow);
                return arrow.x < canvas.width && arrow.y < canvas.height;
            });

            state.enemyArrows = state.enemyArrows.filter(arrow => {
                // Apply air resistance for smoother motion
                arrow.vx *= 0.99; // Slight air resistance
                arrow.x += arrow.vx;
                arrow.y += arrow.vy;
                arrow.vy += 0.25; // Slightly reduced gravity for smoother arc

                // Friendly Fire
                if (arrow.age !== undefined) arrow.age++;
                else arrow.age = 0; // fallback

                // Check Obstacle Collision for Enemy Arrows
                let obstacleHit = false;
                for (let obs of state.obstacles) {
                    if (arrow.x >= obs.x && arrow.x <= obs.x + obs.w &&
                        arrow.y >= obs.y && arrow.y <= obs.y + obs.h) {
                        obstacleHit = true;
                        // Enhanced particle effect - sparks flying from impact
                        createParticles(arrow.x, arrow.y, '#FF4500', 20); // Red-orange sparks
                        createParticles(arrow.x, arrow.y, '#FFA500', 15); // Orange sparks
                        createParticles(arrow.x, arrow.y, '#888', 10); // Gray dust
                        break;
                    }
                }

                if (obstacleHit) return false; // Remove arrow

                // Check Friendly Fire (Enemy Self Damage)
                if (arrow.age > 20 || arrow.vy > 2) {
                    const enemyHitPoint = checkCollision(arrow, state.enemy);
                    // 99% chance enemy dodges their own arrow, only 1% chance it hits
                    const dodgesArrow = Math.random() < 0.99; // 99% dodge chance

                    if (enemyHitPoint && !state.enemy.isDead && !state.enemy.isInvulnerable && !dodgesArrow) {
                        createParticles(arrow.x, arrow.y, '#ff0000');

                        // Enemy damage logic (friendly fire - show popup)
                        if (enemyHitPoint === 'head') {
                            state.enemy.health = 0;
                            // No score/coins for enemy self-kill

                            setKillMessage({ text: "ENEMY SELF-KILL!", color: "#FFA500" });
                            setTimeout(() => setKillMessage(null), 1500);

                            state.enemy.isDead = true;
                            state.enemy.deathFrame = 0;
                            state.enemy.isInvulnerable = true;

                            // Show popup after 1 second
                            setTimeout(() => {
                                setEnemySelfKill(true);
                                setIsPaused(true);
                            }, 1000);

                            return false;
                        }

                        state.enemy.health--;
                        if (state.enemy.health <= 0) {
                            // Enemy killed themselves - show popup
                            setKillMessage({ text: "ENEMY SELF-KILL!", color: "#FFA500" });
                            setTimeout(() => setKillMessage(null), 1500);

                            state.enemy.isDead = true;
                            state.enemy.deathFrame = 0;

                            // Show popup after 1 second
                            setTimeout(() => {
                                setEnemySelfKill(true);
                                setIsPaused(true);
                            }, 1000);
                        } else {
                            state.enemy.isInvulnerable = true;
                            setTimeout(() => { state.enemy.isInvulnerable = false; }, 200);
                        }

                        return false;
                    }
                }

                const hitPoint = checkCollision(arrow, state.player);
                // Don't process damage if level is already complete - player is invulnerable
                if (hitPoint && !state.player.isDead && !state.player.isInvulnerable && !powerUps.shield && !levelComplete) {
                    createParticles(arrow.x, arrow.y, '#0000ff');

                    if (hitPoint === 'head') {
                        // Headshot = Game Over
                        state.player.health = 0;
                        state.player.isDead = true;
                        setKillStreak(0);
                        setGameOverReason('HEADSHOT!');
                        setGameOver(true);
                        setIsPaused(true);

                        return false;
                    }

                    state.player.health--;

                    if (state.player.health <= 0) {
                        setKillStreak(0);
                        state.player.isDead = true;
                        setGameOverReason('BODY SHOT!');

                        setTimeout(() => {
                            setGameOver(true);
                            setIsPaused(true);
                        }, 1000);
                    } else {
                        state.player.isInvulnerable = true;
                        setTimeout(() => { state.player.isInvulnerable = false; }, 200);
                    }

                    return false;
                }

                drawArrow(arrow);
                return arrow.x > 0 && arrow.x < canvas.width && arrow.y < canvas.height;
            });

            // Process enemy2 arrows (for levels 5-20 with 2 enemies)
            if (state.enemy2.x > 0) { // Process if enemy2 exists
                state.enemy2Arrows = state.enemy2Arrows.filter(arrow => {
                    // Apply air resistance for smoother motion
                    arrow.vx *= 0.99;
                    arrow.x += arrow.vx;
                    arrow.y += arrow.vy;
                    arrow.vy += 0.25;

                    if (arrow.age !== undefined) arrow.age++;
                    else arrow.age = 0;

                    // Check Obstacle Collision for Enemy2 Arrows
                    let obstacleHit = false;
                    for (let obs of state.obstacles) {
                        if (arrow.x >= obs.x && arrow.x <= obs.x + obs.w &&
                            arrow.y >= obs.y && arrow.y <= obs.y + obs.h) {
                            obstacleHit = true;
                            createParticles(arrow.x, arrow.y, '#FF4500', 20);
                            createParticles(arrow.x, arrow.y, '#FFA500', 15);
                            createParticles(arrow.x, arrow.y, '#888', 10);
                            break;
                        }
                    }

                    if (obstacleHit) return false;

                    // Check Enemy2 Self Damage
                    if (arrow.age > 20 || arrow.vy > 2) {
                        const enemy2HitPoint = checkCollision(arrow, state.enemy2);
                        const dodgesArrow = Math.random() < 0.99;

                        if (enemy2HitPoint && !state.enemy2.isDead && !state.enemy2.isInvulnerable && !dodgesArrow) {
                            createParticles(arrow.x, arrow.y, '#ff0000');

                            if (enemy2HitPoint === 'head') {
                                state.enemy2.health = 0;
                                setKillMessage({ text: "ENEMY 2 SELF-KILL!", color: "#FFA500" });
                                setTimeout(() => setKillMessage(null), 1500);

                                state.enemy2.isDead = true;
                                state.enemy2.deathFrame = 0;
                                state.enemy2.isInvulnerable = true;

                                setTimeout(() => {
                                    setEnemySelfKill(true);
                                    setIsPaused(true);
                                }, 1000);

                                return false;
                            }

                            state.enemy2.health--;
                            if (state.enemy2.health <= 0) {
                                setKillMessage({ text: "ENEMY 2 SELF-KILL!", color: "#FFA500" });
                                setTimeout(() => setKillMessage(null), 1500);

                                state.enemy2.isDead = true;
                                state.enemy2.deathFrame = 0;

                                setTimeout(() => {
                                    setEnemySelfKill(true);
                                    setIsPaused(true);
                                }, 1000);
                            } else {
                                state.enemy2.isInvulnerable = true;
                                setTimeout(() => { state.enemy2.isInvulnerable = false; }, 200);
                            }

                            return false;
                        }
                    }

                    // Check collision with player
                    const hitPoint = checkCollision(arrow, state.player);
                    if (hitPoint && !state.player.isDead && !state.player.isInvulnerable && !powerUps.shield && !levelComplete) {
                        createParticles(arrow.x, arrow.y, '#0000ff');

                        if (hitPoint === 'head') {
                            state.player.health = 0;
                            state.player.isDead = true;
                            setKillStreak(0);
                            setGameOverReason('HEADSHOT!');
                            setGameOver(true);
                            setIsPaused(true);
                            return false;
                        }

                        state.player.health--;

                        if (state.player.health <= 0) {
                            setKillStreak(0);
                            state.player.isDead = true;
                            setGameOverReason('BODY SHOT!');

                            setTimeout(() => {
                                setGameOver(true);
                                setIsPaused(true);
                            }, 1000);
                        } else {
                            state.player.isInvulnerable = true;
                            setTimeout(() => { state.player.isInvulnerable = false; }, 200);
                        }

                        return false;
                    }

                    drawArrow(arrow);
                    return arrow.x > 0 && arrow.x < canvas.width && arrow.y < canvas.height;
                });
            }

            if (!state.enemy.isDead) {
                // Smooth movement toward target position - optimal balance
                const moveSpeed = 0.05; // 3% per frame for smooth, natural movement
                const dx = state.enemy.targetX - state.enemy.x;
                const dy = state.enemy.targetY - state.enemy.y;

                // Only move if distance is significant (avoid jittering)
                if (Math.abs(dx) > 0.5) {
                    state.enemy.x += dx * moveSpeed;
                }
                if (Math.abs(dy) > 0.5) {
                    state.enemy.y += dy * moveSpeed;
                }

                state.enemyShootTimer++;
                // Much slower shooting speed for better gameplay balance
                // Base delay is 240 frames (4 seconds), reduce slightly with level but cap the speed
                const baseDelay = 240; // Increased from 180 for even slower shooting
                const levelSpeedBonus = Math.min(level * 4, 30); // Reduced from 40 for more balanced progression
                const shootDelay = baseDelay - levelSpeedBonus;
                const chargeFrames = 20; // Frames to charge before shooting

                // Start charging when close to shoot time
                if (state.enemyShootTimer > shootDelay - chargeFrames && state.enemyShootTimer <= shootDelay) {
                    state.enemyIsCharging = true;
                    state.enemyChargeTime = state.enemyShootTimer - (shootDelay - chargeFrames);

                    // Calculate angle during charge (will be used when shooting)
                    const makesMistake = Math.random() < 0.1; // 10% chance
                    if (makesMistake) {
                        state.enemyAngle = -(60 + Math.random() * 60); // Upward mistake (Negative Y)
                    } else {
                        // Global Angle: -125 to -225 (Left-Up to Left-Down).
                        // -135 is roughly 45 degrees Up-Left.
                        state.enemyAngle = -(125 + (Math.random() + 0.5) * 100);
                    }
                } else {
                    state.enemyIsCharging = false;
                    state.enemyChargeTime = 0;
                }

                if (state.enemyShootTimer > shootDelay) {
                    // 90% chance to shoot at player, 10% chance to make a mistake (shoot upward)
                    // The angle is already calculated during charging, so we use state.enemyAngle
                    const angle = state.enemyAngle;
                    let power;

                    // Determine power based on whether it was a mistake shot or normal shot
                    if (angle <= -60 && angle >= -120) { // Upward shot range (Negative Y)
                        power = 8 + Math.random() * 4; // Medium power
                    } else {
                        // Medium arrow power - slight increase with level but capped
                        const basePower = 9;
                        const levelPowerBonus = Math.min(level * 0.3, 3); // Max +3 power
                        power = basePower + levelPowerBonus + (Math.random() * 2);
                    }

                    state.enemyArrows.push({
                        x: state.enemy.x - 10,
                        y: state.enemy.y - 30,
                        vx: Math.cos((angle * Math.PI) / 180) * power,
                        vy: Math.sin((angle * Math.PI) / 180) * power,
                        age: 0 // Friendly fire
                    });
                    state.enemyShootTimer = 0;
                    state.enemyIsCharging = false;
                    state.enemyChargeTime = 0;
                }
            }

            // Enemy2 shooting logic (for levels 5-20 with 2 enemies)
            if (!state.enemy2.isDead && state.enemy2.x > 0) {
                // Smooth movement toward target position
                const moveSpeed = 0.05;
                const dx = state.enemy2.targetX - state.enemy2.x;
                const dy = state.enemy2.targetY - state.enemy2.y;

                if (Math.abs(dx) > 0.5) {
                    state.enemy2.x += dx * moveSpeed;
                }
                if (Math.abs(dy) > 0.5) {
                    state.enemy2.y += dy * moveSpeed;
                }

                state.enemy2ShootTimer++;
                const baseDelay = 240;
                const levelSpeedBonus = Math.min(level * 4, 30);
                const shootDelay = baseDelay - levelSpeedBonus;
                const chargeFrames = 20;

                // Start charging when close to shoot time
                if (state.enemy2ShootTimer > shootDelay - chargeFrames && state.enemy2ShootTimer <= shootDelay) {
                    state.enemy2IsCharging = true;
                    state.enemy2ChargeTime = state.enemy2ShootTimer - (shootDelay - chargeFrames);

                    // Calculate angle during charge
                    const makesMistake = Math.random() < 0.1; // 10% chance
                    if (makesMistake) {
                        state.enemy2Angle = -(60 + Math.random() * 60); // Upward mistake
                    } else {
                        // Aim at player
                        state.enemy2Angle = -(125 + (Math.random() + 0.5) * 100);
                    }
                } else {
                    state.enemy2IsCharging = false;
                    state.enemy2ChargeTime = 0;
                }

                if (state.enemy2ShootTimer > shootDelay) {
                    const angle = state.enemy2Angle;
                    let power;

                    if (angle <= -60 && angle >= -120) {
                        power = 8 + Math.random() * 4;
                    } else {
                        const basePower = 9;
                        const levelPowerBonus = Math.min(level * 0.3, 3);
                        power = basePower + levelPowerBonus + (Math.random() * 2);
                    }

                    state.enemy2Arrows.push({
                        x: state.enemy2.x - 10,
                        y: state.enemy2.y - 30,
                        vx: Math.cos((angle * Math.PI) / 180) * power,
                        vy: Math.sin((angle * Math.PI) / 180) * power,
                        age: 0
                    });
                    state.enemy2ShootTimer = 0;
                    state.enemy2IsCharging = false;
                    state.enemy2ChargeTime = 0;
                }
            }

            drawParticles();

            if (!state.player.isDead) {
                drawStickman(state.player.x, state.player.y, false, false, 0, state.player.health, state.isCharging, state.angle);
                drawBow(state.player.x, state.player.y, state.angle, state.isCharging, state.chargeTime, false);

                if (powerUps.shield) {
                    ctx.strokeStyle = 'rgba(0, 150, 255, 0.6)';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(state.player.x, state.player.y - 30, 40, 0, Math.PI * 2);
                    ctx.stroke();
                }
            } else {
                // Death animation for 1 second (60 frames at 60fps)
                if (state.player.deathFrame < 60) {
                    state.player.deathFrame++;
                    drawStickman(state.player.x, state.player.y, true, false, state.player.deathFrame, state.player.health);
                } else {
                    // After 1 second, hide the player by moving it off-screen
                    state.player.x = -1000;
                    state.player.y = -1000;
                }
            }

            if (!state.enemy.isDead) {
                drawStickman(state.enemy.x, state.enemy.y, false, true, 0, state.enemy.health);
                // Draw enemy bow
                drawBow(state.enemy.x, state.enemy.y, state.enemyAngle, state.enemyIsCharging, state.enemyChargeTime, true);
            } else {
                // Death animation for 1 second (60 frames at 60fps)
                if (state.enemy.deathFrame < 60) {
                    state.enemy.deathFrame++;
                    drawStickman(state.enemy.x, state.enemy.y, true, true, state.enemy.deathFrame, state.enemy.health);
                } else {
                    // After 1 second, hide the enemy by moving it off-screen
                    state.enemy.x = -1000;
                    state.enemy.y = -1000;
                }
            }

            // Draw enemy2 (for levels with 2 enemies: 5-20)
            if (state.enemy2.x > 0 && !state.enemy2.isDead) { // Only draw if not hidden and alive
                if (!state.enemy2.isDead) {
                    drawStickman(state.enemy2.x, state.enemy2.y, false, true, 0, state.enemy2.health);
                    // Draw enemy2 bow
                    drawBow(state.enemy2.x, state.enemy2.y, state.enemy2Angle, state.enemy2IsCharging, state.enemy2ChargeTime, true);
                } else {
                    // Death animation for 1 second (60 frames at 60fps)
                    if (state.enemy2.deathFrame < 60) {
                        state.enemy2.deathFrame++;
                        drawStickman(state.enemy2.x, state.enemy2.y, true, true, state.enemy2.deathFrame, state.enemy2.health);
                    } else {
                        // After 1 second, hide the enemy by moving it off-screen
                        state.enemy2.x = -1000;
                        state.enemy2.y = -1000;
                    }
                }
            } else if (state.enemy2.isDead && state.enemy2.x > 0) {
                // Show death animation even if dead
                if (state.enemy2.deathFrame < 60) {
                    state.enemy2.deathFrame++;
                    drawStickman(state.enemy2.x, state.enemy2.y, true, true, state.enemy2.deathFrame, state.enemy2.health);
                } else {
                    state.enemy2.x = -1000;
                    state.enemy2.y = -1000;
                }
            }

            // Draw ammo box
            // drawAmmoBox();

            // Handle ammo reload
            if (state.ammo < state.maxAmmo) {
                state.ammoReloadTimer++;
                if (state.ammoReloadTimer >= 180) { // 3 seconds at 60fps
                    state.ammo = state.maxAmmo;
                    state.ammoReloadTimer = 0;
                }
            }

            // Handle Player Movement & Auto-Move
            state.autoMoveTimer += 0.05;

            // Handle Player Movement (Manual Only)
            if (state.keys.left) state.player.x -= 3;
            if (state.keys.right) state.player.x += 3;
            if (state.keys.up) state.player.y -= 3;
            if (state.keys.down) state.player.y += 3;

            // Handle Enemy Movement (AI - "Anime" Style)
            // Starts easy (Level 1) and gets erratic/fast (Level 10)
            if (!state.enemy.isDead && level >= 11) {
                const speedMultiplier = 1 + (level * 0.2); // Faster each level
                const swayRange = 50 + (level * 10); // Wider movement each level

                // Vertical Hover (Sine wave)
                // Use state.autoMoveTimer which is already incrementing
                const hoverY = Math.sin(state.autoMoveTimer * 0.05 * speedMultiplier) * (swayRange * 0.5);

                // Horizontal Sway (Cosine wave, slower)
                const swayX = Math.cos(state.autoMoveTimer * 0.03 * speedMultiplier) * (swayRange * 0.3);

                // Apply to a base position so it doesn't drift off screen
                const basePos = state.enemyPositions[state.currentEnemyPosIndex];

                // Lerp towards target position for smooth transition
                state.enemy.x = basePos.x + swayX;
                state.enemy.y = basePos.y + hoverY;

                // Clamp bounds
                if (state.enemy.y < 100) state.enemy.y = 100;
                if (state.enemy.y > 500) state.enemy.y = 500;
            }

            // Boundary Checks
            if (state.player.x < 20) state.player.x = 20;
            if (state.player.x > 400) state.player.x = 400;
            if (state.player.y < 100) state.player.y = 100; // Ceiling
            if (state.player.y > 550) state.player.y = 550; // Floor

            animationId = requestAnimationFrame(gameLoop);
        };

        const handleMouseDown = (e) => {
            if (gameOver || isPaused) return;
            // Prevent default to avoid selection issues
            // e.preventDefault(); 
            const rect = canvas.getBoundingClientRect();
            // Handle both touch and mouse
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            // Scale coordinates to match internal game coordinates
            const mouseX = (clientX - rect.left) * (BASE_WIDTH / rect.width);
            const mouseY = (clientY - rect.top) * (BASE_HEIGHT / rect.height);

            const state = gameState.current;
            const dx = mouseX - state.player.x;
            const dy = mouseY - (state.player.y - 30);
            state.angle = (Math.atan2(dy, dx) * 180) / Math.PI;

            state.isCharging = true;
            state.chargeTime = 0;
        };

        const handleMouseMove = (e) => {
            if (gameOver || isPaused) return;
            const state = gameState.current;

            // Only tracking if we are charging (for drag effect)
            if (state.isCharging) {
                e.preventDefault(); // Prevent scrolling on touch
                const rect = canvas.getBoundingClientRect();
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;

                // Scale coordinates to match internal game coordinates
                const mouseX = (clientX - rect.left) * (BASE_WIDTH / rect.width);
                const mouseY = (clientY - rect.top) * (BASE_HEIGHT / rect.height);

                const dx = mouseX - state.player.x;
                const dy = mouseY - (state.player.y - 30);
                state.angle = (Math.atan2(dy, dx) * 180) / Math.PI;
                state.chargeTime = Math.min(state.chargeTime + 1, 30);
            }
        };

        const handleMouseUp = (e) => {
            if (gameOver || isPaused) return;
            // e.preventDefault();
            const state = gameState.current;
            if (state.isCharging && state.ammo > 0) {
                const power = 9 + (state.chargeTime / 30) * 10; // Increased power for longer distance
                state.arrows.push({
                    x: state.player.x,
                    y: state.player.y - 30,
                    vx: Math.cos((state.angle * Math.PI) / 180) * power,
                    vy: Math.sin((state.angle * Math.PI) / 180) * power,
                    age: 0 // Track arrow age for self-damage safety
                });
                state.ammo--;
                state.isCharging = false;
                state.chargeTime = 0;

                // Reset reload timer when shooting
                if (state.ammo === 0) {
                    state.ammoReloadTimer = 0;
                }
            } else {
                state.isCharging = false;
                state.chargeTime = 0;
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'ArrowLeft') gameState.current.keys.left = true;
            if (e.key === 'ArrowRight') gameState.current.keys.right = true;
            if (e.key === 'ArrowUp') gameState.current.keys.up = true;
            if (e.key === 'ArrowDown') gameState.current.keys.down = true;
        };

        const handleKeyUp = (e) => {
            if (e.key === 'ArrowLeft') gameState.current.keys.left = false;
            if (e.key === 'ArrowRight') gameState.current.keys.right = false;
            if (e.key === 'ArrowUp') gameState.current.keys.up = false;
            if (e.key === 'ArrowDown') gameState.current.keys.down = false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);

        // Touch events
        canvas.addEventListener('touchstart', handleMouseDown, { passive: false });
        canvas.addEventListener('touchmove', handleMouseMove, { passive: false });
        canvas.addEventListener('touchend', handleMouseUp, { passive: false });

        gameLoop();

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);

            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseup', handleMouseUp);

            canvas.removeEventListener('touchstart', handleMouseDown);
            canvas.removeEventListener('touchmove', handleMouseMove);
            canvas.removeEventListener('touchend', handleMouseUp);
        };
    }, [isPaused, gameOver, difficulty, powerUps, levelComplete]);

    const resetGame = () => {
        if (score > highScore) setHighScore(score);
        // Don't reset score - preserve across games
        // setScore(0);
        setGameOver(false);
        setKillStreak(0);
        // Don't reset total kills - preserve across games
        // setTotalKills(0);
        setCurrentLevelKills(0); // Reset level kills
        setGameTime(0); // Reset timer to 0:00
        setGameWon(false); // Clear win state
        setGameOver(false); // Clear game over state
        setGameOverReason(null); // Clear game over reason
        setLevelComplete(false); // Clear level complete state
        setKillMessage(null); // Clear kill messages
        setIsPaused(false); // Unpause and start playing immediately
        setPowerUps({ doublePoints: false, shield: false });

        // Get level-specific positions
        const levelPositions = getPositionsForLevel(level);

        gameState.current = {
            player: {
                x: levelPositions.player.x,
                y: levelPositions.player.y,
                health: 3,
                arrowHits: [],
                isDead: false,
                deathFrame: 0,
                isInvulnerable: false
            },
            enemy: {
                x: levelPositions.enemy.x,
                y: levelPositions.enemy.y,
                health: 3,
                arrowHits: [],
                isDead: false,
                deathFrame: 0,
                isInvulnerable: false,
                targetX: levelPositions.enemy.x,
                targetY: levelPositions.enemy.y
            },
            arrows: [],
            enemyArrows: [],
            isCharging: false,
            chargeTime: 0,
            angle: -45,
            enemyAngle: -135, // Default facing Left-Up
            enemyIsCharging: false,
            enemyChargeTime: 0,
            enemyShootTimer: 0,
            particles: [],
            ammo: 10,
            maxAmmo: 10,
            ammoReloadTimer: 0,
            // Restore arrays for backward compatibility if needed, but logic uses x/y directly
            playerPositions: gameState.current.playerPositions || [],
            enemyPositions: gameState.current.enemyPositions || [],
            currentPlayerPosIndex: 0,
            currentEnemyPosIndex: 0,
            keys: { left: false, right: false, up: false, down: false },
            autoMoveTimer: 0,
            obstacles: []
        };
    };

    // const buyPowerUp = (powerUp, cost) => {
    //     if (coins >= cost && !powerUps[powerUp]) {
    //         setCoins(c => c - cost);
    //         setPowerUps(p => ({ ...p, [powerUp]: true }));
    //         setTimeout(() => {
    //             setPowerUps(p => ({ ...p, [powerUp]: false }));
    //         }, 30000);
    //     }
    // };

    const handleNextLevel = () => {
        setLevel(prev => prev + 1);
        setCurrentLevelKills(0);
        setLevelComplete(false);
        resetLevelState();
    };

    const handleReplayLevel = () => {
        setCurrentLevelKills(0);
        setLevelComplete(false);
        resetLevelState();
    };

    const resetLevelState = () => {
        if (killTimeoutRef.current) {
            clearTimeout(killTimeoutRef.current);
            killTimeoutRef.current = null;
        }
        const state = gameState.current;
        state.enemy.health = 3;
        state.enemy.isDead = false;
        state.enemy.isInvulnerable = false;
        state.arrows = []; // Clear arrows
        state.enemyArrows = [];
        state.player.health = 3;
        state.player.isDead = false;

        // Get level-specific positions
        const positions = getPositionsForLevel(level);

        // Reset player position to level-specific position
        state.player.x = positions.player.x;
        state.player.y = positions.player.y;

        // Reset enemy position to level-specific position
        state.enemy.x = positions.enemy.x;
        state.enemy.y = positions.enemy.y;
        state.enemy.targetX = positions.enemy.x;
        state.enemy.targetY = positions.enemy.y;

        setGameOver(false);
        setPlayerSelfKill(false);
        setEnemySelfKill(false);
        setIsPaused(false);
        setGameTime(0);
        setGameWon(false);
    };

    return (
        <>
            <div className={`flex flex-col items-center justify-center ${isMobile ? 'p-2' : isTablet ? 'p-4' : 'p-5'}`}
                style={{
                    borderRadius: isMobile ? '12px' : '20px',
                    overflowX: 'hidden',
                    boxSizing: 'border-box'
                }}>
                <style>{`
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                .pulse-animation {
                    animation: pulse 1s infinite;
                }
            `}</style>

                {/* Game Canvas Container */}
                <div className="relative" style={{ margin: '0 auto', display: 'block' }}>
                    <canvas
                        ref={canvasRef}
                        width={BASE_WIDTH}
                        height={BASE_HEIGHT}
                        className="rounded-3xl cursor-crosshair bg-sky-200"
                    />
                    {/* Control Buttons Below Canvas */}
                    <div className="flex justify-between absolute bottom-2">
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="bg-white rounded-full hover:bg-gray-100 transition"
                            style={{ padding: isMobile ? "12px" : "10px" }}
                        >
                            <Settings className={`text-black ${isMobile ? 'w-7 h-7' : 'w-6 h-6'}`} />
                        </button>

                        <button
                            onClick={() => setIsPaused(!isPaused)}
                            className="bg-white rounded-full hover:bg-gray-100 transition"
                            style={{ padding: isMobile ? "12px" : "10px" }}
                        >
                            {isPaused ? (
                                <Play className={`text-black ${isMobile ? 'w-7 h-7' : 'w-6 h-6'}`} />
                            ) : (
                                <Pause className={`text-black ${isMobile ? 'w-7 h-7' : 'w-6 h-6'}`} />
                            )}
                        </button>
                    </div>

                    {/* HUD - Premium Glassmorphic Design */}
                    <div className={`absolute ${isMobile ? 'top-2' : 'top-6'} left-0 right-0 flex justify-center z-20 pointer-events-none px-2`}>
                        <div className={`bg-slate-900/80 backdrop-blur-xl border border-white/20 rounded-full shadow-[0_0_30px_rgba(0,0,0,0.4)] flex items-center text-white justify-between
                            ${isMobile ? 'px-2 py-1.5 gap-1.5 flex-wrap max-w-full' : isTablet ? 'px-6 py-2 gap-4 max-w-[90%]' : 'px-8 py-3 gap-8 max-w-[700px]'}`}>

                            {/* Level Section */}
                            <div className="flex items-center gap-2">
                                <div className={`bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/30
                                    ${isMobile ? 'w-8 h-8' : isTablet ? 'w-10 h-10' : 'w-12 h-12'}`}>
                                    <Star className={`text-white ${isMobile ? 'w-4 h-4' : isTablet ? 'w-5 h-5' : 'w-6 h-6'}`} strokeWidth={2.5} />
                                </div>
                                <div className="flex flex-col">
                                    <span className={`font-bold text-purple-300 tracking-[0.2em] uppercase ${isMobile ? 'text-[8px]' : 'text-[10px]'}`}>Level</span>
                                    <span className={`font-black text-white leading-none tracking-tight filter drop-shadow-md ${isMobile ? 'text-lg' : isTablet ? 'text-2xl' : 'text-3xl'}`}>
                                        {level.toString().padStart(2, '0')}
                                    </span>
                                </div>
                            </div>

                            {/* Vertical Divider */}
                            {!isMobile && <div className={`w-px bg-gradient-to-b from-transparent via-white/20 to-transparent ${isTablet ? 'h-8' : 'h-10'}`}></div>}

                            {/* Timer Section */}
                            <div className="flex items-center gap-2">
                                <div className={`bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30
                                    ${isMobile ? 'w-8 h-8' : isTablet ? 'w-10 h-10' : 'w-12 h-12'}`}>
                                    <Zap className={`text-white animate-pulse ${isMobile ? 'w-4 h-4' : isTablet ? 'w-5 h-5' : 'w-6 h-6'}`} strokeWidth={2.5} />
                                </div>
                                <div className="flex flex-col">
                                    <span className={`font-bold text-blue-300 tracking-[0.2em] uppercase ${isMobile ? 'text-[8px]' : 'text-[10px]'}`}>Time</span>
                                    <span className={`font-black text-cyan-400 leading-none tracking-tight filter drop-shadow-md font-mono ${isMobile ? 'text-lg' : isTablet ? 'text-2xl' : 'text-3xl'}`}>
                                        {Math.floor(gameTime / 60).toString().padStart(2, '0')}:{(gameTime % 60).toString().padStart(2, '0')}
                                    </span>
                                </div>
                            </div>

                            {/* Vertical Divider */}
                            {!isMobile && <div className={`w-px bg-gradient-to-b from-transparent via-white/20 to-transparent ${isTablet ? 'h-8' : 'h-10'}`}></div>}

                            {/* Kills Section */}
                            <div className="flex items-center gap-2">
                                <div className={`bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30
                                    ${isMobile ? 'w-8 h-8' : isTablet ? 'w-10 h-10' : 'w-12 h-12'}`}>
                                    <Skull className={`text-white animate-pulse ${isMobile ? 'w-5 h-5' : isTablet ? 'w-6 h-6' : 'w-7 h-7'}`} strokeWidth={2.5} />
                                </div>
                                <div className="flex flex-col">
                                    <span className={`font-bold text-red-300 tracking-[0.2em] uppercase ${isMobile ? 'text-[8px]' : 'text-[10px]'}`}>Kills</span>
                                    <span className={`font-black text-white leading-none tracking-tight filter drop-shadow-md ${isMobile ? 'text-lg' : isTablet ? 'text-2xl' : 'text-3xl'}`}>
                                        {totalKills.toString().padStart(2, '0')}
                                    </span>
                                </div>
                            </div>

                            {/* Vertical Divider */}
                            {!isMobile && <div className={`w-px bg-gradient-to-b from-transparent via-white/20 to-transparent ${isTablet ? 'h-8' : 'h-10'}`}></div>}

                            {/* Score Section */}
                            <div className="flex items-center gap-2">
                                <div className="flex flex-col items-end">
                                    <span className={`font-bold text-yellow-300 tracking-[0.2em] uppercase ${isMobile ? 'text-[8px]' : 'text-[10px]'}`}>Score</span>
                                    <span className={`font-black text-yellow-400 leading-none tracking-tight filter drop-shadow-md ${isMobile ? 'text-lg' : isTablet ? 'text-2xl' : 'text-3xl'}`}>
                                        {score.toLocaleString()}
                                    </span>
                                </div>
                                <div className={`bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/30
                                    ${isMobile ? 'w-8 h-8' : isTablet ? 'w-10 h-10' : 'w-12 h-12'}`}>
                                    <Trophy className={`text-white ${isMobile ? 'w-4 h-4' : isTablet ? 'w-5 h-5' : 'w-6 h-6'}`} strokeWidth={2.5} />
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Settings Panel - Centered */}
                    {showSettings && (
                        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 z-50 animate-in fade-in zoom-in duration-200
                            ${isMobile ? 'p-4 w-[85%] max-w-[320px]' : isTablet ? 'p-5 w-[70%] max-w-[400px]' : 'p-6 w-96 max-w-[500px]'}`} style={{ zIndex: 9999 }}>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black text-white italic tracking-wider uppercase">Settings</h3>
                                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 mb-2 block uppercase tracking-widest">Difficulty Level</label>
                                    <div className="flex flex-col gap-3">
                                        {[
                                            { id: 'easy', label: '🟢 Easy Mode', color: 'border-green-500' },
                                            { id: 'medium', label: '🟡 Medium Mode', color: 'border-yellow-500' },
                                            { id: 'hard', label: '🔴 Hard Mode', color: 'border-red-500' }
                                        ].map((mode) => (
                                            <button
                                                key={mode.id}
                                                onClick={() => {
                                                    setDifficulty(mode.id);
                                                    setShowSettings(false);
                                                }}
                                                className={`w-full py-3 px-4 rounded-xl text-left font-bold transition-all transform hover:scale-105 active:scale-95 flex items-center justify-between
                                                    ${difficulty === mode.id
                                                        ? `bg-slate-700 text-white border-2 ${mode.color} shadow-lg shadow-purple-900/20`
                                                        : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:border-slate-600'
                                                    }`}
                                            >
                                                <span>{mode.label}</span>
                                                {difficulty === mode.id && <span className="text-xl">✓</span>}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-white/10">
                                    <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">High Score</span>
                                        <span className="font-black text-yellow-400 text-xl font-mono">{highScore}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Kills</span>
                                        <span className="font-black text-red-400 text-xl font-mono">{totalKills}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Kill Message Overlay */}
                    {killMessage && (
                        <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none w-full text-center">
                            <h2
                                className={`font-black italic tracking-tighter animate-bounce ${isMobile ? 'text-4xl' : isTablet ? 'text-5xl' : 'text-7xl'}`}
                                style={{
                                    color: killMessage.color,
                                    textShadow: '0 0 20px rgba(0,0,0,0.5), 0 0 40px ' + killMessage.color,
                                    WebkitTextStroke: isMobile ? '1px white' : '2px white'
                                }}
                            >
                                {killMessage.text}
                            </h2>
                        </div>
                    )}

                    {/* Level Complete / Next Level Screen */}
                    {levelComplete && (
                        <>
                            {/* Full-screen backdrop */}
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backdropFilter: 'blur(8px)',
                                    zIndex: 40
                                }}
                            />
                            {/* Victory Modal */}
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: 50,
                                    backgroundColor: 'rgba(0, 0, 0, 0.95)',
                                    padding: isMobile ? '20px' : isTablet ? '30px' : '40px',
                                    borderRadius: '20px',
                                    border: isMobile ? '3px solid #10B981' : '4px solid #10B981',
                                    textAlign: 'center',
                                    boxShadow: '0 0 30px rgba(16, 185, 129, 0.5)',
                                    width: isMobile ? '90%' : isTablet ? '80%' : 'auto',
                                    minWidth: isMobile ? 'auto' : isTablet ? '400px' : '450px',
                                    maxWidth: isMobile ? '95%' : isTablet ? '500px' : '600px'
                                }}
                            >
                                <h1 className={`font-black italic tracking-tighter mb-4 ${isMobile ? 'text-4xl' : isTablet ? 'text-5xl' : 'text-7xl'}`}
                                    style={{
                                        color: 'transparent',
                                        backgroundImage: 'linear-gradient(to right, #FCD34D, #F97316)',
                                        WebkitBackgroundClip: 'text',
                                        backgroundClip: 'text',
                                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
                                    }}>
                                    WIN!
                                </h1>
                                <h3 className={`text-white ${isMobile ? 'mb-4 text-xl' : isTablet ? 'mb-6 text-2xl' : 'mb-8 text-3xl'}`} style={{
                                    color: 'transparent',
                                    backgroundColor: '#ffffff',
                                    WebkitBackgroundClip: 'text',
                                    backgroundClip: 'text',
                                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
                                }}>
                                    Level {level} Cleared
                                </h3>

                                <div className="flex gap-5 justify-center">
                                    <button
                                        onClick={handleReplayLevel}
                                        style={{
                                            backgroundColor: '#4B5563',
                                            color: 'white',
                                            padding: '12px 24px',
                                            borderRadius: '20px',
                                            fontWeight: 'bold',
                                            border: '1px solid #9CA3AF',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            cursor: 'pointer',
                                            margin: '0 10px',
                                            transition: 'all 0.3s ease'
                                        }}
                                        onMouseOver={(e) => e.target.style.backgroundColor = '#374151'}
                                        onMouseOut={(e) => e.target.style.backgroundColor = '#4B5563'}
                                    >
                                        <RotateCcw className="w-5 h-5" />
                                        Replay
                                    </button>

                                    <button
                                        onClick={handleNextLevel}
                                        style={{
                                            background: 'linear-gradient(to right, #EAB308, #EA580C)',
                                            color: 'white',
                                            padding: '12px 32px',
                                            borderRadius: '20px',
                                            fontWeight: '900',
                                            fontSize: '1.125rem',
                                            border: 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
                                            transition: 'all 0.3s ease'
                                        }}
                                        onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                                        onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                                    >
                                        Next Level <ArrowUp className="w-6 h-6 animate-bounce" />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* GAME WON - Victory Screen */}
                    {gameWon && (
                        <>
                            {/* Full-screen backdrop with particles */}
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    background: 'rgba(0,0,0,0.3)', // Lighter overlay to show canvas under
                                    zIndex: 60
                                }}
                            />
                            {/* Win Modal */}
                            <div
                                className="animate-in zoom-in duration-500"
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: 70,
                                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.95) 0%, rgba(59, 130, 246, 0.95) 100%)',
                                    padding: isMobile ? '30px' : isTablet ? '40px' : '50px',
                                    borderRadius: '30px',
                                    border: isMobile ? '4px solid #FFD700' : '5px solid #FFD700',
                                    textAlign: 'center',
                                    boxShadow: '0 0 60px rgba(255, 215, 0, 0.8), inset 0 0 30px rgba(255, 255, 255, 0.2)',
                                    width: isMobile ? '90%' : isTablet ? '85%' : 'auto',
                                    minWidth: isMobile ? 'auto' : isTablet ? '450px' : '500px',
                                    maxWidth: isMobile ? '95%' : isTablet ? '550px' : '650px'
                                }}
                            >
                                {/* Trophy Icon */}
                                <div className="flex justify-center mb-6">
                                    <div className="bg-gradient-to-br from-yellow-300 to-yellow-600 w-24 h-24 rounded-full flex items-center justify-center shadow-2xl shadow-yellow-500/50 animate-bounce">
                                        <Trophy className="w-16 h-16 text-white" strokeWidth={3} />
                                    </div>
                                </div>

                                {/* Victory Text */}
                                <h1 className="text-8xl font-black italic tracking-tighter mb-4 animate-pulse"
                                    style={{
                                        color: 'transparent',
                                        backgroundImage: 'linear-gradient(to right, #FFD700, #FFA500, #FFD700)',
                                        WebkitBackgroundClip: 'text',
                                        backgroundClip: 'text',
                                        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.8))',
                                        textShadow: '0 0 30px rgba(255, 215, 0, 0.5)'
                                    }}>
                                    VICTORY!
                                </h1>

                                <h2 className="text-3xl font-bold text-white mb-8 drop-shadow-lg">
                                    🎉 You Survived {WIN_TIME_SECONDS} Seconds! 🎉
                                </h2>

                                {/* Stats Display */}
                                <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/20">
                                    <h3 className="text-xl font-bold text-yellow-300 mb-4 uppercase tracking-wider">Final Stats</h3>
                                    <div className="grid grid-cols-2 gap-4 text-white">
                                        <div className="bg-white/10 rounded-xl p-4">
                                            <div className="text-sm text-gray-300 mb-1">Time Survived</div>
                                            <div className="text-3xl font-black text-cyan-400 font-mono">
                                                {Math.floor(gameTime / 60)}:{(gameTime % 60).toString().padStart(2, '0')}
                                            </div>
                                        </div>
                                        <div className="bg-white/10 rounded-xl p-4">
                                            <div className="text-sm text-gray-300 mb-1">Level Reached</div>
                                            <div className="text-3xl font-black text-purple-400">{level}</div>
                                        </div>
                                        <div className="bg-white/10 rounded-xl p-4">
                                            <div className="text-sm text-gray-300 mb-1">Total Kills</div>
                                            <div className="text-3xl font-black text-red-400">{totalKills}</div>
                                        </div>
                                        <div className="bg-white/10 rounded-xl p-4">
                                            <div className="text-sm text-gray-300 mb-1">Final Score</div>
                                            <div className="text-3xl font-black text-yellow-400">{score}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-4 justify-center">
                                    <button
                                        onClick={() => {
                                            setGameWon(false);
                                            setIsPaused(false);
                                            // Don't reset timer - continue from current time
                                        }}
                                        style={{
                                            background: 'linear-gradient(to right, #10B981, #059669)',
                                            color: 'white',
                                            padding: '16px 32px',
                                            borderRadius: '9999px',
                                            fontWeight: 'bold',
                                            fontSize: '1.125rem',
                                            border: 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            cursor: 'pointer',
                                            boxShadow: '0 6px 12px rgba(0,0,0,0.3)',
                                            transition: 'all 0.3s ease'
                                        }}
                                        onMouseOver={(e) => {
                                            e.target.style.transform = 'scale(1.05)';
                                            e.target.style.boxShadow = '0 8px 16px rgba(0,0,0,0.4)';
                                        }}
                                        onMouseOut={(e) => {
                                            e.target.style.transform = 'scale(1)';
                                            e.target.style.boxShadow = '0 6px 12px rgba(0,0,0,0.3)';
                                        }}
                                    >
                                        <Play className="w-6 h-6" />
                                        Continue Playing
                                    </button>

                                    <button
                                        onClick={resetGame}
                                        style={{
                                            background: 'linear-gradient(to right, #EF4444, #DC2626)',
                                            color: 'white',
                                            padding: '16px 32px',
                                            borderRadius: '9999px',
                                            fontWeight: 'bold',
                                            fontSize: '1.125rem',
                                            border: 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            cursor: 'pointer',
                                            boxShadow: '0 6px 12px rgba(0,0,0,0.3)',
                                            transition: 'all 0.3s ease'
                                        }}
                                        onMouseOver={(e) => {
                                            e.target.style.transform = 'scale(1.05)';
                                            e.target.style.boxShadow = '0 8px 16px rgba(0,0,0,0.4)';
                                        }}
                                        onMouseOut={(e) => {
                                            e.target.style.transform = 'scale(1)';
                                            e.target.style.boxShadow = '0 6px 12px rgba(0,0,0,0.3)';
                                        }}
                                    >
                                        <RotateCcw className="w-6 h-6" />
                                        New Game
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Game Over Screen */}
                    {gameOver && (
                        <div className="absolute inset-0 flex items-center justify-center bg-opacity-70 rounded-2xl backdrop-blur-sm z-50">
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: 50,
                                    backgroundColor: 'rgba(20, 20, 40, 0.98)',
                                    padding: isMobile ? '20px' : isTablet ? '30px' : '40px',
                                    borderRadius: '24px',
                                    border: isMobile ? '2px solid rgba(239, 68, 68, 0.6)' : '3px solid rgba(239, 68, 68, 0.6)',
                                    textAlign: 'center',
                                    boxShadow: '0 0 50px rgba(239, 68, 68, 0.4), inset 0 0 30px rgba(0,0,0,0.3)',
                                    width: isMobile ? '90%' : isTablet ? '80%' : 'auto',
                                    minWidth: isMobile ? 'auto' : isTablet ? '400px' : '450px',
                                    maxWidth: isMobile ? '95%' : isTablet ? '500px' : '600px'
                                }}
                            >
                                <div className="mb-6">
                                    <Skull className="w-20 h-20 text-red-500 mx-auto animate-pulse" strokeWidth={2} />
                                </div>
                                <h2 className="text-6xl font-black text-red-500 mb-2 italic tracking-tight drop-shadow-lg">{gameOverReason || 'GAME OVER'}</h2>
                                <h3 className="text-4xl font-bold text-white mb-6">Game Over</h3>

                                <div className="bg-black/30 rounded-xl p-4 mb-6">
                                    <p className="text-2xl text-yellow-400 mb-2 font-bold">Score: {score}</p>
                                    <p className="text-lg text-gray-300">Best: {highScore}</p>
                                    <p className="text-lg text-red-400">Anime Kills: {totalKills}</p>
                                    <p className="text-lg text-purple-400">Level: {level}</p>
                                </div>

                                <div className="flex justify-center">
                                    <button
                                        onClick={handleReplayLevel}
                                        className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-4 px-12 rounded-full transition-all shadow-lg flex items-center gap-2 transform hover:scale-105"
                                    >
                                        <RotateCcw className="w-6 h-6" />
                                        Retry Level
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Player Self-Kill Screen */}
                    {playerSelfKill && (
                        <div className="absolute inset-0 flex items-center justify-center bg-opacity-70 rounded-2xl backdrop-blur-sm z-50">
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: 50,
                                    backgroundColor: 'rgba(255, 107, 107, 0.95)',
                                    padding: isMobile ? '20px' : isTablet ? '30px' : '40px',
                                    borderRadius: '24px',
                                    border: isMobile ? '3px solid rgba(255, 200, 87, 0.8)' : '4px solid rgba(255, 200, 87, 0.8)',
                                    textAlign: 'center',
                                    boxShadow: '0 0 50px rgba(255, 107, 107, 0.6), inset 0 0 30px rgba(0,0,0,0.3)',
                                    width: isMobile ? '90%' : isTablet ? '80%' : 'auto',
                                    minWidth: isMobile ? 'auto' : isTablet ? '400px' : '450px',
                                    maxWidth: isMobile ? '95%' : isTablet ? '500px' : '600px'
                                }}
                            >
                                <div className="mb-6">
                                    <Skull className="w-20 h-20 text-white mx-auto animate-bounce" strokeWidth={2} />
                                </div>
                                <h2 className="text-6xl font-black text-white mb-2 italic tracking-tight drop-shadow-lg">SELF-KILL!</h2>
                                <h3 className="text-3xl font-bold text-yellow-100 mb-6">You killed yourself!</h3>

                                <div className="bg-black/30 rounded-xl p-4 mb-6">
                                    <p className="text-xl text-white mb-2">💀 Friendly Fire Activated</p>
                                    <p className="text-lg text-yellow-200">Be careful with your arrows!</p>
                                </div>

                                <div className="flex justify-center">
                                    <button
                                        onClick={() => {
                                            setPlayerSelfKill(false);
                                            handleReplayLevel();
                                        }}
                                        className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-bold py-4 px-12 rounded-full transition-all shadow-lg flex items-center gap-2 transform hover:scale-105"
                                    >
                                        <RotateCcw className="w-6 h-6" />
                                        Retry Level
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Enemy Self-Kill Screen */}
                    {enemySelfKill && (
                        <div className="absolute inset-0 flex items-center justify-center bg-opacity-70 rounded-2xl backdrop-blur-sm z-50">
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: 50,
                                    backgroundColor: 'rgba(34, 197, 94, 0.95)',
                                    padding: isMobile ? '20px' : isTablet ? '30px' : '40px',
                                    borderRadius: '24px',
                                    border: isMobile ? '3px solid rgba(255, 200, 87, 0.8)' : '4px solid rgba(255, 200, 87, 0.8)',
                                    textAlign: 'center',
                                    boxShadow: '0 0 50px rgba(34, 197, 94, 0.6), inset 0 0 30px rgba(0,0,0,0.3)',
                                    width: isMobile ? '90%' : isTablet ? '80%' : 'auto',
                                    minWidth: isMobile ? 'auto' : isTablet ? '400px' : '450px',
                                    maxWidth: isMobile ? '95%' : isTablet ? '500px' : '600px'
                                }}
                            >
                                <div className="mb-6">
                                    <Skull className="w-20 h-20 text-white mx-auto animate-bounce" strokeWidth={2} />
                                </div>
                                <h2 className="text-6xl font-black text-white mb-2 italic tracking-tight drop-shadow-lg">ENEMY SELF-KILL!</h2>
                                <h3 className="text-3xl font-bold text-yellow-100 mb-6">Enemy killed themselves!</h3>

                                <div className="bg-black/30 rounded-xl p-4 mb-6">
                                    <p className="text-xl text-white mb-2">💀 Enemy Friendly Fire</p>
                                    <p className="text-lg text-yellow-200">Enemy made a mistake!</p>
                                </div>

                                <div className="flex justify-center">
                                    <button
                                        onClick={() => {
                                            const state = gameState.current;
                                            state.enemy.isDead = false;
                                            state.enemy.health = 3;
                                            state.enemy.arrowHits = [];
                                            state.enemy.isInvulnerable = false;
                                            state.currentEnemyPosIndex = (state.currentEnemyPosIndex + 1) % state.enemyPositions.length;
                                            const newPos = state.enemyPositions[state.currentEnemyPosIndex];
                                            // Set target position for smooth movement
                                            state.enemy.targetX = newPos.x;
                                            state.enemy.targetY = newPos.y;
                                            state.enemyArrows = [];
                                            setEnemySelfKill(false);
                                            setIsPaused(false);
                                        }}
                                        className="bg-gradient-to-r from-yellow-400 to-green-500 hover:from-yellow-500 hover:to-green-600 text-white font-bold py-4 px-12 rounded-full transition-all shadow-lg flex items-center gap-2 transform hover:scale-105"
                                    >
                                        <Play className="w-6 h-6" />
                                        Continue
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Pause Screen */}
                    {isPaused && !gameOver && !playerSelfKill && !enemySelfKill && (
                        <>
                            {/* Full-screen backdrop */}
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backdropFilter: 'blur(8px)',
                                    zIndex: 50
                                }}
                            />
                            {/* Pause Modal */}
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: 50,
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    padding: isMobile ? '24px' : isTablet ? '32px' : '40px',
                                    borderRadius: '20px',
                                    border: isMobile ? '3px solid #60A5FA' : '4px solid #60A5FA',
                                    textAlign: 'center',
                                    boxShadow: '0 0 30px rgba(96, 165, 250, 0.5)',
                                    width: isMobile ? '85%' : isTablet ? '70%' : 'auto',
                                    minWidth: isMobile ? 'auto' : isTablet ? '350px' : '400px',
                                    maxWidth: isMobile ? '90%' : isTablet ? '450px' : '500px'
                                }}
                            >
                                <h2 className={`font-bold mb-6 ${isMobile ? 'text-3xl' : isTablet ? 'text-4xl' : 'text-5xl'}`}>Paused</h2>
                                <button
                                    onClick={() => setIsPaused(false)}
                                    style={{
                                        background: 'linear-gradient(to right, #10B981, #059669)',
                                        padding: '16px 40px',
                                        borderRadius: '9999px',
                                        fontWeight: 'bold',
                                        border: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        cursor: 'pointer',
                                        margin: '0 auto',
                                    }}
                                    onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                                    onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                                >
                                    <Play className="w-6 h-6" />
                                    Resume
                                </button>
                            </div>
                        </>
                    )}
                </div>


                {/* Power-ups Shop Below Canvas */}
                {/* <div className="w-full max-w-[1000px] flex gap-4 mt-4" >
                    <button
                        onClick={() => buyPowerUp('doublePoints', 50)}
                        disabled={coins < 50 || powerUps.doublePoints}
                        className={`flex items-center gap-3 px-6 py-4 rounded-full font-bold transition-all shadow-lg ${powerUps.doublePoints
                            ? 'bg-gradient-to-br from-green-600 to-green-700 border-2 border-green-400 animate-pulse'
                            : coins >= 50
                                ? 'bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 border-2 border-purple-400 cursor-pointer'
                                : 'bg-gradient-to-br from-gray-600 to-gray-700 opacity-50 cursor-not-allowed border-2 border-gray-500'
                            }`}
                        style={{
                            margin: "10px"
                        }}
                    >
                        <Star className="w-7 h-7 text-yellow-300" />
                        <div className="text-white text-left">
                            <div className="text-base font-bold">2x Points Power-Up</div>
                            <div className="text-sm opacity-90">💰 50 coins • 30 seconds</div>
                        </div>
                    </button>
                    <button
                        onClick={() => buyPowerUp('shield', 75)}
                        disabled={coins < 75 || powerUps.shield}
                        className={`flex items-center gap-3 px-6 py-4 rounded-full font-bold transition-all shadow-lg ${powerUps.shield
                            ? 'bg-gradient-to-br from-green-600 to-green-700 border-2 border-green-400 animate-pulse'
                            : coins >= 75
                                ? 'bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 border-2 border-blue-400 cursor-pointer'
                                : 'bg-gradient-to-br from-gray-600 to-gray-700 opacity-50 cursor-not-allowed border-2 border-gray-500'
                            }`}
                        style={{
                            margin: "10px",
                            padding: "10px"
                        }}
                    >
                        <Shield className="w-7 h-7 text-cyan-300" />
                        <div className="text-white text-left">
                            <div className="text-base font-bold">Shield Protection</div>
                            <div className="text-sm opacity-90">💰 75 coins • 30 seconds</div>
                        </div>
                    </button>

                </div> */}

                {/* On-Screen Mobile Controls - Hidden */}
                {/*
                <div className="flex flex-col gap-4 mt-4 md:hidden">
                    <div className="flex justify-center gap-8">
                        <button
                            className="bg-white/20 p-4 rounded-full backdrop-blur-md active:bg-white/40 transition w-16 h-16 flex items-center justify-center text-2xl"
                            onTouchStart={() => { gameState.current.keys.left = true; }}
                            onTouchEnd={() => { gameState.current.keys.left = false; }}
                            onMouseDown={() => { gameState.current.keys.left = true; }}
                            onMouseUp={() => { gameState.current.keys.left = false; }}
                        >
                            ⬅️
                        </button>
                        <button
                            className="bg-white/20 p-4 rounded-full backdrop-blur-md active:bg-white/40 transition w-16 h-16 flex items-center justify-center text-2xl"
                            onTouchStart={() => { gameState.current.keys.right = true; }}
                            onTouchEnd={() => { gameState.current.keys.right = false; }}
                            onMouseDown={() => { gameState.current.keys.right = true; }}
                            onMouseUp={() => { gameState.current.keys.right = false; }}
                        >
                            ➡️
                        </button>
                    </div>
                    <div className="flex justify-center gap-8">
                        <button
                            className="bg-white/20 p-4 rounded-full backdrop-blur-md active:bg-white/40 transition w-16 h-16 flex items-center justify-center text-2xl"
                            onTouchStart={() => { gameState.current.keys.up = true; }}
                            onTouchEnd={() => { gameState.current.keys.up = false; }}
                            onMouseDown={() => { gameState.current.keys.up = true; }}
                            onMouseUp={() => { gameState.current.keys.up = false; }}
                        >
                            ⬆️
                        </button>
                        <button
                            className="bg-white/20 p-4 rounded-full backdrop-blur-md active:bg-white/40 transition w-16 h-16 flex items-center justify-center text-2xl"
                            onTouchStart={() => { gameState.current.keys.down = true; }}
                            onTouchEnd={() => { gameState.current.keys.down = false; }}
                            onMouseDown={() => { gameState.current.keys.down = true; }}
                            onMouseUp={() => { gameState.current.keys.down = false; }}
                        >
                            ⬇️
                        </button>
                    </div>
                </div>
                */}

                {/* Instructions - Hidden */}
                {/*
                <div className="mt-8 bg-gradient-to-r from-purple-800 to-indigo-800 p-6 rounded-2xl shadow-2xl max-w-4xl" >
                    <h3 className="text-2xl font-bold text-yellow-400 mb-4 flex items-center justify-center gap-2">
                        <Trophy className="w-7 h-7" />
                        How to Play
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-black bg-opacity-30 rounded-xl p-4 space-y-2">
                            <h3 className="font-bold text-white text-lg mb-2 pb-1">🎮 Controls</h3>
                            <p className="text-white items-center gap-2">
                                <span className="text-lg">⌨️</span>
                                <span>Arrow Keys to Move Up/Down/Left/Right</span>
                            </p>
                            <p className="text-white items-center gap-2">
                                <span className="text-lg">🎯</span>
                                <span>Aim with mouse/touch, drag to charge</span>
                            </p>
                            <p className="text-white items-center gap-2">
                                <span className="text-lg">🏹</span>
                                <span>Release mouse to shoot arrow</span>
                            </p>
                            <p className="text-white items-center gap-2">
                                <span className="text-lg">💀</span>
                                <span>Headshot = Instant Kill!</span>
                            </p>
                            <p className="text-white items-center gap-2">
                                <span className="text-lg">❤️</span>
                                <span>3 health points for each player</span>
                            </p>
                        </div>
                        <div className="bg-black bg-opacity-30 rounded-xl p-4 space-y-2">
                            <h3 className="font-bold text-white text-lg mb-2 pb-1">💎 Rewards</h3>
                            <p className="text-white items-center gap-2">
                                <span className="text-lg">🎯</span>
                                <span>Headshot kill: +5 points, +20 coins</span>
                            </p>
                            <p className="text-white items-center gap-2">
                                <span className="text-lg">💰</span>
                                <span>Body hit: +2 points, +5 coins</span>
                            </p>
                            <p className="text-white items-center gap-2">
                                <span className="text-lg">⚡</span>
                                <span>Build kill streaks for bonuses!</span>
                            </p>
                            <p className="text-white items-center gap-2">
                                <span className="text-lg">🛡️</span>
                                <span>Use coins to buy power-ups</span>
                            </p>
                        </div>
                    </div>
                </div>
                */}
            </div>
        </>
    );
};

export default StickmanArcherGame;