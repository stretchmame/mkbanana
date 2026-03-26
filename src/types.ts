/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Point {
  x: number;
  y: number;
}

export type ParticleType = 'smoke' | 'spark' | 'debris' | 'normal';

export interface Particle {
  id: number;
  pos: Point;
  vel: Point;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  sparkle?: boolean;
  type?: ParticleType;
  rotation?: number;
  rotationVel?: number;
}

export interface Building {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  windows: boolean[][];
}

export interface Destruction {
  pos: Point;
  radius: number;
}

export type ProjectileType = 'normal' | 'giant' | 'acid' | 'beam' | 'meteor';

export interface Treasure {
  id: number;
  pos: Point;
  type: 'giant' | 'acid' | 'beam' | 'meteor';
  active: boolean;
}

export interface Meteor {
  id: number;
  pos: Point;
  vel: Point;
}

export interface MeteorShower {
  centerX: number;
  startTime: number;
  duration: number;
  meteors: Meteor[];
  protectedPlayer?: 1 | 2;
}

export interface GameState {
  player1Pos: Point;
  player2Pos: Point;
  sunPos: Point;
  sunState: 'normal' | 'surprised' | 'sunglasses' | 'dead' | 'skull' | 'falling';
  sunHits: number;
  buildings: Building[];
  destructions: Destruction[];
  particles: Particle[];
  shake: number;
  currentPlayer: 1 | 2;
  wind: number;
  scores: [number, number];
  playerNames: [string, string];
  gravity: number;
  status: 'aiming' | 'throwing' | 'exploding' | 'celebrating' | 'roundOver' | 'tournamentOver' | 'meteorShower';
  winner?: number;
  tournamentWinner?: number;
  roundCount: number;
  throwStartTime?: number;
  dragStart: Point | null;
  dragCurrent: Point | null;
  treasures: Treasure[];
  player1Projectile: ProjectileType;
  player2Projectile: ProjectileType;
  meteorShower?: MeteorShower;
  roundHistory: { p1: number[], p2: number[] };
  currentRoundPoints: [number, number];
  p1GroundTurns: number;
  p2GroundTurns: number;
  p1Struggling: boolean;
  p2Struggling: boolean;
  turnTimeLeft: number;
  banana?: {
    pos: Point;
    vel: Point;
    trail: Point[];
    angle: number;
    type: ProjectileType;
    hasHitSun?: boolean;
  };
  explosion?: {
    pos: Point;
    radius: number;
    maxRadius: number;
    type: ProjectileType;
  };
}

export const GRAVITY = 0.25;
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const MONKEY_SIZE = 24;
