/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Building, GameState, Point, CANVAS_WIDTH, CANVAS_HEIGHT, MONKEY_SIZE, GRAVITY, Treasure, ProjectileType, Destruction, ParticleType, Particle, Meteor } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Wind, RotateCcw, Play, Maximize, Minimize, Volume2, VolumeX, Medal, User, Send } from 'lucide-react';
import { soundService } from './services/soundService';
import { getTopScores, saveHighScore, LeaderboardEntry } from './firebase';

const COLORS = ['#AAAAAA', '#00AAAA', '#AA0000'];

const getGroundY = (x: number, buildings: Building[], destructions: Destruction[]) => {
  const building = buildings.find(b => x >= b.x && x <= b.x + b.width);
  if (!building) return CANVAS_HEIGHT - 8.75;

  // Start checking from the top of the building downwards
  for (let y = building.y; y < CANVAS_HEIGHT; y += 2) {
    const inHole = destructions.some(d => 
      Math.sqrt((x - d.pos.x) ** 2 + (y - d.pos.y) ** 2) < d.radius
    );
    if (!inHole) {
      return y - 8.75; // Monkey bottom is at y+8.75, so pos.y is y-8.75
    }
  }
  return CANVAS_HEIGHT - 8.75;
};

const BananaIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 4C18 4 16 3 14 3C12 3 10 4 8 6C6 8 4 11 4 14C4 17 6 20 9 21C12 22 15 21 17 19C19 17 21 14 21 11C21 9 20 7 18 4Z" fill="#FFFF55" />
    <path d="M18 4C18 4 19 5 19 6C19 7 18 8 17 9" stroke="#8B4513" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const BeatingGorilla = ({ color }: { color: string }) => {
  const [beat, setBeat] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => setBeat(b => !b), 150);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-16 h-16 scale-150">
      {/* Head */}
      <div style={{ backgroundColor: color }} className="absolute left-1/2 -translate-x-1/2 top-0 w-6 h-5" />
      {/* Eyes */}
      <div className="absolute left-1/2 -translate-x-1/2 top-2 w-4 h-1 bg-black" />
      {/* Body */}
      <div style={{ backgroundColor: color }} className="absolute left-1/2 -translate-x-1/2 top-5 w-10 h-4" />
      <div style={{ backgroundColor: color }} className="absolute left-1/2 -translate-x-1/2 top-9 w-8 h-8" />
      {/* Arms */}
      {beat ? (
        <>
          <div style={{ backgroundColor: color }} className="absolute left-0 top-2 w-3 h-6" />
          <div style={{ backgroundColor: color }} className="absolute right-0 top-2 w-3 h-6" />
        </>
      ) : (
        <>
          <div style={{ backgroundColor: color }} className="absolute left-1 top-6 w-4 h-3" />
          <div style={{ backgroundColor: color }} className="absolute right-1 top-6 w-4 h-3" />
        </>
      )}
      {/* Legs */}
      <div style={{ backgroundColor: color }} className="absolute left-2 bottom-0 w-3 h-6" />
      <div style={{ backgroundColor: color }} className="absolute right-2 bottom-0 w-3 h-6" />
    </div>
  );
};

const OrbitingBanana = ({ delay = 0, rx = 300, ry = 100, speed = 5 }: { delay?: number, rx?: number, ry?: number, speed?: number }) => {
  return (
    <motion.div
      className="absolute pointer-events-none w-10 h-10"
      animate={{
        x: [
          Math.cos(0) * rx,
          Math.cos(Math.PI / 2) * rx,
          Math.cos(Math.PI) * rx,
          Math.cos(3 * Math.PI / 2) * rx,
          Math.cos(2 * Math.PI) * rx,
        ],
        y: [
          Math.sin(0) * ry,
          Math.sin(Math.PI / 2) * ry,
          Math.sin(Math.PI) * ry,
          Math.sin(3 * Math.PI / 2) * ry,
          Math.sin(2 * Math.PI) * ry,
        ],
      }}
      transition={{
        duration: speed,
        repeat: Infinity,
        ease: "linear",
        delay: -delay
      }}
      style={{
        left: '50%',
        top: '50%',
        marginLeft: -20,
        marginTop: -20,
      }}
    >
      <motion.div 
        className="w-full h-full flex items-center justify-center"
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19.5 3.5C18.5 2.5 16 2.5 14 4.5C12 6.5 11 9.5 11 12.5C11 15.5 12 18.5 14 20.5C16 22.5 18.5 22.5 19.5 21.5C20.5 20.5 20.5 18 18.5 16C16.5 14 13.5 13 10.5 13C7.5 13 4.5 14 2.5 16C0.5 18 0.5 20.5 1.5 21.5" stroke="#FACC15" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </motion.div>
    </motion.div>
  );
};

const BananaOrbit = () => {
  // rx: horizontal radius, ry: vertical radius
  // For 5 characters at 9xl, width is ~600-700px, height is ~150px
  const rx = 340;
  const ry = 100;
  const speed = 6;
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      <OrbitingBanana delay={0} rx={rx} ry={ry} speed={speed} />
      <OrbitingBanana delay={speed * 0.25} rx={rx} ry={ry} speed={speed} />
      <OrbitingBanana delay={speed * 0.5} rx={rx} ry={ry} speed={speed} />
      <OrbitingBanana delay={speed * 0.75} rx={rx} ry={ry} speed={speed} />
    </div>
  );
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showStartScreen, setShowStartScreen] = useState(true);
  const [gravityInput, setGravityInput] = useState('9.8');
  const [p1NameInput, setP1NameInput] = useState('玩家一');
  const [p2NameInput, setP2NameInput] = useState('玩家二');
  const [message, setMessage] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);
  const [isMuted, setIsMuted] = useState(soundService.isMuted());
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  
  const DEFAULT_LEADERBOARD: LeaderboardEntry[] = Array(5).fill(null).map((_, i) => ({
    id: `default-${i}`,
    name: '301-27號',
    score: 100,
    timestamp: new Date()
  }));

  const [showScoreEntry, setShowScoreEntry] = useState(false);
  const [pendingScore, setPendingScore] = useState<{ name: string, score: number } | null>(null);
  const [gradeInput, setGradeInput] = useState('');
  const [classInput, setClassInput] = useState('');
  const [numberInput, setNumberInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const lastWindowToggle = useRef<number>(0);
  const nextGameStarter = useRef<1 | 2>(1);
  const hasCheckedHighScore = useRef(false);

  const calculateScore = (hitPos: Point, shooterPos: Point, targetPos: Point) => {
    const distBetween = Math.sqrt((shooterPos.x - targetPos.x) ** 2 + (shooterPos.y - targetPos.y) ** 2);
    if (distBetween < 1) return 0;
    const distToTarget = Math.sqrt((hitPos.x - targetPos.x) ** 2 + (hitPos.y - targetPos.y) ** 2);
    const distToSelf = Math.sqrt((hitPos.x - shooterPos.x) ** 2 + (hitPos.y - shooterPos.y) ** 2);
    if (distToSelf < 30) return 0;
    return Math.max(0, Math.floor(100 * (1 - distToTarget / distBetween)));
  };

  const handleTurnTransition = (prev: GameState, next: GameState): GameState => {
    const nextPlayer = prev.currentPlayer === 1 ? 2 : 1;
    
    const p1GroundY = getGroundY(next.player1Pos.x, next.buildings, next.destructions);
    const p2GroundY = getGroundY(next.player2Pos.x, next.buildings, next.destructions);
    
    const p1IsOnGround = p1GroundY >= CANVAS_HEIGHT - 10;
    const p2IsOnGround = p2GroundY >= CANVAS_HEIGHT - 10;
    
    let p1Turns = next.p1GroundTurns;
    let p2Turns = next.p2GroundTurns;
    
    // Update turns based on current ground status
    if (p1IsOnGround) {
      if (nextPlayer === 1) p1Turns++;
    } else {
      p1Turns = 0;
    }

    if (p2IsOnGround) {
      if (nextPlayer === 2) p2Turns++;
    } else {
      p2Turns = 0;
    }
    
    if (p1Turns >= 5) {
      const explosionPos = next.player1Pos;
      const newScores: [number, number] = [next.scores[0], next.scores[1]];
      newScores[1]++;
      soundService.playExplosion();
      return {
        ...next,
        status: 'exploding',
        winner: 2,
        scores: newScores,
        explosion: {
          pos: explosionPos,
          radius: 0,
          maxRadius: 300,
          type: 'giant'
        },
        shake: 50,
        p1GroundTurns: 0,
        p2GroundTurns: 0,
        banana: undefined
      };
    }
    
    if (p2Turns >= 5) {
      const explosionPos = next.player2Pos;
      const newScores: [number, number] = [next.scores[0], next.scores[1]];
      newScores[0]++;
      soundService.playExplosion();
      return {
        ...next,
        status: 'exploding',
        winner: 1,
        scores: newScores,
        explosion: {
          pos: explosionPos,
          radius: 0,
          maxRadius: 300,
          type: 'giant'
        },
        shake: 50,
        p1GroundTurns: 0,
        p2GroundTurns: 0,
        banana: undefined
      };
    }

    // Spawn new treasure for next round
    const newTreasures: Treasure[] = [];
    let treasureType: 'giant' | 'acid' | 'beam' | 'meteor';
    const rand = Math.random();
    if (next.roundCount >= 9) {
      if (rand < 0.07) treasureType = 'meteor';
      else if (rand < 0.38) treasureType = 'giant';
      else if (rand < 0.69) treasureType = 'acid';
      else treasureType = 'beam';
    } else {
      if (rand < 0.07) treasureType = 'meteor';
      else if (rand < 0.535) treasureType = 'giant';
      else treasureType = 'acid';
    }
    newTreasures.push({
      id: Date.now(),
      pos: {
        x: 100 + Math.random() * (CANVAS_WIDTH - 200),
        y: 50 + Math.random() * 250
      },
      type: treasureType,
      active: true
    });

    return {
      ...next,
      status: 'aiming',
      currentPlayer: nextPlayer,
      p1GroundTurns: p1Turns,
      p2GroundTurns: p2Turns,
      p1Struggling: p1Turns >= 4,
      p2Struggling: p2Turns >= 4,
      turnTimeLeft: 10,
      treasures: newTreasures,
      banana: undefined,
      explosion: undefined
    };
  };

  useEffect(() => {
    if (!gameState || gameState.status !== 'aiming') return;

    const timer = setInterval(() => {
      setGameState(prev => {
        if (!prev || prev.status !== 'aiming') return prev;
        
        const newTime = prev.turnTimeLeft - 1;
        
        if (newTime <= 0) {
          // Player dies
          const currentPlayer = prev.currentPlayer;
          const explosionPos = currentPlayer === 1 ? prev.player1Pos : prev.player2Pos;
          const newScores: [number, number] = [prev.scores[0], prev.scores[1]];
          newScores[currentPlayer === 1 ? 1 : 0]++; // Opponent wins
          
          soundService.playExplosion();
          
          return {
            ...prev,
            status: 'exploding',
            winner: currentPlayer === 1 ? 2 : 1,
            scores: newScores,
            explosion: {
              pos: explosionPos,
              radius: 0,
              maxRadius: 300,
              type: 'giant'
            },
            shake: 50,
            turnTimeLeft: 0,
            banana: undefined
          };
        }
        
        return {
          ...prev,
          turnTimeLeft: newTime
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState?.status, gameState?.currentPlayer]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (!isFull) {
        setIsPseudoFullscreen(false);
      }
    };

    const handleResize = () => {
      // Update vh variable for mobile
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    // Initial call
    handleResize();

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = getTopScores((scores) => {
      setLeaderboard(scores);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (gameState?.status === 'tournamentOver' && !hasCheckedHighScore.current) {
      const winnerIdx = gameState.tournamentWinner === 1 ? 0 : 1;
      const winnerScore = gameState.roundHistory[winnerIdx === 0 ? 'p1' : 'p2'].reduce((a, b) => a + b, 0);
      const winnerName = gameState.playerNames[winnerIdx];
      checkHighScore(winnerIdx, winnerScore, winnerName);
      hasCheckedHighScore.current = true;
    } else if (gameState?.status !== 'tournamentOver') {
      hasCheckedHighScore.current = false;
    }
  }, [gameState?.status, gameState?.tournamentWinner, gameState?.roundHistory, gameState?.playerNames]);

  useEffect(() => {
    // Stop BGM on unmount
    return () => {
      soundService.stopBGM();
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && !isPseudoFullscreen) {
      gameContainerRef.current?.requestFullscreen().catch(err => {
        console.warn(`Real fullscreen failed, using pseudo-fullscreen: ${err.message}`);
        setIsPseudoFullscreen(true);
        setIsFullscreen(true);
      });
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
      setIsPseudoFullscreen(false);
      setIsFullscreen(false);
    }
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    soundService.setMuted(newMuted);
  };

  // Initialize Game
  const initGame = (customGravity?: number, resetScores: boolean = false) => {
    const buildings: Building[] = [];
    let currentX = 0;
    while (currentX < CANVAS_WIDTH) {
      const width = 60 + Math.random() * 60;
      const height = 100 + Math.random() * 300;
      
      const rows = Math.floor(height / 15);
      const cols = Math.floor(width / 10);
      const windows: boolean[][] = [];
      for (let r = 0; r < rows; r++) {
        windows[r] = [];
        for (let c = 0; c < cols; c++) {
          windows[r][c] = Math.random() > 0.3;
        }
      }

      buildings.push({
        x: currentX,
        y: CANVAS_HEIGHT - height,
        width: Math.min(width, CANVAS_WIDTH - currentX),
        height,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        windows,
      });
      currentX += width;
    }

    // Place monkeys (1-2 buildings away from boundaries)
    const p1BuildingIdx = 1 + Math.floor(Math.random() * 2);
    const p2BuildingIdx = buildings.length - 2 - Math.floor(Math.random() * 2);

    const p1B = buildings[p1BuildingIdx];
    const p2B = buildings[p2BuildingIdx];

    // Ensure there's at least one building between them that is taller than both players
    const minMiddleIdx = p1BuildingIdx + 1;
    const maxMiddleIdx = p2BuildingIdx - 1;
    
    if (minMiddleIdx <= maxMiddleIdx) {
      const maxHeight = Math.max(p1B.height, p2B.height) + 40; // Add some buffer for monkey height
      const middleIndices = [];
      for (let i = minMiddleIdx; i <= maxMiddleIdx; i++) middleIndices.push(i);
      
      const hasTallBuilding = middleIndices.some(idx => buildings[idx].height > maxHeight);
      
      if (!hasTallBuilding) {
        // Pick a random building in the middle and make it tall
        const targetIdx = middleIndices[Math.floor(Math.random() * middleIndices.length)];
        const newHeight = maxHeight + 20 + Math.random() * 100;
        const b = buildings[targetIdx];
        
        // Update building properties
        const rows = Math.floor(newHeight / 15);
        const cols = Math.floor(b.width / 10);
        const windows: boolean[][] = [];
        for (let r = 0; r < rows; r++) {
          windows[r] = [];
          for (let c = 0; c < cols; c++) {
            windows[r][c] = Math.random() > 0.3;
          }
        }
        
        buildings[targetIdx] = {
          ...b,
          height: newHeight,
          y: CANVAS_HEIGHT - newHeight,
          windows
        };
      }
    }

    // Position so feet are on top (feet bottom is pos.y + 8.75)
    const p1Pos = { x: p1B.x + p1B.width / 2, y: p1B.y - 8.75 };
    const p2Pos = { x: p2B.x + p2B.width / 2, y: p2B.y - 8.75 };

    const starter = nextGameStarter.current;
    nextGameStarter.current = starter === 1 ? 2 : 1;

    // Spawn random treasure
    const treasures: Treasure[] = [];
    const rand = Math.random();
    let treasureType: 'giant' | 'acid' | 'beam' | 'meteor';
    if (rand < 0.07) treasureType = 'meteor';
    else if (rand < 0.535) treasureType = 'giant';
    else treasureType = 'acid';
    treasures.push({
      id: Date.now(),
      pos: {
        x: 100 + Math.random() * (CANVAS_WIDTH - 200),
        y: 50 + Math.random() * 250
      },
      type: treasureType,
      active: true
    });

    setGameState(prev => {
      const g = typeof customGravity === 'number' ? customGravity : (prev?.gravity || 0.25);
      // If resetScores is true, it's a full game restart (or sun explosion)
      const shouldResetSun = resetScores || (prev?.sunHits || 0) >= 5;
      
      return {
        player1Pos: p1Pos,
        player2Pos: p2Pos,
        sunPos: { x: CANVAS_WIDTH / 2 + (Math.random() * 100 - 50), y: 50 + Math.random() * 50 },
        sunState: shouldResetSun ? 'normal' : (prev?.sunState || 'normal'),
        sunHits: shouldResetSun ? 0 : (prev?.sunHits || 0),
        buildings,
        destructions: [],
        particles: [],
        shake: 0,
        currentPlayer: starter,
        wind: (Math.random() * 2 - 1) * 0.1,
        scores: resetScores ? [0, 0] : (prev?.scores || [0, 0]),
        playerNames: [p1NameInput || '玩家一', p2NameInput || '玩家二'],
        gravity: g,
        status: 'aiming',
        winner: undefined,
        roundCount: 0,
        dragStart: null,
        dragCurrent: null,
        treasures,
        player1Projectile: prev?.player1Projectile || 'normal',
        player2Projectile: prev?.player2Projectile || 'normal',
        roundHistory: resetScores ? { p1: [], p2: [] } : (prev?.roundHistory || { p1: [], p2: [] }),
        currentRoundPoints: [0, 0],
        p1GroundTurns: 0,
        p2GroundTurns: 0,
        p1Struggling: false,
        p2Struggling: false,
        turnTimeLeft: 10,
      };
    });
    const pNames = [p1NameInput || '玩家一', p2NameInput || '玩家二'];
    setMessage(`${pNames[starter - 1]} 的回合`);
    setShowStartScreen(false);
  };

  const handleStartGame = () => {
    const gVal = parseFloat(gravityInput) || 9.8;
    // Scale 9.8 to 0.25
    const scaledG = gVal * (0.25 / 9.8);
    initGame(scaledG);
    
    // Enter fullscreen
    if (!document.fullscreenElement && !isPseudoFullscreen) {
      gameContainerRef.current?.requestFullscreen().catch(err => {
        console.warn(`Auto fullscreen failed, using pseudo-fullscreen: ${err.message}`);
        setIsPseudoFullscreen(true);
        setIsFullscreen(true);
      });
    }
  };

  const handleResetToStart = () => {
    setGameState(null);
    setShowStartScreen(true);
    setShowScoreEntry(false);
    setPendingScore(null);
  };

  const checkHighScore = (winnerIdx: number, score: number, name: string) => {
    const isTop5 = leaderboard.length < 5 || score > leaderboard[leaderboard.length - 1].score;
    if (isTop5 && score > 0) {
      setPendingScore({ name, score });
      setShowScoreEntry(true);
    }
  };

  const submitHighScore = async () => {
    if (!gradeInput || !classInput || !numberInput || !pendingScore) return;
    
    setIsSubmitting(true);
    setSubmissionError(null);

    // Timeout after 10 seconds
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('傳送超時，請檢查網路連線')), 10000)
    );

    try {
      const fullName = `${gradeInput}年${classInput}班${numberInput}號`;
      await Promise.race([
        saveHighScore(fullName, pendingScore.score),
        timeoutPromise
      ]);
      setShowScoreEntry(false);
      setPendingScore(null);
      setGradeInput('');
      setClassInput('');
      setNumberInput('');
    } catch (err) {
      console.error("Failed to submit score:", err);
      setSubmissionError(err instanceof Error ? err.message : '傳送失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    // Don't auto-init on mount, wait for start screen
  }, []);

  // Update Message based on turn
  useEffect(() => {
    if (!gameState) return;
    if (gameState.status === 'aiming') {
      const name = gameState.currentPlayer === 1 ? gameState.playerNames[0] : gameState.playerNames[1];
      setMessage(`${name} 的回合`);
    }
  }, [gameState?.currentPlayer, gameState?.status, gameState?.playerNames]);

  // Sound Effects Trigger
  useEffect(() => {
    if (showStartScreen) {
      soundService.playIntro();
      soundService.stopBGM();
    } else if (gameState) {
      soundService.startBGM();
    } else {
      soundService.stopBGM();
    }
  }, [showStartScreen, !!gameState]);

  useEffect(() => {
    if (!gameState) return;

    if (gameState.status === 'throwing') {
      soundService.playThrow();
    } else if (gameState.status === 'exploding') {
      if (gameState.explosion?.type === 'acid') {
        soundService.playMelting();
      } else if (gameState.explosion && gameState.explosion.maxRadius > 35) {
        soundService.playHit();
      } else {
        soundService.playExplosion();
      }
    } else if (gameState.status === 'celebrating') {
      soundService.playVictory();
      const timer = setTimeout(() => {
        setGameState(prev => {
          if (!prev) return null;
          
          const newHistory = {
            p1: [...prev.roundHistory.p1, prev.currentRoundPoints[0]],
            p2: [...prev.roundHistory.p2, prev.currentRoundPoints[1]]
          };

          const winner1 = prev.scores[0] >= 2;
          const winner2 = prev.scores[1] >= 2;
          if (winner1 || winner2) {
            return { ...prev, status: 'tournamentOver', tournamentWinner: winner1 ? 1 : 2, roundHistory: newHistory };
          }
          return { ...prev, status: 'roundOver', roundHistory: newHistory };
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [gameState?.status]);

  // Game Loop
  useEffect(() => {
    if (!gameState) return;

    const interval = setInterval(() => {
      setGameState(prev => {
        if (!prev) return null;

        let next = { ...prev };

        // Update Particles
        next.particles = prev.particles
          .map(p => {
            let nextVel = { ...p.vel };
            let nextPos = { x: p.pos.x + p.vel.x, y: p.pos.y + p.vel.y };
            let nextRotation = (p.rotation || 0) + (p.rotationVel || 0);

            if (p.type === 'smoke') {
              nextVel.x *= 0.95;
              nextVel.y -= 0.05; // Smoke rises
            } else if (p.type === 'spark') {
              nextVel.x *= 0.99;
              nextVel.y += 0.05; // Sparks are light
            } else if (p.type === 'debris') {
              nextVel.x *= 0.99;
              nextVel.y += 0.2; // Debris is heavy
            } else {
              nextVel.x *= 0.98;
              nextVel.y += 0.1; // Normal gravity
            }

            return {
              ...p,
              pos: nextPos,
              vel: nextVel,
              rotation: nextRotation,
              life: p.life - 1,
            };
          })
          .filter(p => p.life > 0);

        // Update Shake
        next.shake = Math.max(0, prev.shake - 0.5);

        // Update Players (Falling)
        const p1TargetY = getGroundY(prev.player1Pos.x, prev.buildings, prev.destructions);
        if (prev.player1Pos.y < p1TargetY) {
          next.player1Pos = { ...prev.player1Pos, y: Math.min(prev.player1Pos.y + 4, p1TargetY) };
        }

        const p2TargetY = getGroundY(prev.player2Pos.x, prev.buildings, prev.destructions);
        if (prev.player2Pos.y < p2TargetY) {
          next.player2Pos = { ...prev.player2Pos, y: Math.min(prev.player2Pos.y + 4, p2TargetY) };
        }

        // Update Sun (Falling)
        if (prev.sunState === 'falling') {
          next.sunPos = { ...prev.sunPos, y: prev.sunPos.y + 8 };
          
          const groundY = getGroundY(next.sunPos.x, prev.buildings, prev.destructions);
          
          // Explode if hit building or ground
          if (next.sunPos.y >= groundY - 20 || next.sunPos.y > CANVAS_HEIGHT - 50) {
            // Massive explosion!
            const explosionPos = { x: next.sunPos.x, y: Math.min(next.sunPos.y, groundY) };
            const newParticles = Array.from({ length: 300 }).map((_, i) => ({
              id: Math.random(),
              pos: { ...explosionPos },
              vel: { x: (Math.random() - 0.5) * 40, y: (Math.random() - 0.5) * 40 },
              life: 100 + Math.random() * 50,
              maxLife: 150,
              color: '#FFCC00',
              size: 5 + Math.random() * 10,
            }));

            // Destroy everything
            next.destructions = [...prev.destructions, { pos: explosionPos, radius: 1000 }];
            next.particles = [...next.particles, ...newParticles];
            next.shake = 100;
            next.status = 'exploding';
            next.explosion = {
              pos: explosionPos,
              radius: 0,
              maxRadius: 1000,
              type: 'giant'
            };
            next.sunState = 'normal';
            next.sunHits = 0;
            soundService.playHit();
            soundService.playExplosion();
          }
        }

        // Update Windows every 2 seconds
        const now = Date.now();
        if (now - lastWindowToggle.current > 2000) {
          lastWindowToggle.current = now;
          next.buildings = prev.buildings.map(b => ({
            ...b,
            windows: b.windows.map(row => 
              row.map(w => (Math.random() > 0.05 ? w : !w))
            ),
          }));
        }

        if (prev.status === 'meteorShower' && prev.meteorShower) {
          const elapsed = Date.now() - prev.meteorShower.startTime;
          
          if (elapsed > prev.meteorShower.duration) {
            return handleTurnTransition(prev, next);
          }

          // Warning period (first 1s)
          if (elapsed < 1000) {
            return next;
          }

          // Falling period
          const activeMeteors = [...prev.meteorShower.meteors];
          if (Math.random() > 0.6) {
            activeMeteors.push({
              id: Math.random(),
              pos: {
                x: prev.meteorShower.centerX + (Math.random() - 0.5) * 150 * 5,
                y: -50
              },
              vel: {
                x: (Math.random() - 0.5) * 4,
                y: 12 + Math.random() * 8
              }
            });
          }

          const updatedMeteors: Meteor[] = [];
          const newDestructions = [...prev.destructions];
          let newParticles = [...next.particles];

          for (const m of activeMeteors) {
            const nextPos = {
              x: m.pos.x + m.vel.x,
              y: m.pos.y + m.vel.y
            };

            // Check building collision
            let hitBuilding = false;
            for (const b of prev.buildings) {
              if (nextPos.x >= b.x && nextPos.x <= b.x + b.width && nextPos.y >= b.y) {
                const inHole = newDestructions.some(d => 
                  Math.sqrt((nextPos.x - d.pos.x) ** 2 + (nextPos.y - d.pos.y) ** 2) < d.radius
                );
                
                if (!inHole) {
                  hitBuilding = true;
                  newDestructions.push({ pos: nextPos, radius: 25 });
                  
                  // Spawn some particles
                  const pCount = 15;
                  for(let i=0; i<pCount; i++) {
                    newParticles.push({
                      id: Math.random(),
                      pos: { ...nextPos },
                      vel: { x: (Math.random() - 0.5) * 12, y: (Math.random() - 0.5) * 12 - 5 },
                      life: 30 + Math.random() * 30,
                      maxLife: 60,
                      color: b.color,
                      size: 2 + Math.random() * 4,
                      type: 'debris'
                    });
                  }
                  soundService.playHit();
                  break;
                }
              }
            }

            if (!hitBuilding && nextPos.y < CANVAS_HEIGHT + 50) {
              updatedMeteors.push({ ...m, pos: nextPos });
            }
          }

          // Check for hits
          const p1Hit = (prev.meteorShower.protectedPlayer !== 1) && updatedMeteors.some(m => 
            Math.sqrt((m.pos.x - prev.player1Pos.x) ** 2 + (m.pos.y - prev.player1Pos.y) ** 2) < MONKEY_SIZE
          );
          const p2Hit = (prev.meteorShower.protectedPlayer !== 2) && updatedMeteors.some(m => 
            Math.sqrt((m.pos.x - prev.player2Pos.x) ** 2 + (m.pos.y - prev.player2Pos.y) ** 2) < MONKEY_SIZE
          );

          if (p1Hit || p2Hit) {
            const winner = p1Hit ? 2 : 1;
            const newScores: [number, number] = [prev.scores[0], prev.scores[1]];
            newScores[winner - 1]++;
            const newPoints = [...prev.currentRoundPoints] as [number, number];
            newPoints[winner - 1] += 100;
            newPoints[p1Hit ? 0 : 1] = 0;
            return {
              ...next,
              status: 'celebrating',
              winner,
              scores: newScores,
              currentRoundPoints: newPoints,
              meteorShower: undefined,
              destructions: newDestructions,
              particles: newParticles
            };
          }

          return {
            ...next,
            destructions: newDestructions,
            particles: newParticles,
            meteorShower: {
              ...prev.meteorShower,
              meteors: updatedMeteors
            }
          };
        }

        if (prev.status === 'aiming' || prev.status === 'roundOver' || prev.status === 'tournamentOver') {
          return next;
        }

        if (prev.status === 'throwing' && prev.banana) {
          const newPos = {
            x: prev.banana.pos.x + prev.banana.vel.x,
            y: prev.banana.pos.y + prev.banana.vel.y,
          };
          const newVel = {
            x: prev.banana.vel.x + prev.wind,
            y: prev.banana.vel.y + prev.gravity,
          };
          const newAngle = prev.banana.angle + 0.3;

          // Collision detection
          // 0. Hit Treasure
          const treasureIdx = next.treasures.findIndex(t => 
            t.active && Math.sqrt((newPos.x - t.pos.x) ** 2 + (newPos.y - t.pos.y) ** 2) < 35
          );
          if (treasureIdx !== -1) {
            const hitTreasure = next.treasures[treasureIdx];
            // Update treasures array without mutation
            next.treasures = next.treasures.map((t, i) => 
              i === treasureIdx ? { ...t, active: false } : t
            );
            
            if (prev.currentPlayer === 1) {
              next.player1Projectile = hitTreasure.type;
            } else {
              next.player2Projectile = hitTreasure.type;
            }
            soundService.playThrow(); // Re-use throw sound for pickup
          }

          // 1. Out of bounds
          if (newPos.x < 0 || newPos.x > CANVAS_WIDTH || newPos.y > CANVAS_HEIGHT) {
            return handleTurnTransition(prev, next);
          }

          // 1.5 Hit Sun
          const distToSun = Math.sqrt((newPos.x - prev.sunPos.x) ** 2 + (newPos.y - prev.sunPos.y) ** 2);
          let newSunState = prev.sunState;
          let newSunHits = prev.sunHits;
          let hasHitSun = prev.banana.hasHitSun;

          if (distToSun < 35 && !hasHitSun && prev.sunState !== 'falling') {
            newSunHits = prev.sunHits + 1;
            hasHitSun = true;
            soundService.playSunHit();
            if (newSunHits === 1) newSunState = 'surprised';
            else if (newSunHits === 2) newSunState = 'sunglasses';
            else if (newSunHits === 3) newSunState = 'dead';
            else if (newSunHits === 4) newSunState = 'skull';
            else if (newSunHits >= 5) newSunState = 'falling';
          }

          // 2. Hit Monkey
          const targetMonkey = prev.currentPlayer === 1 ? prev.player2Pos : prev.player1Pos;
          const selfMonkey = prev.currentPlayer === 1 ? prev.player1Pos : prev.player2Pos;
          
          const distToTarget = Math.sqrt((newPos.x - targetMonkey.x) ** 2 + (newPos.y - targetMonkey.y) ** 2);
          const distToSelf = Math.sqrt((newPos.x - selfMonkey.x) ** 2 + (newPos.y - selfMonkey.y) ** 2);

          if (distToTarget < MONKEY_SIZE || (distToSelf < MONKEY_SIZE && prev.banana.trail.length > 10)) {
            const isSelfHit = distToSelf < MONKEY_SIZE;
            const newScores: [number, number] = [prev.scores[0], prev.scores[1]];
            
            if (isSelfHit) {
              // Self hit: opponent wins immediately
              const winner = prev.currentPlayer === 1 ? 2 : 1;
              newScores[winner - 1]++;
              const newPoints = [...prev.currentRoundPoints] as [number, number];
              newPoints[prev.currentPlayer - 1] = 0;
              return {
                ...next,
                status: 'celebrating',
                winner,
                scores: newScores,
                currentRoundPoints: newPoints,
                banana: undefined,
              };
            } else {
              newScores[prev.currentPlayer - 1]++;
            }

            const newPoints = [...prev.currentRoundPoints] as [number, number];
            newPoints[prev.currentPlayer - 1] += 100;

            // Generate Particles
            const particleCount = prev.banana?.type === 'giant' ? 150 : (prev.banana?.type === 'acid' ? 100 : 60);
            const newParticles: Particle[] = Array.from({ length: particleCount }).flatMap((_, i) => {
              const base = {
                id: Math.random(),
                pos: { ...newPos },
                vel: { x: (Math.random() - 0.5) * 20, y: (Math.random() - 0.5) * 20 },
                life: 50 + Math.random() * 40,
                maxLife: 90,
                color: prev.banana?.type === 'acid' ? '#00FF00' : '#FFCC99',
                size: 2 + Math.random() * 6,
                type: 'normal' as ParticleType
              };

              const results: Particle[] = [base];
              
              if (Math.random() > 0.6) {
                results.push({
                  ...base,
                  id: Math.random(),
                  color: 'rgba(100, 100, 100, 0.5)',
                  type: 'smoke' as ParticleType,
                  size: 10 + Math.random() * 10,
                  vel: { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5 - 2 }
                });
              }
              
              if (Math.random() > 0.8) {
                results.push({
                  ...base,
                  id: Math.random(),
                  color: '#FFFF00',
                  type: 'spark' as ParticleType,
                  size: 1 + Math.random() * 2,
                  vel: { x: (Math.random() - 0.5) * 30, y: (Math.random() - 0.5) * 30 }
                });
              }

              return results;
            });

            return { 
              ...next, 
              status: 'exploding', 
              scores: newScores, 
              currentRoundPoints: newPoints,
              explosion: { 
                pos: newPos, 
                radius: 0, 
                maxRadius: prev.banana.type === 'giant' ? 350 : (prev.banana.type === 'acid' ? 180 : 40),
                type: prev.banana.type
              },
              particles: [...next.particles, ...newParticles],
              shake: prev.banana.type === 'giant' ? 60 : (prev.banana.type === 'acid' ? 40 : 25)
            };
          }

          // 3. Hit Building
          for (const b of prev.buildings) {
            if (newPos.x >= b.x && newPos.x <= b.x + b.width && newPos.y >= b.y) {
              const inHole = prev.destructions.some(d => 
                Math.sqrt((newPos.x - d.pos.x) ** 2 + (newPos.y - d.pos.y) ** 2) < d.radius
              );
              
              if (!inHole) {
                // Generate Particles
                const particleCount = prev.banana?.type === 'giant' ? 120 : (prev.banana?.type === 'acid' ? 100 : 40);
                const newParticles: Particle[] = Array.from({ length: particleCount }).flatMap((_, i) => {
                  const isAcid = prev.banana?.type === 'acid';
                  const isGiant = prev.banana?.type === 'giant';
                  
                  const base = {
                    id: Math.random(),
                    pos: { ...newPos },
                    vel: { 
                      x: (Math.random() - 0.5) * (isGiant ? 25 : 15), 
                      y: (Math.random() - 0.5) * (isGiant ? 25 : 15) 
                    },
                    life: (isAcid ? 80 : 40) + Math.random() * 40,
                    maxLife: (isAcid ? 120 : 80),
                    color: isAcid ? '#00FF00' : (isGiant ? '#FFD700' : b.color),
                    size: (isGiant ? 4 : 2) + Math.random() * 5,
                    sparkle: isGiant && Math.random() > 0.5,
                    type: 'normal' as ParticleType
                  };

                  const results: Particle[] = [base];

                  // Add debris
                  if (Math.random() > 0.4) {
                    results.push({
                      ...base,
                      id: Math.random(),
                      color: b.color,
                      type: 'debris' as ParticleType,
                      size: 3 + Math.random() * 5,
                      rotation: Math.random() * Math.PI * 2,
                      rotationVel: (Math.random() - 0.5) * 0.5,
                      vel: { x: (Math.random() - 0.5) * 12, y: (Math.random() - 0.5) * 12 - 5 }
                    });
                  }

                  // Add smoke
                  if (Math.random() > 0.6) {
                    results.push({
                      ...base,
                      id: Math.random(),
                      color: 'rgba(150, 150, 150, 0.4)',
                      type: 'smoke' as ParticleType,
                      size: 15 + Math.random() * 15,
                      vel: { x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 4 - 3 }
                    });
                  }

                  return results;
                });

                if (prev.banana.type === 'meteor') {
                  return {
                    ...next,
                    status: 'meteorShower',
                    meteorShower: {
                      centerX: newPos.x,
                      startTime: Date.now(),
                      duration: 4000, // 1s warning + 3s falling
                      meteors: [],
                      protectedPlayer: prev.currentPlayer
                    },
                    banana: undefined,
                    explosion: undefined,
                    particles: [...next.particles, ...newParticles],
                    shake: 50
                  };
                }

                return { 
                  ...next, 
                  status: 'exploding', 
                  explosion: { 
                    pos: newPos, 
                    radius: 0, 
                    maxRadius: prev.banana.type === 'acid' ? 150 : (prev.banana.type === 'giant' ? 300 : 30),
                    type: prev.banana.type
                  },
                  currentRoundPoints: (() => {
                    const p = [...prev.currentRoundPoints] as [number, number];
                    p[prev.currentPlayer - 1] += calculateScore(newPos, selfMonkey, targetMonkey);
                    return p;
                  })(),
                  destructions: [...prev.destructions, { pos: newPos, radius: prev.banana.type === 'acid' ? 80 : (prev.banana.type === 'giant' ? 150 : 15) }],
                  particles: [...next.particles, ...newParticles],
                  shake: prev.banana.type === 'normal' ? 15 : 45
                };
              }
            }
          }

          // Add weapon-specific trail particles
          let weaponParticles: any[] = [];
          if (prev.banana.type === 'acid' && Math.random() > 0.5) {
            weaponParticles.push({
              id: Math.random(),
              pos: { ...newPos },
              vel: { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 },
              life: 20 + Math.random() * 20,
              maxLife: 40,
              color: '#00FF00',
              size: 2 + Math.random() * 3,
            });
          } else if (prev.banana.type === 'giant' && Math.random() > 0.3) {
            weaponParticles.push({
              id: Math.random(),
              pos: { ...newPos },
              vel: { x: (Math.random() - 0.5) * 1, y: (Math.random() - 0.5) * 1 },
              life: 30 + Math.random() * 30,
              maxLife: 60,
              color: '#FFD700',
              size: 1 + Math.random() * 2,
            });
          }

          return {
            ...next,
            sunState: newSunState,
            sunHits: newSunHits,
            particles: [...next.particles, ...weaponParticles],
            banana: {
              pos: newPos,
              vel: newVel,
              trail: [...prev.banana.trail, newPos].slice(-20),
              angle: newAngle,
              type: prev.banana.type,
              hasHitSun: hasHitSun,
            },
          };
        }

        if (prev.status === 'exploding' && prev.explosion) {
          if (prev.explosion.radius >= prev.explosion.maxRadius) {
            if (prev.explosion.maxRadius >= 1000) {
              // Sun explosion: restart game
              setTimeout(() => initGame(undefined, true), 1000);
              return { ...next, status: 'roundOver', explosion: undefined };
            }

            const p1Hit = Math.sqrt((prev.explosion.pos.x - prev.player1Pos.x) ** 2 + (prev.explosion.pos.y - prev.player1Pos.y) ** 2) < MONKEY_SIZE;
            const p2Hit = Math.sqrt((prev.explosion.pos.x - prev.player2Pos.x) ** 2 + (prev.explosion.pos.y - prev.player2Pos.y) ** 2) < MONKEY_SIZE;

            if (p1Hit || p2Hit) {
               const winner = p1Hit ? 2 : 1;
               return { ...next, status: 'celebrating', winner, explosion: undefined };
            }

            return handleTurnTransition(prev, next);
          }
          return {
            ...next,
            explosion: {
              ...prev.explosion,
              radius: prev.explosion.radius + (prev.explosion.maxRadius > 100 ? 10 : 3),
            },
          };
        }

        return next;
      });
    }, 20);

    return () => clearInterval(interval);
  }, [gameState?.status]);

  // Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameState) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#0000AA';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const time = Date.now() / 1000;

    // Apply Screen Shake
    if (gameState.shake > 0) {
      const sx = (Math.random() - 0.5) * gameState.shake;
      const sy = (Math.random() - 0.5) * gameState.shake;
      ctx.save();
      ctx.translate(sx, sy);
    }

    // Draw Buildings
    gameState.buildings.forEach(b => {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.width, b.height);
      
      // Draw Windows
      const winW = 4;
      const winH = 6;
      const gapX = 10;
      const gapY = 15;
      b.windows.forEach((row, r) => {
        row.forEach((isOn, c) => {
          if (isOn) {
            // Random flicker based on position and time
            const flicker = Math.sin(time * 2 + (b.x + c) * 0.5 + (b.y + r) * 0.3);
            const alpha = flicker > 0.8 ? 0.3 : 1.0; // Occasional dimming
            ctx.fillStyle = `rgba(255, 255, 85, ${alpha})`;
          } else {
            ctx.fillStyle = '#000000';
          }
          ctx.fillRect(b.x + 5 + c * gapX, b.y + 10 + r * gapY, winW, winH);
        });
      });
    });

    // Draw Destructions (Holes)
    ctx.fillStyle = '#0000AA';
    gameState.destructions.forEach(d => {
      ctx.beginPath();
      ctx.arc(d.pos.x, d.pos.y, d.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Meteor Shower Warning & Meteors
    if (gameState.status === 'meteorShower' && gameState.meteorShower) {
      const elapsed = Date.now() - gameState.meteorShower.startTime;
      const range = 150 * 5;
      const startX = gameState.meteorShower.centerX - range / 2;
      
      // Sky Warning
      if (elapsed < 1000) {
        const alpha = Math.sin(elapsed / 100) * 0.3 + 0.3;
        ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
        ctx.fillRect(startX, 0, range, 100);
      } else {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.fillRect(startX, 0, range, 50);
      }
      
      // Meteors
      gameState.meteorShower.meteors.forEach(m => {
        ctx.save();
        ctx.translate(m.pos.x, m.pos.y);
        
        // Trail
        const trailGradient = ctx.createLinearGradient(0, 0, -m.vel.x * 5, -m.vel.y * 5);
        trailGradient.addColorStop(0, 'rgba(255, 69, 0, 0.8)');
        trailGradient.addColorStop(1, 'transparent');
        ctx.strokeStyle = trailGradient;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-m.vel.x * 5, -m.vel.y * 5);
        ctx.stroke();
        
        // Meteor head
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FF4500';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.restore();
      });
    }

    // Draw Sun
    ctx.save();
    const sunX = gameState.sunPos.x;
    const sunY = gameState.sunPos.y;

    // Breathing effect for normal sun
    const breathing = (gameState.sunState === 'normal' || gameState.sunState === 'surprised') ? Math.sin(time * 3) * 1.2 : 0;
    const baseRadius = 20 + breathing;

    // Sun rays (animated rotation for non-skull)
    if (gameState.sunState !== 'skull') {
      ctx.strokeStyle = '#FFFF55';
      ctx.lineWidth = 3;
      const rayRotation = time * 0.5;
      for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI) / 6 + rayRotation;
        // Rays also pulse slightly
        const rayPulse = (gameState.sunState === 'normal' || gameState.sunState === 'surprised') ? Math.sin(time * 3 + 0.5) * 3 : 0;
        const rayLen = gameState.sunState === 'falling' ? 45 : 35 + rayPulse;
        ctx.beginPath();
        ctx.moveTo(sunX + Math.cos(angle) * (baseRadius + 5), sunY + Math.sin(angle) * (baseRadius + 5));
        ctx.lineTo(sunX + Math.cos(angle) * rayLen, sunY + Math.sin(angle) * rayLen);
        ctx.stroke();
      }
    }

    // Main Sun Body
    if (gameState.sunState === 'skull') {
      // Draw Detailed Skull
      ctx.fillStyle = '#F0F0F0';
      // Subtle gradient for depth
      const grad = ctx.createRadialGradient(sunX - 5, sunY - 5, 5, sunX, sunY, 25);
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(1, '#D0D0D0');
      ctx.fillStyle = grad;
      
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.arc(sunX, sunY, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Eye Sockets
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.ellipse(sunX - 8, sunY - 5, 6, 8, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(sunX + 8, sunY - 5, 6, 8, -0.2, 0, Math.PI * 2);
      ctx.fill();
      
      // Faint red glow in eyes
      ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
      ctx.beginPath();
      ctx.arc(sunX - 8, sunY - 3, 2, 0, Math.PI * 2);
      ctx.arc(sunX + 8, sunY - 3, 2, 0, Math.PI * 2);
      ctx.fill();

      // Nose Hole
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.moveTo(sunX, sunY + 3);
      ctx.lineTo(sunX - 3, sunY + 8);
      ctx.lineTo(sunX + 3, sunY + 8);
      ctx.closePath();
      ctx.fill();

      // Teeth/Jaw
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sunX - 10, sunY + 14);
      ctx.lineTo(sunX + 10, sunY + 14);
      ctx.stroke();
      for (let i = -8; i <= 8; i += 4) {
        ctx.beginPath();
        ctx.moveTo(sunX + i, sunY + 10);
        ctx.lineTo(sunX + i, sunY + 18);
        ctx.stroke();
      }

      // Cracks
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Top crack
      ctx.moveTo(sunX - 5, sunY - 20);
      ctx.lineTo(sunX - 2, sunY - 15);
      ctx.lineTo(sunX - 6, sunY - 12);
      // Side crack
      ctx.moveTo(sunX + 15, sunY - 10);
      ctx.lineTo(sunX + 10, sunY - 5);
      ctx.lineTo(sunX + 12, sunY + 2);
      // Bottom crack
      ctx.moveTo(sunX - 12, sunY + 10);
      ctx.lineTo(sunX - 15, sunY + 15);
      ctx.stroke();
    } else {
      // Normal/Animated Sun
      const jitter = gameState.sunState === 'falling' ? Math.sin(time * 50) * 3 : 0;
      ctx.fillStyle = gameState.sunState === 'dead' ? '#DDDD99' : '#FFFF55';
      ctx.beginPath();
      ctx.arc(sunX + jitter, sunY + jitter, baseRadius, 0, Math.PI * 2);
      ctx.fill();

      // Sweat drops for falling state
      if (gameState.sunState === 'falling') {
        ctx.fillStyle = '#33AAFF';
        for (let i = 0; i < 3; i++) {
          const dropX = sunX + (i === 0 ? -25 : i === 1 ? 25 : 0) + Math.sin(time * 10 + i) * 5;
          const dropY = sunY - 10 + ((time * 20 + i * 10) % 40);
          ctx.beginPath();
          ctx.arc(dropX, dropY, 3, 0, Math.PI * 2);
          ctx.fill();
          // Drop tip
          ctx.beginPath();
          ctx.moveTo(dropX - 3, dropY);
          ctx.lineTo(dropX, dropY - 6);
          ctx.lineTo(dropX + 3, dropY);
          ctx.fill();
        }
      }

      // Eyes
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      if (gameState.sunState === 'sunglasses') {
        // Cool Sunglasses
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.roundRect(sunX - 16, sunY - 8, 14, 10, 2);
        ctx.roundRect(sunX + 2, sunY - 8, 14, 10, 2);
        ctx.fill();
        // Bridge
        ctx.beginPath();
        ctx.moveTo(sunX - 2, sunY - 3);
        ctx.lineTo(sunX + 2, sunY - 3);
        ctx.stroke();
        // Reflection
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.moveTo(sunX - 14, sunY - 6);
        ctx.lineTo(sunX - 10, sunY - 2);
        ctx.moveTo(sunX + 4, sunY - 6);
        ctx.lineTo(sunX + 8, sunY - 2);
        ctx.stroke();
      } else if (gameState.sunState === 'dead') {
        // X Eyes
        const drawX = (x: number, y: number) => {
          ctx.beginPath();
          ctx.moveTo(x - 5, y - 5); ctx.lineTo(x + 5, y + 5);
          ctx.moveTo(x + 5, y - 5); ctx.lineTo(x - 5, y + 5);
          ctx.stroke();
        };
        drawX(sunX - 8, sunY - 5);
        drawX(sunX + 8, sunY - 5);
      } else if (gameState.sunState === 'falling') {
        // Panicked Eyes
        const eyeJitter = Math.sin(time * 40) * 4;
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(sunX - 8, sunY - 5, 7, 0, Math.PI * 2);
        ctx.arc(sunX + 8, sunY - 5, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(sunX - 8 + eyeJitter, sunY - 5 + eyeJitter, 3, 0, Math.PI * 2);
        ctx.arc(sunX + 8 - eyeJitter, sunY - 5 - eyeJitter, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Eyebrows
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sunX - 15, sunY - 15 + Math.sin(time * 20) * 2);
        ctx.lineTo(sunX - 5, sunY - 12);
        ctx.moveTo(sunX + 15, sunY - 15 + Math.sin(time * 20 + 1) * 2);
        ctx.lineTo(sunX + 5, sunY - 12);
        ctx.stroke();
      } else {
        // Normal/Surprised
        const isBlinking = Math.sin(time * 0.5) > 0.98;
        if (isBlinking && gameState.sunState === 'normal') {
          ctx.beginPath();
          ctx.moveTo(sunX - 12, sunY - 5); ctx.lineTo(sunX - 4, sunY - 5);
          ctx.moveTo(sunX + 4, sunY - 5); ctx.lineTo(sunX + 12, sunY - 5);
          ctx.stroke();
        } else {
          const eyeSize = gameState.sunState === 'surprised' ? 4 : 2;
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(sunX - 8, sunY - 5, eyeSize, 0, Math.PI * 2);
          ctx.arc(sunX + 8, sunY - 5, eyeSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Mouth
      ctx.strokeStyle = '#000';
      if (gameState.sunState === 'falling') {
        // Large Screaming Mouth with shake
        ctx.fillStyle = '#400';
        const mouthShake = Math.sin(time * 60) * 2;
        ctx.beginPath();
        ctx.ellipse(sunX + mouthShake, sunY + 10, 9, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Tongue
        ctx.fillStyle = '#f55';
        ctx.beginPath();
        ctx.arc(sunX + mouthShake, sunY + 18, 5, 0, Math.PI, true);
        ctx.fill();
      } else if (gameState.sunState === 'surprised') {
        ctx.beginPath();
        ctx.arc(sunX, sunY + 8, 5, 0, Math.PI * 2);
        ctx.stroke();
      } else if (gameState.sunState === 'dead') {
        ctx.beginPath();
        ctx.moveTo(sunX - 10, sunY + 10);
        ctx.bezierCurveTo(sunX - 5, sunY + 5, sunX + 5, sunY + 15, sunX + 10, sunY + 10);
        ctx.stroke();
      } else {
        // Smile
        ctx.beginPath();
        ctx.arc(sunX, sunY + 5, 8, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();
      }

      // Sweat drops for falling
      if (gameState.sunState === 'falling') {
        ctx.fillStyle = '#AAF';
        for (let i = 0; i < 3; i++) {
          const dropX = sunX + Math.sin(time * 10 + i) * 25;
          const dropY = sunY - 20 - i * 10;
          ctx.beginPath();
          ctx.moveTo(dropX, dropY);
          ctx.lineTo(dropX - 3, dropY + 6);
          ctx.arc(dropX, dropY + 6, 3, Math.PI, 0, true);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    ctx.restore();

    // Draw Treasures
    gameState.treasures.forEach(t => {
      if (!t.active) return;
      ctx.save();
      ctx.translate(t.pos.x, t.pos.y);
      const bounce = Math.sin(Date.now() / 200) * 5;
      ctx.translate(0, bounce);
      
      if (t.type === 'giant') {
        // Draw Golden Sun Icon for 10x
        const time = Date.now() / 200;
        ctx.fillStyle = '#FFD700'; // Gold
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#FFD700';
        
        // Draw Sun Shape
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        
        // Rays
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4 + time;
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * 18, Math.sin(angle) * 18);
          ctx.lineTo(Math.cos(angle) * 25, Math.sin(angle) * 25);
          ctx.stroke();
        }
        
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('10X', 0, 4);
      } else if (t.type === 'acid') {
        // Draw Acid Bottle Icon
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(-8, -10, 16, 20);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-4, -14, 8, 4);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('ACID', 0, 4);
      } else if (t.type === 'beam') {
        // Draw Flashlight Icon
        ctx.fillStyle = '#444444'; // Dark Gray body
        ctx.fillRect(-12, -4, 18, 8);
        ctx.fillStyle = '#666666'; // Head
        ctx.fillRect(6, -7, 6, 14);
        ctx.fillStyle = '#FFFF00'; // Lens
        ctx.fillRect(12, -5, 2, 10);
        
        // Light beam effect
        ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
        ctx.beginPath();
        ctx.moveTo(14, -5);
        ctx.lineTo(30, -15);
        ctx.lineTo(30, 15);
        ctx.lineTo(14, 5);
        ctx.fill();
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('BEAM', 0, 3);
      } else if (t.type === 'meteor') {
        // Draw Irregular Burning Stone
        ctx.fillStyle = '#8B4513'; // SaddleBrown
        ctx.beginPath();
        ctx.moveTo(-10, -10);
        ctx.lineTo(12, -8);
        ctx.lineTo(15, 5);
        ctx.lineTo(5, 15);
        ctx.lineTo(-12, 10);
        ctx.lineTo(-15, -5);
        ctx.closePath();
        ctx.fill();
        
        // Fire/Glow
        ctx.strokeStyle = '#FF4500'; // OrangeRed
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Cracks/Details
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-5, -5);
        ctx.lineTo(5, 5);
        ctx.moveTo(5, -5);
        ctx.lineTo(-5, 5);
        ctx.stroke();
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('METEOR', 0, 3);
      }
      ctx.restore();
    });

    // Draw Particles
    gameState.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / p.maxLife;
      
      if (p.type === 'debris') {
        ctx.save();
        ctx.translate(p.pos.x, p.pos.y);
        ctx.rotate(p.rotation || 0);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      } else if (p.type === 'smoke') {
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.sparkle || p.type === 'spark') {
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, p.size * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.globalAlpha = 1.0;

    // Draw Aiming UI (Slingshot)
    if (gameState.status === 'aiming' && gameState.dragStart && gameState.dragCurrent) {
      const playerPos = gameState.currentPlayer === 1 ? gameState.player1Pos : gameState.player2Pos;
      const dx = gameState.dragCurrent.x - gameState.dragStart.x;
      const dy = gameState.dragCurrent.y - gameState.dragStart.y;
      
      // Calculate angle and velocity
      const angleRad = Math.atan2(dy, gameState.currentPlayer === 1 ? -dx : dx);
      let angleDeg = Math.round(angleRad * (180 / Math.PI));
      
      const dist = Math.sqrt(dx * dx + dy * dy);
      const velocity = Math.min(dist * 2.55, 255);

      // Draw Power Line (Dashed)
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playerPos.x, playerPos.y);
      ctx.lineTo(playerPos.x + dx, playerPos.y + dy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Angle Text above monkey
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${angleDeg}°`, playerPos.x, playerPos.y - 40);
      ctx.fillText(`力: ${Math.round(velocity)}`, playerPos.x, playerPos.y - 25);

      // Draw Trajectory Prediction (First 4 rounds = 8 turns, OR if beam is active)
      const currentWeapon = gameState.currentPlayer === 1 ? gameState.player1Projectile : gameState.player2Projectile;
      if (gameState.roundCount < 8 || currentWeapon === 'beam') {
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = currentWeapon === 'beam' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 0, 0.4)';
        ctx.beginPath();
        
        const rad = (gameState.currentPlayer === 1 ? -angleDeg : angleDeg + 180) * (Math.PI / 180);
        let px = playerPos.x;
        let py = playerPos.y;
        let vx = Math.cos(rad) * (velocity / 8);
        let vy = Math.sin(rad) * (velocity / 8);
        
        ctx.moveTo(px, py);
        const steps = currentWeapon === 'beam' ? 100 : 50;
        for (let i = 0; i < steps; i++) {
          px += vx;
          py += vy;
          vx += gameState.wind;
          vy += gameState.gravity;
          ctx.lineTo(px, py);
          if (py > CANVAS_HEIGHT || px < 0 || px > CANVAS_WIDTH) break;
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw Monkeys
    const drawMonkey = (pos: Point, color: string, isThrowing: boolean, isPlayer1: boolean, isWinner: boolean, isDead: boolean, isActive: boolean, hasUmbrella: boolean = false, groundTurns: number = 0, isStruggling: boolean = false) => {
      if (isActive && !isDead) {
        ctx.save();
        const bounce = Math.sin(Date.now() / 150) * 5;
        ctx.fillStyle = '#FFD700'; // Gold
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#FFD700';
        
        // Draw inverted triangle above head
        ctx.beginPath();
        ctx.moveTo(pos.x - 6, pos.y - 45 + bounce);
        ctx.lineTo(pos.x + 6, pos.y - 45 + bounce);
        ctx.lineTo(pos.x, pos.y - 35 + bounce);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Countdown display
      if (groundTurns > 0 && !isDead && !isWinner) {
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.fillStyle = groundTurns >= 4 ? '#FF0000' : '#FFFFFF';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#000000';
        ctx.fillText(`${5 - groundTurns}`, 0, -60);
        ctx.restore();
      }

      ctx.save();
      
      // Struggle animation (shaking)
      let shakeX = 0;
      let shakeY = 0;
      if (isStruggling) {
        shakeX = (Math.random() - 0.5) * 8;
        shakeY = (Math.random() - 0.5) * 8;
      }
      
      ctx.translate(pos.x + shakeX, pos.y + shakeY);
      
      if (isDead) {
        ctx.rotate(isPlayer1 ? -Math.PI / 2 : Math.PI / 2);
        ctx.translate(0, 10);
      }

      // Refined Gorilla Drawing
      const p = 2.5; 
      const furColor = color; // Main fur color
      const faceColor = '#FFCC99'; // Lighter face/chest color
      const shadowColor = 'rgba(0,0,0,0.2)';
      const highlightColor = 'rgba(255,255,255,0.2)';

      // 1. Ears
      ctx.fillStyle = furColor;
      ctx.fillRect(-3.5 * p, -9.5 * p, 1.5 * p, 2 * p); // Left ear
      ctx.fillRect(2 * p, -9.5 * p, 1.5 * p, 2 * p);  // Right ear

      // 2. Head
      ctx.fillStyle = furColor;
      ctx.fillRect(-2.5 * p, -10.5 * p, 5 * p, 4.5 * p); // Main head shape
      
      // 3. Face Mask
      ctx.fillStyle = faceColor;
      ctx.fillRect(-1.5 * p, -8.5 * p, 3 * p, 2.5 * p); // Face area
      
      // 4. Eyes
      ctx.fillStyle = '#000';
      ctx.fillRect(-1 * p, -7.5 * p, 0.8 * p, 0.8 * p); // Left eye
      ctx.fillRect(0.2 * p, -7.5 * p, 0.8 * p, 0.8 * p); // Right eye
      
      // 5. Body
      ctx.fillStyle = furColor;
      ctx.fillRect(-4 * p, -6 * p, 8 * p, 6 * p); // Main torso
      
      // 6. Chest Patch
      ctx.fillStyle = faceColor;
      ctx.fillRect(-2.5 * p, -5 * p, 5 * p, 4 * p); // Chest area
      
      // 7. Arms
      ctx.fillStyle = furColor;
      if (isWinner) {
        const beat = Math.sin(Date.now() / 150) > 0;
        if (beat) {
          // Arms up (Victory)
          ctx.fillRect(-6 * p, -11 * p, 2.5 * p, 6 * p); // Left arm up
          ctx.fillRect(3.5 * p, -11 * p, 2.5 * p, 6 * p);  // Right arm up
          // Hands
          ctx.fillStyle = faceColor;
          ctx.fillRect(-6 * p, -12 * p, 2.5 * p, 1.5 * p);
          ctx.fillRect(3.5 * p, -12 * p, 2.5 * p, 1.5 * p);
        } else {
          // Arms down/bent
          ctx.fillRect(-7 * p, -7 * p, 3.5 * p, 3 * p); // Left shoulder
          ctx.fillRect(3.5 * p, -7 * p, 3.5 * p, 3 * p);  // Right shoulder
          ctx.fillRect(-7 * p, -4 * p, 2 * p, 5 * p); // Left arm down
          ctx.fillRect(5 * p, -4 * p, 2 * p, 5 * p);  // Right arm down
          // Hands
          ctx.fillStyle = faceColor;
          ctx.fillRect(-7 * p, 1 * p, 2 * p, 1.5 * p);
          ctx.fillRect(5 * p, 1 * p, 2 * p, 1.5 * p);
        }
      } else if (isThrowing) {
        const elapsed = Date.now() - (gameState.throwStartTime || 0);
        const armUp = elapsed < 400;
        if (isPlayer1) {
          // Player 1 throwing (Left arm up)
          if (armUp) {
            ctx.fillRect(-6 * p, -12 * p, 2.5 * p, 7 * p);
            ctx.fillStyle = faceColor;
            ctx.fillRect(-6 * p, -13 * p, 2.5 * p, 1.5 * p);
            ctx.fillStyle = furColor;
          } else {
            ctx.fillRect(-7 * p, -7 * p, 3.5 * p, 4 * p);
          }
          
          // Right arm on hip
          ctx.fillRect(4 * p, -7 * p, 3 * p, 3 * p);
          ctx.fillRect(5 * p, -4 * p, 2 * p, 4 * p);
          ctx.fillStyle = faceColor;
          ctx.fillRect(3.5 * p, -1 * p, 2 * p, 1.5 * p);
        } else {
          // Player 2 throwing (Right arm up)
          if (armUp) {
            ctx.fillRect(3.5 * p, -12 * p, 2.5 * p, 7 * p);
            ctx.fillStyle = faceColor;
            ctx.fillRect(3.5 * p, -13 * p, 2.5 * p, 1.5 * p);
            ctx.fillStyle = furColor;
          } else {
            ctx.fillRect(3.5 * p, -7 * p, 3.5 * p, 4 * p);
          }
          
          // Left arm on hip
          ctx.fillRect(-7 * p, -7 * p, 3 * p, 3 * p);
          ctx.fillRect(-7 * p, -4 * p, 2 * p, 4 * p);
          ctx.fillStyle = faceColor;
          ctx.fillRect(-5.5 * p, -1 * p, 2 * p, 1.5 * p);
        }
      } else {
        // Hands on hips
        // Left arm
        ctx.fillRect(-7 * p, -7 * p, 3.5 * p, 3 * p); // Shoulder
        ctx.fillRect(-7 * p, -4 * p, 2 * p, 4 * p); // Arm down
        ctx.fillStyle = faceColor;
        ctx.fillRect(-5.5 * p, -1 * p, 2 * p, 1.5 * p); // Hand
        
        // Right arm
        ctx.fillStyle = furColor;
        ctx.fillRect(3.5 * p, -7 * p, 3.5 * p, 3 * p); // Shoulder
        ctx.fillRect(5 * p, -4 * p, 2 * p, 4 * p); // Arm down
        ctx.fillStyle = faceColor;
        ctx.fillRect(3.5 * p, -1 * p, 2 * p, 1.5 * p); // Hand
      }
      
      // 8. Legs
      ctx.fillStyle = furColor;
      ctx.fillRect(-3.5 * p, 0 * p, 2.5 * p, 4 * p); // Left leg
      ctx.fillRect(1 * p, 0 * p, 2.5 * p, 4 * p);  // Right leg
      
      // 9. Feet
      ctx.fillStyle = faceColor;
      ctx.fillRect(-4.5 * p, 4 * p, 3.5 * p, 1.5 * p); // Left foot
      ctx.fillRect(1 * p, 4 * p, 3.5 * p, 1.5 * p);  // Right foot

      // 10. Shading/Highlights (Subtle)
      ctx.fillStyle = highlightColor;
      ctx.fillRect(-2 * p, -10 * p, 1 * p, 1 * p); // Head highlight
      ctx.fillRect(-3.5 * p, -5.5 * p, 1 * p, 1 * p); // Shoulder highlight
      
      ctx.fillStyle = shadowColor;
      ctx.fillRect(-3.5 * p, -1 * p, 2.5 * p, 0.5 * p); // Leg shadow
      ctx.fillRect(1 * p, -1 * p, 2.5 * p, 0.5 * p);  // Leg shadow

      // 11. Umbrella (if protected during meteor shower)
      if (hasUmbrella) {
        ctx.save();
        ctx.translate(0, -15 * p); // Move above head
        
        // Handle
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -25);
        ctx.stroke();
        
        // Canopy
        const umbrellaColor = '#FF4444';
        ctx.fillStyle = umbrellaColor;
        ctx.beginPath();
        ctx.arc(0, -25, 40, Math.PI, 0);
        ctx.fill();
        
        // Ribs/Details
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        for (let i = 1; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(0, -25);
          const angle = Math.PI + (i * Math.PI) / 4;
          ctx.lineTo(Math.cos(angle) * 40, -25 + Math.sin(angle) * 40);
          ctx.stroke();
        }
        
        // Top point
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(0, -65, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      }

      ctx.restore();
    };

    const p1Throwing = gameState.status === 'throwing' && gameState.currentPlayer === 1;
    const p2Throwing = gameState.status === 'throwing' && gameState.currentPlayer === 2;
    const p1Winner = (gameState.status === 'roundOver' || gameState.status === 'tournamentOver' || gameState.status === 'celebrating') && gameState.winner === 1;
    const p2Winner = (gameState.status === 'roundOver' || gameState.status === 'tournamentOver' || gameState.status === 'celebrating') && gameState.winner === 2;
    const p1Dead = (gameState.status === 'roundOver' || gameState.status === 'tournamentOver' || gameState.status === 'celebrating') && gameState.winner === 2;
    const p2Dead = (gameState.status === 'roundOver' || gameState.status === 'tournamentOver' || gameState.status === 'celebrating') && gameState.winner === 1;
    const p1Active = gameState.currentPlayer === 1 && (gameState.status === 'aiming' || gameState.status === 'throwing');
    const p2Active = gameState.currentPlayer === 2 && (gameState.status === 'aiming' || gameState.status === 'throwing');

    const p1HasUmbrella = gameState.status === 'meteorShower' && gameState.meteorShower?.protectedPlayer === 1;
    const p2HasUmbrella = gameState.status === 'meteorShower' && gameState.meteorShower?.protectedPlayer === 2;

    drawMonkey(gameState.player1Pos, '#FFB84D', p1Throwing, true, p1Winner, p1Dead, p1Active, p1HasUmbrella, gameState.p1GroundTurns, gameState.p1Struggling);
    drawMonkey(gameState.player2Pos, '#FFB84D', p2Throwing, false, p2Winner, p2Dead, p2Active, p2HasUmbrella, gameState.p2GroundTurns, gameState.p2Struggling);

    // Draw Banana
    if (gameState.banana) {
      const drawProjectile = (x: number, y: number, angle: number, type: ProjectileType) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        
        if (type === 'giant') {
          // Draw Golden Sun for 10x
          const time = Date.now() / 100;
          const pulse = Math.sin(time) * 5;
          
          ctx.fillStyle = '#FFD700';
          ctx.shadowBlur = 25 + pulse;
          ctx.shadowColor = '#FFD700';
          
          // Outer glow circle
          ctx.beginPath();
          ctx.arc(0, 0, 18 + pulse / 2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
          ctx.fill();
          
          // Core
          ctx.beginPath();
          ctx.arc(0, 0, 14, 0, Math.PI * 2);
          ctx.fillStyle = '#FFD700';
          ctx.fill();
          
          // Rays with flickering length
          ctx.strokeStyle = '#FFD700';
          ctx.lineWidth = 3;
          for (let i = 0; i < 12; i++) {
            const a = (i * Math.PI) / 6 + time * 0.5;
            const rayLen = 20 + Math.random() * 15 + pulse;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * 16, Math.sin(a) * 16);
            ctx.lineTo(Math.cos(a) * rayLen, Math.sin(a) * rayLen);
            ctx.stroke();
          }
          
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 10px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('10X', 0, 4);
        } else if (type === 'acid') {
          // Draw Acid Bottle
          const time = Date.now() / 100;
          const shake = Math.sin(time * 10) * 1;
          
          ctx.translate(shake, 0);
          
          // Bottle body
          ctx.fillStyle = '#00FF00';
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#00FF00';
          ctx.beginPath();
          ctx.roundRect(-5, -7, 10, 14, 2);
          ctx.fill();
          
          // Liquid inside (darker green)
          ctx.fillStyle = '#008800';
          const liquidLevel = Math.sin(time * 2) * 2 + 2;
          ctx.fillRect(-5, liquidLevel - 7, 10, 14 - liquidLevel);
          
          // Label
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(-4, -2, 8, 5);
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 4px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('☠', 0, 2);
          
          // Bottle neck
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(-3, -10, 6, 3);
          
          // Acid Bubbles/Drips
          ctx.fillStyle = '#00FF00';
          for (let i = 0; i < 3; i++) {
            const bx = Math.sin(time + i) * 8;
            const by = 10 + (time * 10 + i * 10) % 20;
            ctx.beginPath();
            ctx.arc(bx, by, 2, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.shadowBlur = 0;
        } else {
          // Normal Banana
          ctx.beginPath();
          ctx.strokeStyle = '#FFFF55';
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.arc(0, 0, 6, 0.1 * Math.PI, 0.9 * Math.PI);
          ctx.stroke();
          
          // Stem
          ctx.fillStyle = '#8B4513';
          ctx.save();
          ctx.rotate(0.1 * Math.PI);
          ctx.fillRect(5, -1, 3, 2);
          ctx.restore();
        }
        
        ctx.restore();
      };

      // Draw spinning projectiles (2 for normal/giant/acid)
      const offset = gameState.banana.type === 'giant' ? 15 : 6;
      drawProjectile(
        gameState.banana.pos.x + Math.cos(gameState.banana.angle) * offset,
        gameState.banana.pos.y + Math.sin(gameState.banana.angle) * offset,
        gameState.banana.angle * 2,
        gameState.banana.type
      );
      drawProjectile(
        gameState.banana.pos.x - Math.cos(gameState.banana.angle) * offset,
        gameState.banana.pos.y - Math.sin(gameState.banana.angle) * offset,
        gameState.banana.angle * 2 + Math.PI,
        gameState.banana.type
      );

      // Trail
      ctx.strokeStyle = gameState.banana.type === 'acid' ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      gameState.banana.trail.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }

    // Draw Explosion
    if (gameState.explosion) {
      if (gameState.explosion.type === 'acid') {
        // Corrosion/Melting effect: Greenish bubbles
        ctx.fillStyle = '#00FF00';
        ctx.beginPath();
        ctx.arc(gameState.explosion.pos.x, gameState.explosion.pos.y, gameState.explosion.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Bubbles inside
        ctx.fillStyle = '#CCFF00';
        const bubbleCount = 8;
        for (let i = 0; i < bubbleCount; i++) {
          const angle = (i / bubbleCount) * Math.PI * 2 + (gameState.explosion.radius * 0.1);
          const dist = (gameState.explosion.radius * 0.5) * (1 + Math.sin(gameState.explosion.radius * 0.2 + i));
          const bx = gameState.explosion.pos.x + Math.cos(angle) * dist;
          const by = gameState.explosion.pos.y + Math.sin(angle) * dist;
          const br = (gameState.explosion.radius * 0.2) * (0.5 + Math.abs(Math.cos(gameState.explosion.radius * 0.1 + i)));
          ctx.beginPath();
          ctx.arc(bx, by, br, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = '#FF5555';
        ctx.beginPath();
        ctx.arc(gameState.explosion.pos.x, gameState.explosion.pos.y, gameState.explosion.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFF55';
        ctx.beginPath();
        ctx.arc(gameState.explosion.pos.x, gameState.explosion.pos.y, gameState.explosion.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (gameState.shake > 0) {
      ctx.restore();
    }

    // Draw Wind Indicator
    const windX = CANVAS_WIDTH / 2;
    const windY = CANVAS_HEIGHT - 30;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(windX - 50, windY);
    ctx.lineTo(windX + 50, windY);
    ctx.stroke();
    
    ctx.fillStyle = '#FF5555';
    const windPower = gameState.wind * 500;
    ctx.fillRect(windX, windY - 5, windPower, 10);

  }, [gameState]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    const y = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
    
    setGameState(prev => {
      if (!prev || prev.status !== 'aiming') return prev;

      // Control area restriction
      if (prev.currentPlayer === 1 && x > CANVAS_WIDTH / 2) {
        setMessage("玩家一只能觸控左半邊螢幕！");
        setTimeout(() => setMessage(`${prev.playerNames[0]} 的回合`), 1500);
        return prev;
      }
      if (prev.currentPlayer === 2 && x < CANVAS_WIDTH / 2) {
        setMessage("玩家二只能觸控右半邊螢幕！");
        setTimeout(() => setMessage(`${prev.playerNames[1]} 的回合`), 1500);
        return prev;
      }

      soundService.playPull();

      return {
        ...prev,
        dragStart: { x, y },
        dragCurrent: { x, y }
      };
    });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    const y = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);

    setGameState(prev => {
      if (!prev) return null;

      if (prev.status === 'aiming' && prev.dragStart) {
        // Restrict drag current to their side
        let finalX = x;
        if (prev.currentPlayer === 1) {
          finalX = Math.min(x, CANVAS_WIDTH / 2);
        } else {
          finalX = Math.max(x, CANVAS_WIDTH / 2);
        }

        return {
          ...prev,
          dragCurrent: { x: finalX, y }
        };
      }

      // Handle cursor style
      const distToSun = Math.sqrt((x - prev.sunPos.x) ** 2 + (y - prev.sunPos.y) ** 2);
      if (distToSun < 35) {
        canvas.style.cursor = 'pointer';
      } else {
        canvas.style.cursor = 'default';
      }
      
      return prev;
    });
  };

  const handleCanvasMouseUp = (e?: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setGameState(prev => {
      if (!prev || prev.status !== 'aiming' || !prev.dragStart || !prev.dragCurrent) return prev;

      const dx = prev.dragCurrent.x - prev.dragStart.x;
      const dy = prev.dragCurrent.y - prev.dragStart.y;
      
      const angleRad = Math.atan2(dy, prev.currentPlayer === 1 ? -dx : dx);
      let angleDeg = angleRad * (180 / Math.PI);
      
      const dist = Math.sqrt(dx * dx + dy * dy);
      const velocity = Math.min(dist * 2.55, 255);

      if (velocity > 10) {
        // We can't call handleThrow directly here because it also calls setGameState.
        // Instead, we perform the throw logic here or use a separate effect.
        // For simplicity, let's trigger the throw by returning the new state.
        
        const rad = (prev.currentPlayer === 1 ? -angleDeg : angleDeg + 180) * (Math.PI / 180);
        const vx = Math.cos(rad) * (velocity / 8);
        const vy = Math.sin(rad) * (velocity / 8);

        const startPos = prev.currentPlayer === 1 ? { ...prev.player1Pos } : { ...prev.player2Pos };
        const currentWeapon = prev.currentPlayer === 1 ? prev.player1Projectile : prev.player2Projectile;
        
        return {
          ...prev,
          status: 'throwing',
          roundCount: prev.roundCount + 1,
          throwStartTime: Date.now(),
          dragStart: null,
          dragCurrent: null,
          player1Projectile: prev.currentPlayer === 1 ? 'normal' : prev.player1Projectile,
          player2Projectile: prev.currentPlayer === 2 ? 'normal' : prev.player2Projectile,
          banana: {
            pos: startPos,
            vel: { x: vx, y: vy },
            trail: [startPos],
            angle: 0,
            type: currentWeapon,
            hasHitSun: false,
          },
        };
      } else {
        return {
          ...prev,
          dragStart: null,
          dragCurrent: null
        };
      }
    });
  };

  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const touch = e.touches[0];
    const x = (touch.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    const y = (touch.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
    
    setGameState(prev => {
      if (!prev || prev.status !== 'aiming') return prev;

      // Control area restriction
      if (prev.currentPlayer === 1 && x > CANVAS_WIDTH / 2) {
        setMessage("玩家一只能觸控左半邊螢幕！");
        setTimeout(() => setMessage(`${prev.playerNames[0]} 的回合`), 1500);
        return prev;
      }
      if (prev.currentPlayer === 2 && x < CANVAS_WIDTH / 2) {
        setMessage("玩家二只能觸控右半邊螢幕！");
        setTimeout(() => setMessage(`${prev.playerNames[1]} 的回合`), 1500);
        return prev;
      }

      soundService.playPull();

      return {
        ...prev,
        dragStart: { x, y },
        dragCurrent: { x, y }
      };
    });
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = (touch.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    const y = (touch.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);

    setGameState(prev => {
      if (!prev) return null;

      if (prev.status === 'aiming' && prev.dragStart) {
        // Restrict drag current to their side
        let finalX = x;
        if (prev.currentPlayer === 1) {
          finalX = Math.min(x, CANVAS_WIDTH / 2);
        } else {
          finalX = Math.max(x, CANVAS_WIDTH / 2);
        }

        return {
          ...prev,
          dragCurrent: { x: finalX, y }
        };
      }
      return prev;
    });
  };

  const handleCanvasTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    handleCanvasMouseUp(e);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-0 md:p-4 bg-[#0000AA]">
      <div 
        ref={gameContainerRef} 
        className={`game-container relative bg-black md:border-4 border-[#AAAAAA] shadow-2xl overflow-hidden ${isFullscreen || isPseudoFullscreen ? 'pseudo-fullscreen' : ''}`}
      >
        <div className="game-content relative w-full h-full flex flex-col items-center justify-center">
          {/* Header / Scores & Controls */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-20 pointer-events-none">
          {/* Player 1 Side */}
          <div className="flex items-start gap-2">
            <div className="bg-black/80 p-2 border-2 border-white pointer-events-auto flex flex-col items-center">
              <div className="text-[10px] uppercase opacity-70 leading-none mb-1">{gameState?.playerNames[0] || '玩家 1'}</div>
              <div className="text-xl font-bold text-yellow-400 leading-none mb-2">{gameState?.scores[0]}</div>
              {gameState?.status === 'aiming' && gameState.currentPlayer === 1 && (
                <div className={`text-2xl font-black mb-2 animate-pulse ${gameState.turnTimeLeft <= 3 ? 'text-red-500' : 'text-white'}`}>
                  {gameState.turnTimeLeft}
                </div>
              )}
              {gameState && (
                <div className={`text-[10px] px-1 font-bold ${gameState.player1Projectile !== 'normal' ? 'bg-yellow-400 text-black animate-pulse' : 'bg-white/20 text-white'}`}>
                  {gameState.player1Projectile === 'giant' ? '十倍大香蕉' : gameState.player1Projectile === 'acid' ? '硫酸瓶' : gameState.player1Projectile === 'beam' ? '導引光束' : gameState.player1Projectile === 'meteor' ? '火熱隕石' : '香蕉'}
                </div>
              )}
              {gameState && (
                <div className="mt-1 text-[10px] bg-blue-600/40 text-white px-1 font-bold border-t border-white/20 pt-1">
                  本回合得分: {gameState.currentRoundPoints[0]}
                </div>
              )}
            </div>
          </div>

          {/* Player 2 Side */}
          <div className="flex items-start gap-2">
            <div className="bg-black/80 p-2 border-2 border-white text-right pointer-events-auto flex flex-col items-center">
              <div className="text-[10px] uppercase opacity-70 leading-none mb-1">{gameState?.playerNames[1] || '玩家 2'}</div>
              <div className="text-xl font-bold text-yellow-400 leading-none mb-2">{gameState?.scores[1]}</div>
              {gameState?.status === 'aiming' && gameState.currentPlayer === 2 && (
                <div className={`text-2xl font-black mb-2 animate-pulse ${gameState.turnTimeLeft <= 3 ? 'text-red-500' : 'text-white'}`}>
                  {gameState.turnTimeLeft}
                </div>
              )}
              {gameState && (
                <div className={`text-[10px] px-1 font-bold inline-block ${gameState.player2Projectile !== 'normal' ? 'bg-yellow-400 text-black animate-pulse' : 'bg-white/20 text-white'}`}>
                  {gameState.player2Projectile === 'giant' ? '十倍大香蕉' : gameState.player2Projectile === 'acid' ? '硫酸瓶' : gameState.player2Projectile === 'beam' ? '導引光束' : gameState.player2Projectile === 'meteor' ? '火熱隕石' : '香蕉'}
                </div>
              )}
              {gameState && (
                <div className="mt-1 text-[10px] bg-blue-600/40 text-white px-1 font-bold border-t border-white/20 pt-1">
                  本回合得分: {gameState.currentRoundPoints[1]}
                </div>
              )}
            </div>
            {/* Fullscreen toggle during game */}
            <button 
              onClick={toggleFullscreen}
              className="bg-black/80 p-2 border-2 border-white text-white pointer-events-auto hover:bg-white/20 transition-colors flex items-center justify-center"
              title={isFullscreen ? '退出全螢幕' : '全螢幕'}
            >
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
          </div>
        </div>

          {/* Game Canvas */}
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onTouchStart={handleCanvasTouchStart}
            onTouchMove={handleCanvasTouchMove}
            onTouchEnd={handleCanvasTouchEnd}
            className="max-w-full h-auto touch-none"
          />

          {/* Wind Indicator at Bottom Center */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
            <div className="bg-black/80 px-4 py-1 border-2 border-white rounded-full flex items-center gap-2 text-xs font-bold">
              <Wind size={14} className="text-blue-400" />
              風向: {Math.abs((gameState?.wind || 0) * 1000).toFixed(0)} { (gameState?.wind || 0) > 0 ? '→' : '←' }
            </div>
          </div>

          <AnimatePresence>
          {showStartScreen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0000AA] z-50 flex flex-col items-center justify-start md:justify-center p-4 md:p-8 overflow-y-auto"
            >
              <div className="relative mb-4 md:mb-12 mt-4 md:mt-0">
                <BananaOrbit />
                <motion.h1 
                  initial={{ y: -50, scale: 0.5 }}
                  animate={{ y: 0, scale: 1 }}
                  className="text-5xl md:text-9xl font-bold text-yellow-400 drop-shadow-[0_4px_0_rgba(0,0,0,1)] md:drop-shadow-[0_8px_0_rgba(0,0,0,1)] text-center relative z-10"
                >
                  猴子丟香蕉
                </motion.h1>
              </div>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleStartGame}
                className="retro-button text-2xl md:text-4xl px-8 md:px-12 py-4 md:py-6 mb-4 md:mb-12"
              >
                開始遊戲
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleMute}
                className="retro-button flex items-center gap-3 px-6 md:px-8 py-3 md:py-4 mb-4 md:mb-12 text-sm md:text-base"
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                {isMuted ? '音效: 關閉' : '音效: 開啟'}
              </motion.button>

              <div className="flex flex-col md:flex-row gap-4 md:gap-8 mb-4 md:mb-12 w-full max-w-2xl px-4">
                <div className="flex-1 flex flex-col gap-1 md:gap-2">
                  <label className="text-[10px] md:text-sm uppercase opacity-70 text-center">玩家一 名稱</label>
                  <input
                    type="text"
                    value={p1NameInput}
                    onChange={(e) => setP1NameInput(e.target.value)}
                    placeholder="玩家一"
                    className="retro-input w-full text-center text-lg md:text-xl"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1 md:gap-2">
                  <label className="text-[10px] md:text-sm uppercase opacity-70 text-center">玩家二 名稱</label>
                  <input
                    type="text"
                    value={p2NameInput}
                    onChange={(e) => setP2NameInput(e.target.value)}
                    placeholder="玩家二"
                    className="retro-input w-full text-center text-lg md:text-xl"
                  />
                </div>
              </div>

              <div className="mt-auto w-full flex flex-col items-center gap-2 md:gap-4 pb-8 md:pb-0">
                <div className="flex flex-col items-center gap-1 md:gap-2">
                  <label className="text-[10px] md:text-sm uppercase opacity-70">重力值設定</label>
                  <div className="flex items-center gap-2 md:gap-3">
                    <input
                      type="number"
                      step="0.1"
                      value={gravityInput}
                      onChange={(e) => setGravityInput(e.target.value)}
                      placeholder="預設地球Ｇ=9.8"
                      className="retro-input w-32 md:w-48 text-center text-lg md:text-xl"
                    />
                    <span className="text-lg md:text-xl opacity-50">m/s²</span>
                  </div>
                </div>

                <button
                  onClick={toggleFullscreen}
                  className="retro-button text-xs md:text-sm px-4 md:px-6 py-2 mt-2 md:mt-4"
                >
                  {isFullscreen ? '退出全螢幕' : '全螢幕'}
                </button>
              </div>

              <div className="absolute bottom-4 right-4 text-xs opacity-50 text-right">
                <div>ＡＮＴＹＥＨ修正</div>
                <div className="text-[10px] mt-1">v1.3.0</div>
              </div>
            </motion.div>
          )}

          {/* Orientation Hint for Mobile */}
          {isPortrait && (isFullscreen || isPseudoFullscreen) && (
            <div className="absolute inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-8 text-center pointer-events-none md:hidden">
              <motion.div
                animate={{ rotate: [0, 90, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="mb-4"
              >
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
              </motion.div>
              <p className="text-xl font-bold text-yellow-400">請旋轉裝置</p>
              <p className="text-sm opacity-70 mt-2">橫向畫面可獲得最佳遊戲體驗</p>
            </div>
          )}

          {gameState?.status === 'roundOver' && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-30"
            >
              <div className="bg-[#0000AA] p-10 border-8 border-white text-center shadow-2xl">
                <Trophy size={64} className="text-yellow-400 mx-auto mb-4" />
                <h2 className="text-4xl font-bold mb-2">轟隆！</h2>
                <p className="text-xl mb-2">
                  {gameState.winner === 1 ? gameState.playerNames[0] : gameState.playerNames[1]} 贏得本回合！
                </p>
                {gameState.winner !== gameState.currentPlayer && (
                  <p className="text-sm text-red-400 mb-6 italic">哎呀！打到自己了！</p>
                )}
                <div className="mb-8">
                  <div className="text-sm opacity-70 uppercase mb-2">本回合得分</div>
                  <div className="flex justify-center gap-8 mb-4">
                    <div className="text-center">
                      <div className="text-[10px] opacity-70">{gameState.playerNames[0]}</div>
                      <div className="text-2xl font-bold text-white">{gameState.currentRoundPoints[0]}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] opacity-70">{gameState.playerNames[1]}</div>
                      <div className="text-2xl font-bold text-white">{gameState.currentRoundPoints[1]}</div>
                    </div>
                  </div>
                  <div className="text-sm opacity-70 uppercase mb-2">目前總比分</div>
                  <div className="text-3xl font-bold text-yellow-400">
                    {gameState.scores[0]} : {gameState.scores[1]}
                  </div>
                </div>
                <button
                  onClick={() => initGame()}
                  className="retro-button flex items-center gap-2 mx-auto"
                >
                  <Play size={20} />
                  下一回合
                </button>
              </div>
            </motion.div>
          )}

          {gameState?.status === 'tournamentOver' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-[#0000AA] z-[60] overflow-y-auto py-12"
            >
              <div className="relative flex flex-col lg:flex-row items-center lg:items-start gap-12 max-w-6xl w-full px-8">
                {/* Left Side: Winner Info */}
                <div className="flex flex-col items-center flex-1">
                  {/* Gorilla on top of Trophy */}
                  <div className="mb-[-10px] z-10">
                     <BeatingGorilla color="#FFCC99" />
                  </div>
                  
                  {/* Trophy */}
                  <div className="relative">
                    <Trophy size={160} className="text-yellow-400 drop-shadow-2xl" />
                  </div>

                  <motion.h2 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-4xl md:text-6xl font-bold text-white mt-8 mb-4 drop-shadow-lg text-center"
                  >
                    恭喜贏家
                  </motion.h2>
                  
                  <motion.p 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="text-2xl md:text-3xl text-yellow-400 font-bold mb-8 text-center"
                  >
                    {gameState.tournamentWinner === 1 ? gameState.playerNames[0] : gameState.playerNames[1]} 統治了城市！
                  </motion.p>

                  {/* Round History Table */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="bg-black/40 border-2 border-white/30 p-4 mb-8 w-full max-w-md"
                  >
                    <h3 className="text-sm uppercase opacity-70 mb-4 text-center">每回合得分比較</h3>
                    <div className="grid grid-cols-3 gap-4 text-center border-b border-white/20 pb-2 mb-2">
                      <div className="text-[10px] uppercase opacity-50">回合</div>
                      <div className="text-xs font-bold truncate">{gameState.playerNames[0]}</div>
                      <div className="text-xs font-bold truncate">{gameState.playerNames[1]}</div>
                    </div>
                    <div className="max-h-40 overflow-y-auto custom-scrollbar">
                      {gameState.roundHistory.p1.map((p1Score, idx) => (
                        <div key={idx} className="grid grid-cols-3 gap-4 text-center py-1 border-b border-white/5 last:border-0">
                          <div className="text-xs opacity-50">{idx + 1}</div>
                          <div className={`text-sm ${p1Score > gameState.roundHistory.p2[idx] ? 'text-yellow-400 font-bold' : 'text-white'}`}>
                            {p1Score}
                          </div>
                          <div className={`text-sm ${gameState.roundHistory.p2[idx] > p1Score ? 'text-yellow-400 font-bold' : 'text-white'}`}>
                            {gameState.roundHistory.p2[idx]}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center pt-2 mt-2 border-t border-white/20 font-bold">
                      <div className="text-xs uppercase opacity-50">總計</div>
                      <div className="text-yellow-400">{gameState.roundHistory.p1.reduce((a, b) => a + b, 0)}</div>
                      <div className="text-yellow-400">{gameState.roundHistory.p2.reduce((a, b) => a + b, 0)}</div>
                    </div>
                  </motion.div>

                  <button
                    onClick={handleResetToStart}
                    className="retro-button text-xl md:text-2xl px-8 md:px-12 py-4 md:py-6"
                  >
                    重新開始新賽局
                  </button>
                </div>

                {/* Right Side: Hero Board (Leaderboard) */}
                <motion.div 
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 1.2 }}
                  className="flex-1 w-full max-w-md bg-black/50 border-4 border-yellow-400 p-6 shadow-[0_0_20px_rgba(250,204,21,0.3)]"
                >
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <Medal className="text-yellow-400" size={32} />
                    <h3 className="text-3xl font-black text-white italic tracking-tighter">英雄榜</h3>
                  </div>

                  <div className="space-y-3">
                    {(() => {
                      const displayBoard = leaderboard.length > 0 ? leaderboard : DEFAULT_LEADERBOARD;
                      return displayBoard.map((entry, idx) => (
                        <div 
                          key={entry.id} 
                          className={`flex items-center justify-between p-3 border-2 ${idx === 0 ? 'bg-yellow-400/20 border-yellow-400' : 'bg-white/5 border-white/20'}`}
                        >
                          <div className="flex items-center gap-4">
                            <span className={`text-xl font-black w-6 ${idx === 0 ? 'text-yellow-400' : 'text-white/50'}`}>{idx + 1}</span>
                            <span className="text-lg font-bold text-white truncate max-w-[180px]">{entry.name}</span>
                          </div>
                          <span className="text-2xl font-black text-yellow-400 font-mono">{entry.score}</span>
                        </div>
                      ));
                    })()}
                  </div>

                  <div className="mt-8 pt-6 border-t border-white/20 text-center">
                    <p className="text-[10px] uppercase tracking-widest opacity-50">只有最強的猩猩才能名留青史</p>
                  </div>
                </motion.div>
              </div>

              {/* High Score Entry Modal */}
              <AnimatePresence>
                {showScoreEntry && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
                  >
                    <motion.div 
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      className="bg-[#0000AA] border-8 border-white p-8 max-w-md w-full shadow-2xl text-center"
                    >
                      <Medal size={48} className="text-yellow-400 mx-auto mb-4 animate-bounce" />
                      <h2 className="text-3xl font-bold mb-2">榮登英雄榜！</h2>
                      <p className="text-lg mb-6">恭喜獲得 <span className="text-yellow-400 font-bold">{pendingScore?.score}</span> 分</p>
                      
                      <div className="space-y-4 mb-8">
                        <p className="text-sm opacity-70">請輸入您的個人資料：</p>
                        <div className="flex gap-2 justify-center items-center">
                          <div className="flex flex-col gap-1">
                            <input 
                              type="number" 
                              placeholder="年級" 
                              value={gradeInput}
                              onChange={(e) => setGradeInput(e.target.value)}
                              className="retro-input w-20 text-center text-xl"
                            />
                            <span className="text-[10px] opacity-50">年級</span>
                          </div>
                          <span className="text-xl font-bold">-</span>
                          <div className="flex flex-col gap-1">
                            <input 
                              type="number" 
                              placeholder="班級" 
                              value={classInput}
                              onChange={(e) => setClassInput(e.target.value)}
                              className="retro-input w-20 text-center text-xl"
                            />
                            <span className="text-[10px] opacity-50">班級</span>
                          </div>
                          <span className="text-xl font-bold">-</span>
                          <div className="flex flex-col gap-1">
                            <input 
                              type="number" 
                              placeholder="座號" 
                              value={numberInput}
                              onChange={(e) => setNumberInput(e.target.value)}
                              className="retro-input w-20 text-center text-xl"
                            />
                            <span className="text-[10px] opacity-50">座號</span>
                          </div>
                        </div>
                        
                        {submissionError && (
                          <p className="text-red-400 text-sm font-bold animate-pulse">{submissionError}</p>
                        )}
                      </div>

                      <div className="flex flex-col gap-3">
                        <button
                          onClick={submitHighScore}
                          disabled={!gradeInput || !classInput || !numberInput || isSubmitting}
                          className="retro-button w-full flex items-center justify-center gap-2 py-4 disabled:opacity-50"
                        >
                          {isSubmitting ? '傳送中...' : <><Send size={20} /> 登錄英雄榜</>}
                        </button>
                        
                        {!isSubmitting && (
                          <button 
                            onClick={() => {
                              setShowScoreEntry(false);
                              setPendingScore(null);
                              setSubmissionError(null);
                            }}
                            className="text-white/50 hover:text-white text-sm underline"
                          >
                            暫不登錄
                          </button>
                        )}
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>

      <div className="mt-8 text-center max-w-lg">
        <p className="text-sm opacity-60 leading-relaxed">
          啟發自 1991 年 QBASIC 經典遊戲。調整角度與力量來擊中對手的猩猩。 
          注意風向與重力的影響！
        </p>
      </div>
    </div>
  );
}
