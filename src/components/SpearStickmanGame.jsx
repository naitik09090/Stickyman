import React, { useState, useEffect, useRef } from 'react';
import { Pause, Play } from 'lucide-react';

const SpearStickmanGame = () => {
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(31);
  const [isPaused, setIsPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [spear, setSpear] = useState(null);
  const [enemy, setEnemy] = useState({ x: 700, y: 380 });
  const [mousePos, setMousePos] = useState({ x: 500, y: 350 });
  const [isAiming, setIsAiming] = useState(false);
  const [enemyHit, setEnemyHit] = useState(false);
  const [enemyDying, setEnemyDying] = useState(false);
  const [bloodSplatter, setBloodSplatter] = useState([]);
  const gameRef = useRef(null);
  const animationRef = useRef(null);
  const lastTimeRef = useRef(Date.now());

  const GAME_WIDTH = 1000;
  const GAME_HEIGHT = 600;
  const PLAYER_X = 150;
  const PLAYER_Y = 500;
  const GRAVITY = 0.5;

  const gameLoop = () => {
    if (isPaused || gameOver) return;

    const now = Date.now();
    const deltaTime = (now - lastTimeRef.current) / 16.67;
    lastTimeRef.current = now;

    if (spear) {
      const newVy = spear.vy + GRAVITY * deltaTime;
      const newX = spear.x + spear.vx * deltaTime;
      const newY = spear.y + spear.vy * deltaTime;
      const rotation = Math.atan2(newVy, spear.vx) * (180 / Math.PI);

      // Check collision with enemy
      if (
        newX >= enemy.x - 40 &&
        newX <= enemy.x + 40 &&
        newY >= enemy.y - 80 &&
        newY <= enemy.y + 20 &&
        !enemyHit
      ) {
        handleEnemyHit(newX, newY);
        setSpear(null);
      } else if (newX > GAME_WIDTH || newY > GAME_HEIGHT + 100 || newX < 0) {
        setSpear(null);
      } else {
        setSpear({
          x: newX,
          y: newY,
          vx: spear.vx,
          vy: newVy,
          rotation: rotation
        });
      }
    }

    animationRef.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
    lastTimeRef.current = Date.now();
    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPaused, gameOver, spear, enemy, enemyHit]);

  const handleEnemyHit = (hitX, hitY) => {
    setEnemyHit(true);
    setEnemyDying(true);

    const splatter = [];
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const speed = 4 + Math.random() * 6;
      splatter.push({
        id: Date.now() + i,
        x: hitX,
        y: hitY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 10 + 4
      });
    }
    setBloodSplatter(splatter);

    setScore(prev => prev + 1);
    setCoins(prev => prev + 5);

    setTimeout(() => {
      setEnemyHit(false);
      setEnemyDying(false);
      setBloodSplatter([]);
      respawnEnemy();
    }, 1200);
  };

  const respawnEnemy = () => {
    const newX = 550 + Math.random() * 350;
    const newY = 300 + Math.random() * 150;
    setEnemy({ x: newX, y: newY });
  };

  const handleMouseMove = (e) => {
    if (gameRef.current && !spear && !isPaused && !gameOver) {
      const rect = gameRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setMousePos({ x, y });
      setIsAiming(true);
    }
  };

  const throwSpear = (e) => {
    if (!spear && !isPaused && !gameOver && gameRef.current) {
      const rect = gameRef.current.getBoundingClientRect();
      const targetX = e.clientX - rect.left;
      const targetY = e.clientY - rect.top;

      const dx = targetX - (PLAYER_X + 40);
      const dy = targetY - (PLAYER_Y - 60);
      const distance = Math.sqrt(dx * dx + dy * dy);

      const power = 13;
      const vx = (dx / distance) * power;
      const vy = (dy / distance) * power;

      setSpear({
        x: PLAYER_X + 70,
        y: PLAYER_Y - 60,
        vx: vx,
        vy: vy,
        rotation: Math.atan2(vy, vx) * (180 / Math.PI)
      });

      setIsAiming(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      if (!spear && !isPaused && !gameOver) {
        const dx = mousePos.x - (PLAYER_X + 40);
        const dy = mousePos.y - (PLAYER_Y - 60);
        const distance = Math.sqrt(dx * dx + dy * dy);

        const power = 13;
        const vx = (dx / distance) * power;
        const vy = (dy / distance) * power;

        setSpear({
          x: PLAYER_X + 70,
          y: PLAYER_Y - 60,
          vx: vx,
          vy: vy,
          rotation: Math.atan2(vy, vx) * (180 / Math.PI)
        });

        setIsAiming(false);
      }
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [spear, isPaused, gameOver, mousePos]);

  const togglePause = (e) => {
    e.stopPropagation();
    setIsPaused(!isPaused);
    lastTimeRef.current = Date.now();
  };

  const restartGame = (e) => {
    e.stopPropagation();
    setScore(0);
    setCoins(31);
    setGameOver(false);
    setSpear(null);
    setEnemyHit(false);
    setEnemyDying(false);
    setBloodSplatter([]);
    setIsAiming(false);
    respawnEnemy();
    lastTimeRef.current = Date.now();
  };

  const aimAngle = Math.atan2(mousePos.y - (PLAYER_Y - 60), mousePos.x - (PLAYER_X + 40));

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-300 via-green-400 to-green-500 p-4">
      {/* Game Container */}
      <div
        ref={gameRef}
        className="relative rounded-3xl shadow-2xl overflow-hidden"
        style={{
          width: GAME_WIDTH + 'px',
          height: GAME_HEIGHT + 'px',
          background: 'linear-gradient(180deg, #86efac 0%, #4ade80 100%)',
          cursor: 'crosshair'
        }}
        onMouseMove={handleMouseMove}
        onClick={throwSpear}
        onMouseLeave={() => setIsAiming(false)}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-5 z-20">
          <div className="flex items-center gap-3 bg-yellow-500 rounded-full px-5 py-3 shadow-xl border-4 border-yellow-400">
            <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-2xl shadow-inner">
              🪙
            </div>
            <span className="text-3xl font-bold text-white">{coins}</span>
          </div>

          <div className="text-6xl font-black text-white" style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.4)' }}>
            {score}
          </div>

          <button
            onClick={togglePause}
            className="bg-white rounded-full p-4 shadow-xl hover:bg-gray-100 hover:scale-110 transition-all"
          >
            {isPaused ? <Play size={28} /> : <Pause size={28} />}
          </button>
        </div>

        {/* Game Area */}
        <div className="w-full h-full relative">
          {/* Ground line */}
          <div className="absolute left-0 right-0 h-1 bg-green-800 opacity-20" style={{ bottom: '80px' }}></div>

          {/* Aiming Line */}
          {isAiming && !spear && !isPaused && (
            <svg className="absolute inset-0 pointer-events-none" width={GAME_WIDTH} height={GAME_HEIGHT}>
              <defs>
                <marker id="arrowhead" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto">
                  <polygon points="0 0, 12 4, 0 8" fill="white" opacity="0.9" />
                </marker>
              </defs>
              <line
                x1={PLAYER_X + 70}
                y1={PLAYER_Y - 60}
                x2={mousePos.x}
                y2={mousePos.y}
                stroke="white"
                strokeWidth="4"
                strokeDasharray="12,6"
                opacity="0.8"
                markerEnd="url(#arrowhead)"
              />
            </svg>
          )}

          {/* Player Stickman */}
          <div
            className="absolute"
            style={{
              left: (PLAYER_X - 50) + 'px',
              top: (PLAYER_Y - 120) + 'px'
            }}
          >
            {/* Head */}
            <div className="absolute w-20 h-20 bg-black rounded-full shadow-lg" style={{ top: '0px', left: '30px' }}></div>
            {/* Body */}
            <div className="absolute w-4 h-40 bg-black rounded-sm" style={{ top: '76px', left: '48px' }}></div>
            {/* Front Arm - aiming */}
            <div
              className="absolute w-32 h-4 bg-black rounded-full origin-left"
              style={{
                top: '105px',
                left: '25px',
                transform: `rotate(${(aimAngle * 180 / Math.PI) - 10}deg)`,
                transition: 'transform 0.1s ease-out'
              }}
            ></div>
            {/* Back arm */}
            <div className="absolute w-24 h-4 bg-black rounded-full" style={{ top: '110px', left: '30px', transform: 'rotate(-25deg)', transformOrigin: 'left' }}></div>
            {/* Spear in hand */}
            {!spear && (
              <div
                className="absolute w-48 h-4 bg-gradient-to-r from-orange-600 via-orange-400 to-orange-300 rounded-full origin-left shadow-lg"
                style={{
                  top: '104px',
                  left: '57px',
                  transform: `rotate(${(aimAngle * 180 / Math.PI) - 10}deg)`,
                  transition: 'transform 0.1s ease-out'
                }}
              >
                <div className="absolute" style={{ right: '-10px', top: '-6px', width: '0', height: '0', borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderLeft: '12px solid #1f2937' }}></div>
              </div>
            )}
            {/* Legs */}
            <div className="absolute w-4 h-26 bg-black rounded-sm" style={{ top: '116px', left: '40px' }}></div>
            <div className="absolute w-4 h-26 bg-black rounded-sm" style={{ top: '116px', left: '56px' }}></div>
            {/* Platform */}
            <div className="absolute w-32 h-5 bg-black rounded-lg shadow-md" style={{ top: '142px', left: '20px' }}></div>
          </div>

          {/* Flying Spear */}
          {spear && (
            <div
              className="absolute"
              style={{
                left: spear.x + 'px',
                top: spear.y + 'px',
                transform: `rotate(${spear.rotation}deg)`,
                transformOrigin: 'left center'
              }}
            >
              <div className="w-48 h-4 bg-gradient-to-r from-orange-600 via-orange-400 to-orange-300 rounded-full shadow-xl relative">
                <div className="absolute" style={{ right: '-12px', top: '-6px', width: '0', height: '0', borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderLeft: '14px solid #1f2937' }}></div>
                <div className="absolute left-1 w-8 h-6 bg-red-600 opacity-60" style={{ top: '-1px', clipPath: 'polygon(0 50%, 100% 0, 100% 100%)' }}></div>
              </div>
            </div>
          )}

          {/* Blood Splatter */}
          {bloodSplatter.map((drop) => (
            <div
              key={drop.id}
              className="absolute rounded-full bg-red-600 shadow-lg"
              style={{
                left: (drop.x + drop.vx * 12) + 'px',
                top: (drop.y + drop.vy * 12) + 'px',
                width: drop.size + 'px',
                height: drop.size + 'px',
                opacity: 0.85
              }}
            />
          ))}

          {/* Enemy Stickman */}
          <div
            className="absolute"
            style={{
              left: (enemy.x - 50) + 'px',
              top: (enemy.y - 120) + 'px',
              transform: enemyDying ? 'rotate(90deg) scale(0.6)' : 'rotate(0deg) scale(1)',
              opacity: enemyDying ? 0 : 1,
              transition: 'all 0.8s ease-out',
              transformOrigin: 'center center'
            }}
          >
            {/* Apple on head */}
            <div
              className="absolute w-16 h-16 bg-red-500 rounded-full shadow-lg"
              style={{
                top: '-22px',
                left: '32px',
                transform: enemyHit ? 'scale(0) rotate(180deg)' : 'scale(1)',
                transition: 'transform 0.4s ease-out'
              }}
            >
              <div className="absolute w-5 h-6 bg-green-700 rounded-t-full shadow" style={{ top: '-5px', left: '24px', transform: 'rotate(-15deg)' }}></div>
              <div className="absolute inset-0 rounded-full bg-white opacity-40" style={{ width: '12px', height: '12px', top: '5px', left: '5px' }}></div>
            </div>
            {/* Head */}
            <div className="absolute w-20 h-20 bg-black rounded-full shadow-lg" style={{ top: '0px', left: '30px' }}></div>
            {/* Body */}
            <div className="absolute w-4 h-40 bg-black rounded-sm" style={{ top: '76px', left: '48px' }}></div>
            {/* Arms raised */}
            <div className="absolute w-24 h-4 bg-black rounded-full" style={{ top: '90px', left: '35px', transform: 'rotate(-50deg)', transformOrigin: 'left' }}></div>
            <div className="absolute w-24 h-4 bg-black rounded-full" style={{ top: '90px', left: '38px', transform: 'rotate(50deg)', transformOrigin: 'left' }}></div>
            {/* Legs */}
            <div className="absolute w-4 h-26 bg-black rounded-sm" style={{ top: '116px', left: '40px' }}></div>
            <div className="absolute w-4 h-26 bg-black rounded-sm" style={{ top: '116px', left: '56px' }}></div>
            {/* Platform */}
            <div className="absolute w-32 h-5 bg-black rounded-lg shadow-md" style={{ top: '142px', left: '20px' }}></div>
          </div>

          {/* Hit Effects */}
          {enemyHit && (
            <div>
              <div
                className="absolute text-7xl"
                style={{ left: (enemy.x - 35) + 'px', top: (enemy.y - 150) + 'px', zIndex: 50 }}
              >
                💥
              </div>
              <div
                className="absolute text-5xl font-black text-yellow-300"
                style={{
                  left: (enemy.x - 25) + 'px',
                  top: (enemy.y - 180) + 'px',
                  zIndex: 51,
                  textShadow: '3px 3px 8px rgba(0,0,0,0.8)'
                }}
              >
                +5
              </div>
              <div
                className="absolute rounded-full border-8 border-yellow-300"
                style={{
                  left: (enemy.x - 60) + 'px',
                  top: (enemy.y - 60) + 'px',
                  width: '120px',
                  height: '120px',
                  opacity: 0.7,
                  animation: 'ping 0.6s ease-out'
                }}
              />
            </div>
          )}
        </div>

        {/* Pause Overlay */}
        {isPaused && (
          <div className="absolute inset-0 flex items-center justify-center z-30" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
            <div className="bg-white rounded-3xl p-12 text-center shadow-2xl">
              <h2 className="text-5xl font-black mb-8 text-gray-800">PAUSED</h2>
              <button
                onClick={togglePause}
                className="bg-green-500 text-white px-10 py-5 rounded-2xl font-bold text-2xl hover:bg-green-600 shadow-lg hover:scale-105 transition-all"
              >
                Resume Game
              </button>
            </div>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center z-30" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
            <div className="bg-white rounded-3xl p-12 text-center shadow-2xl">
              <h2 className="text-5xl font-black mb-6 text-red-600">GAME OVER</h2>
              <p className="text-3xl mb-10 text-gray-700">Final Score: <span className="font-bold text-green-600">{score}</span></p>
              <button
                onClick={restartGame}
                className="bg-green-500 text-white px-10 py-5 rounded-2xl font-bold text-2xl hover:bg-green-600 shadow-lg hover:scale-105 transition-all"
              >
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-8 bg-white rounded-3xl p-8 shadow-2xl max-w-4xl border-4 border-green-400">
        <h3 className="text-3xl font-black mb-5 text-gray-800 text-center">🎯 How to Play</h3>
        <div className="text-gray-700 space-y-3 text-lg">
          <p>🖱️ <strong>Move your mouse</strong> to aim the spear - see the white line!</p>
          <p>🎯 <strong>Click</strong> or press <kbd className="px-4 py-2 bg-green-500 text-white rounded-lg font-bold text-base">SPACE</kbd> to throw</p>
          <p>🍎 Hit the apple on the enemy's head to score points</p>
          <p>🪙 Earn 5 coins for each successful hit</p>
          <p>⚡ Watch the spear follow realistic gravity physics!</p>
        </div>
      </div>

      {/* Game Info */}
      <div className="mt-6 text-center">
        <p className="text-white text-xl font-bold drop-shadow-lg">The Spear Stickman</p>
        <p className="text-green-100 text-base font-semibold">by OKY Games Recreation</p>
      </div>
    </div>
  );
};

export default SpearStickmanGame;