import React, { useState, useEffect, useRef } from 'react';

const StickmanArcherGame = () => {
    const canvasRef = useRef(null);
    const [score, setScore] = useState(0);
    const [coins, setCoins] = useState(31);
    const [isPaused, setIsPaused] = useState(false);
    const [gameOver, setGameOver] = useState(false);

    // const gameState = useRef({
    //     player: { x: 100, y: 400, width: 40, height: 60, isDead: false, deathFrame: 0, hasArrow: false, arrowHitPoint: null },
    //     enemy: { x: 800, y: 400, width: 40, height: 60, isDead: false, deathFrame: 0, hasArrow: false, arrowHitPoint: null },
    //     arrows: [],
    //     enemyArrows: [],
    //     isCharging: false,
    //     chargeTime: 0,
    //     angle: -45,
    //     enemyShootTimer: 0,
    //     animationFrame: 0,
    //     playerPositions: [
    //         { x: 120, y: 350 },
    //         { x: 150, y: 500 },
    //         { x: 200, y: 400 },
    //         { x: 100, y: 450 },
    //         { x: 180, y: 300 }
    //     ],
    //     enemyPositions: [
    //         { x: 800, y: 400 },
    //         { x: 750, y: 350 },
    //         { x: 850, y: 450 },
    //         { x: 780, y: 500 },
    //         { x: 820, y: 300 }
    //     ],
    //     currentPlayerPosIndex: 0,
    //     currentEnemyPosIndex: 0
    // });

    const gameState = useRef({
        player: { x: 100, y: 400, width: 40, height: 60, isDead: false, deathFrame: 0, health: 2, arrowHits: [] },
        enemy: { x: 800, y: 400, width: 40, height: 60, isDead: false, deathFrame: 0, health: 2, arrowHits: [] },
        arrows: [],
        enemyArrows: [],
        isCharging: false,
        chargeTime: 0,
        angle: -45,
        enemyShootTimer: 0,
        animationFrame: 0,
        playerPositions: [
            { x: 120, y: 350 },
            { x: 150, y: 500 },
            { x: 200, y: 400 },
            { x: 100, y: 450 },
            { x: 180, y: 300 }
        ],
        enemyPositions: [
            { x: 800, y: 400 },
            { x: 750, y: 350 },
            { x: 850, y: 450 },
            { x: 780, y: 500 },
            { x: 820, y: 300 }
        ],
        currentPlayerPosIndex: 0,
        currentEnemyPosIndex: 0
    });

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationId;

        const drawStickman = (x, y, isDead, isEnemy = false, deathFrame = 0, hasArrow = false, arrowHitPoint = null) => {
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;

            if (isDead) {
                // Death animation with multiple frames
                const progress = Math.min(deathFrame / 30, 1); // 30 frames animation

                // Falling rotation
                const rotation = progress * Math.PI / 2; // 90 degrees fall

                ctx.save();
                ctx.translate(x, y - 30);
                ctx.rotate(rotation);

                // Head
                ctx.beginPath();
                ctx.arc(0, -20, 10, 0, Math.PI * 2);
                ctx.stroke();

                // Body falling
                ctx.beginPath();
                ctx.moveTo(0, -10);
                ctx.lineTo(0, 20);
                ctx.stroke();

                // Arms spread out
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(-15 - progress * 5, 5);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(15 + progress * 5, 5);
                ctx.stroke();

                // Legs spread
                ctx.beginPath();
                ctx.moveTo(0, 20);
                ctx.lineTo(-10 - progress * 5, 30 + progress * 5);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, 20);
                ctx.lineTo(10 + progress * 5, 30 + progress * 5);
                ctx.stroke();

                // Draw arrow stuck in body at hit point
                if (hasArrow && arrowHitPoint) {
                    ctx.save();

                    // Determine arrow position based on hit point
                    let arrowX = 0, arrowY = 0, arrowAngle = 0;

                    if (arrowHitPoint === 'head') {
                        arrowX = 5;
                        arrowY = -20;
                        arrowAngle = 0.3;
                    } else if (arrowHitPoint === 'chest') {
                        arrowX = 5;
                        arrowY = 0;
                        arrowAngle = 0.2;
                    } else if (arrowHitPoint === 'stomach') {
                        arrowX = 5;
                        arrowY = 10;
                        arrowAngle = 0.1;
                    } else { // leg
                        arrowX = 8;
                        arrowY = 20;
                        arrowAngle = 0.4;
                    }

                    ctx.translate(arrowX, arrowY);
                    ctx.rotate(arrowAngle);

                    // Arrow shaft
                    ctx.strokeStyle = '#654321';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(25, 0);
                    ctx.stroke();

                    // Arrow head
                    ctx.fillStyle = '#C0C0C0';
                    ctx.strokeStyle = '#888';
                    ctx.beginPath();
                    ctx.moveTo(25, 0);
                    ctx.lineTo(20, -2);
                    ctx.lineTo(20, 2);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    // Fletching
                    ctx.fillStyle = '#FF6B6B';
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(-3, -2);
                    ctx.lineTo(-1, 0);
                    ctx.lineTo(-3, 2);
                    ctx.closePath();
                    ctx.fill();

                    ctx.restore();
                }

                ctx.restore();

                // Platform
                ctx.fillStyle = '#000';
                ctx.fillRect(x - 20, y + 10, 40, 5);

                // Draw X eyes when fully dead
                if (progress > 0.7) {
                    ctx.save();
                    ctx.translate(x, y - 30);
                    ctx.rotate(rotation);
                    ctx.strokeStyle = '#f00';
                    ctx.lineWidth = 2;

                    // X eyes
                    ctx.beginPath();
                    ctx.moveTo(-5, -22);
                    ctx.lineTo(-1, -18);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(-1, -22);
                    ctx.lineTo(-5, -18);
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.moveTo(1, -22);
                    ctx.lineTo(5, -18);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(5, -22);
                    ctx.lineTo(1, -18);
                    ctx.stroke();

                    ctx.restore();
                }
            } else {
                // Head
                ctx.beginPath();
                ctx.arc(x, y - 50, 10, 0, Math.PI * 2);
                ctx.stroke();

                // Body
                ctx.beginPath();
                ctx.moveTo(x, y - 40);
                ctx.lineTo(x, y - 10);
                ctx.stroke();

                // Arms
                if (isEnemy) {
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
                }

                // Legs
                ctx.beginPath();
                ctx.moveTo(x, y - 10);
                ctx.lineTo(x - 10, y + 10);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x, y - 10);
                ctx.lineTo(x + 10, y + 10);
                ctx.stroke();

                // Platform
                ctx.fillStyle = '#000';
                ctx.fillRect(x - 20, y + 10, 40, 5);
            }
        };

        const drawBow = (x, y, angle, isCharging, chargeTime) => {
            ctx.save();
            ctx.translate(x, y - 30);
            ctx.rotate((angle * Math.PI) / 180);

            // Bow
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 15, -Math.PI / 2, Math.PI / 2);
            ctx.stroke();

            // Bow string
            if (isCharging) {
                const pullback = (chargeTime / 30) * 10; // Max 10 pixels pullback

                // String pulled back
                // jyare arrow ne kheche tyare line show thay che te design
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-5, -15);
                ctx.lineTo(-20 - pullback, 0);
                ctx.lineTo(-5, 15);
                ctx.stroke();

                // Arrow nocked on string
                ctx.save();
                ctx.strokeStyle = '#654321';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-20 - pullback, 0);
                ctx.lineTo(-5 - pullback, 0);
                ctx.stroke();

                // Arrow head on nocked arrow
                // Arrow head design
                ctx.fillStyle = '#C0C0C0';
                ctx.strokeStyle = '#888';
                ctx.beginPath();
                ctx.moveTo(-5 - pullback, 0);
                ctx.lineTo(-8 - pullback, -2);
                ctx.lineTo(-8 - pullback, 2);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Fletching on nocked arrow
                ctx.fillStyle = '#FF6B6B';
                ctx.beginPath();
                ctx.moveTo(-20 - pullback, 0);
                ctx.lineTo(-23 - pullback, -2);
                ctx.lineTo(-21 - pullback, 0);
                ctx.lineTo(-23 - pullback, 2);
                ctx.closePath();
                ctx.fill();

                // Charge power indicator (glowing effect)
                const glowIntensity = chargeTime / 30;
                ctx.shadowBlur = 10 * glowIntensity;
                ctx.shadowColor = `rgba(255, 255, 100, ${glowIntensity})`;
                ctx.strokeStyle = `rgba(255, 255, 100, ${glowIntensity})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(-20 - pullback, 0);
                ctx.lineTo(-25 - pullback, 0);
                ctx.stroke();
                ctx.shadowBlur = 0;

                ctx.restore();
            } else {
                // Normal bow string
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-15, -10);
                ctx.lineTo(-18, 0);
                ctx.lineTo(-15, 10);
                ctx.stroke();
            }

            ctx.restore();
        };

        const drawArrow = (arrow) => {
            ctx.save();
            ctx.translate(arrow.x, arrow.y);
            ctx.rotate(Math.atan2(arrow.vy, arrow.vx));

            // Arrow shaft
            ctx.strokeStyle = '#654321';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-20, 0);
            ctx.lineTo(15, 0);
            ctx.stroke();

            // Arrow head (pointed tip)
            ctx.fillStyle = '#C0C0C0';
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(15, 0);
            ctx.lineTo(8, -5);
            ctx.lineTo(8, 5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Fletching (feathers at back)
            ctx.fillStyle = '#FF6B6B';
            ctx.beginPath();
            ctx.moveTo(-20, 0);
            ctx.lineTo(-25, -4);
            ctx.lineTo(-22, 0);
            ctx.lineTo(-25, 4);
            ctx.closePath();
            ctx.fill();

            // Arrow trail effect
            if (arrow.trail) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-25, 0);
                ctx.lineTo(-35, 0);
                ctx.stroke();
            }

            ctx.restore();
        };

        const checkCollision = (arrow, target) => {
            const hit = arrow.x > target.x - 20 &&
                arrow.x < target.x + 20 &&
                arrow.y > target.y - 60 &&
                arrow.y < target.y + 10;

            if (hit) {
                // Determine which part was hit based on arrow Y position
                const relativeY = arrow.y - (target.y - 60);
                const bodyHeight = 70;
                const hitPercent = relativeY / bodyHeight;

                if (hitPercent < 0.2) {
                    return 'head';
                } else if (hitPercent < 0.5) {
                    return 'chest';
                } else if (hitPercent < 0.75) {
                    return 'stomach';
                } else {
                    return 'leg';
                }
            }
            return null;
        };

        const gameLoop = () => {
            if (isPaused || gameOver) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw sky
            ctx.fillStyle = '#87CEEB';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const state = gameState.current;

            // Update and draw arrows
            state.arrows = state.arrows.filter(arrow => {
                arrow.x += arrow.vx;
                arrow.y += arrow.vy;
                arrow.vy += 0.3; // gravity
                arrow.trail = true;

                const hitPoint = checkCollision(arrow, state.enemy);
                if (hitPoint && !state.enemy.isDead) {
                    state.enemy.isDead = true;
                    state.enemy.deathFrame = 0;
                    state.enemy.hasArrow = true;
                    state.enemy.arrowHitPoint = hitPoint;

                    // Bonus points for headshot
                    const bonusPoints = hitPoint === 'head' ? 2 : 1;
                    const bonusCoins = hitPoint === 'head' ? 10 : 5;

                    setScore(s => s + bonusPoints);
                    setCoins(c => c + bonusCoins);

                    // Show hit indicator
                    if (hitPoint === 'head') {
                        // Could add special headshot effect here
                    }

                    setTimeout(() => {
                        state.enemy.isDead = false;
                        state.enemy.deathFrame = 0;
                        state.enemy.hasArrow = false;
                        state.enemy.arrowHitPoint = null;
                        state.currentEnemyPosIndex = (state.currentEnemyPosIndex + 1) % state.enemyPositions.length;
                        const newPos = state.enemyPositions[state.currentEnemyPosIndex];
                        state.enemy.x = newPos.x;
                        state.enemy.y = newPos.y;
                        state.arrows = [];
                    }, 1500);
                    return false;
                }

                drawArrow(arrow);
                return arrow.x < canvas.width && arrow.y < canvas.height;
            });

            // Update and draw enemy arrows
            state.enemyArrows = state.enemyArrows.filter(arrow => {
                arrow.x += arrow.vx;
                arrow.y += arrow.vy;
                arrow.vy += 0.3;
                arrow.trail = true;

                const hitPoint = checkCollision(arrow, state.player);
                if (hitPoint && !state.player.isDead) {
                    state.player.isDead = true;
                    state.player.deathFrame = 0;
                    state.player.hasArrow = true;
                    state.player.arrowHitPoint = hitPoint;

                    setTimeout(() => {
                        state.player.isDead = false;
                        state.player.deathFrame = 0;
                        state.player.hasArrow = false;
                        state.player.arrowHitPoint = null;
                        state.currentPlayerPosIndex = (state.currentPlayerPosIndex + 1) % state.playerPositions.length;
                        const newPos = state.playerPositions[state.currentPlayerPosIndex];
                        state.player.x = newPos.x;
                        state.player.y = newPos.y;
                        state.enemyArrows = [];
                        setCoins(c => Math.max(0, c - 5));
                    }, 1500);

                    return false;
                }

                drawArrow(arrow);
                return arrow.x > 0 && arrow.y < canvas.height;
            });

            // Enemy AI
            if (!state.enemy.isDead) {
                state.enemyShootTimer++;
                if (state.enemyShootTimer > 120) {
                    const angle = 135 + (Math.random() - 0.5) * 30;
                    const power = 8 + Math.random() * 4;
                    state.enemyArrows.push({
                        x: state.enemy.x,
                        y: state.enemy.y - 30,
                        vx: Math.cos((angle * Math.PI) / 180) * power,
                        vy: Math.sin((angle * Math.PI) / 180) * power
                    });
                    state.enemyShootTimer = 0;
                }
            }

            // Draw characters
            if (!state.player.isDead) {
                drawStickman(state.player.x, state.player.y, false);
                drawBow(state.player.x, state.player.y, state.angle, state.isCharging, state.chargeTime);
            } else {
                state.player.deathFrame++;
                drawStickman(state.player.x, state.player.y, true, false, state.player.deathFrame, state.player.hasArrow, state.player.arrowHitPoint);
            }

            if (!state.enemy.isDead) {
                drawStickman(state.enemy.x, state.enemy.y, false, true);
            } else {
                state.enemy.deathFrame++;
                drawStickman(state.enemy.x, state.enemy.y, true, true, state.enemy.deathFrame, state.enemy.hasArrow, state.enemy.arrowHitPoint);
            }

            state.animationFrame++;
            animationId = requestAnimationFrame(gameLoop);
        };

        const handleMouseDown = (e) => {
            if (gameOver || isPaused) return;
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const state = gameState.current;
            const dx = mouseX - state.player.x;
            const dy = mouseY - (state.player.y - 30);
            state.angle = (Math.atan2(dy, dx) * 180) / Math.PI;

            state.isCharging = true;
            state.chargeTime = 0;
        };

        const handleMouseMove = (e) => {
            if (gameOver || isPaused) return;
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const state = gameState.current;
            const dx = mouseX - state.player.x;
            const dy = mouseY - (state.player.y - 30);
            state.angle = (Math.atan2(dy, dx) * 180) / Math.PI;

            if (state.isCharging) {
                state.chargeTime = Math.min(state.chargeTime + 1, 30);
            }
        };

        const handleMouseUp = () => {
            if (gameOver || isPaused) return;
            const state = gameState.current;
            if (state.isCharging) {
                const power = 5 + (state.chargeTime / 30) * 10;
                state.arrows.push({
                    x: state.player.x,
                    y: state.player.y - 30,
                    vx: Math.cos((state.angle * Math.PI) / 180) * power,
                    vy: Math.sin((state.angle * Math.PI) / 180) * power
                });
                state.isCharging = false;
                state.chargeTime = 0;
            }
        };

        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);

        gameLoop();

        return () => {
            cancelAnimationFrame(animationId);
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isPaused, gameOver]);

    const resetGame = () => {
        setScore(0);
        setGameOver(false);
        gameState.current = {
            player: { x: 100, y: 400, width: 40, height: 60, isDead: false, deathFrame: 0, hasArrow: false, arrowHitPoint: null },
            enemy: { x: 800, y: 400, width: 40, height: 60, isDead: false, deathFrame: 0, hasArrow: false, arrowHitPoint: null },
            arrows: [],
            enemyArrows: [],
            isCharging: false,
            chargeTime: 0,
            angle: -45,
            enemyShootTimer: 0,
            animationFrame: 0,
            playerPositions: [
                { x: 120, y: 350 },
                { x: 150, y: 500 },
                { x: 200, y: 400 },
                { x: 100, y: 450 },
                { x: 180, y: 300 }
            ],
            enemyPositions: [
                { x: 800, y: 400 },
                { x: 750, y: 350 },
                { x: 850, y: 450 },
                { x: 780, y: 500 },
                { x: 820, y: 300 }
            ],
            currentPlayerPosIndex: 0,
            currentEnemyPosIndex: 0
        };
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <div className="relative">
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-white bg-opacity-80 px-4 py-2 rounded-full shadow-lg z-10">
                    <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                        <span className="text-yellow-700 font-bold">C</span>
                    </div>
                    <span className="text-2xl font-bold text-gray-800">{coins}</span>
                </div>

                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-80 px-6 py-2 rounded-full shadow-lg z-10">
                    <span className="text-3xl font-bold text-gray-800">{score}</span>
                </div>

                <button
                    onClick={() => setIsPaused(!isPaused)}
                    className="absolute top-4 right-4 w-12 h-12 bg-white bg-opacity-80 rounded-full shadow-lg flex items-center justify-center hover:bg-opacity-100 transition-all z-10"
                >
                    {isPaused ? (
                        <div className="flex gap-1">
                            <div className="w-2 h-4 bg-gray-700"></div>
                            <div className="w-2 h-4 bg-gray-700"></div>
                        </div>
                    ) : (
                        <div className="flex gap-1">
                            <div className="w-2 h-4 bg-gray-700"></div>
                            <div className="w-2 h-4 bg-gray-700"></div>
                        </div>
                    )}
                </button>

                <canvas
                    ref={canvasRef}
                    width={1000}
                    height={600}
                    className="border-4 border-gray-300 rounded-lg shadow-2xl bg-sky-200"
                />

                {gameOver && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                        <div className="bg-white p-8 rounded-lg shadow-2xl text-center">
                            <h2 className="text-4xl font-bold text-red-600 mb-4">Game Over!</h2>
                            <p className="text-2xl text-gray-700 mb-6">Final Score: {score}</p>
                            <button
                                onClick={resetGame}
                                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-full transition-all"
                            >
                                Play Again
                            </button>
                        </div>
                    </div>
                )}

                {isPaused && !gameOver && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                        <div className="bg-white p-8 rounded-lg shadow-2xl text-center">
                            <h2 className="text-4xl font-bold text-gray-800 mb-4">Paused</h2>
                            <button
                                onClick={() => setIsPaused(false)}
                                className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full transition-all"
                            >
                                Resume
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-6 bg-white p-4 rounded-lg shadow-lg max-w-2xl">
                <h3 className="text-lg font-bold text-gray-800 mb-2">How to Play:</h3>
                <p className="text-gray-600">
                    🎯 Aim with your mouse and click & hold to charge your shot<br />
                    🏹 Release to shoot the arrow at your enemy<br />
                    ⚠️ If hit by enemy arrows, you'll respawn at a new position!<br />
                    💰 Body shots: +1 point & +5 coins | 🎯 Headshots: +2 points & +10 coins<br />
                    💀 Arrow sticks where it hits: Head (20%), Chest, Stomach, or Leg<br />
                    🎮 Keep playing to improve your score!
                </p>
            </div>
        </div>
    );
};

export default StickmanArcherGame;