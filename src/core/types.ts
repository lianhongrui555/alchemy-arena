export type Side = 'player' | 'enemy';
export type Lane = 'top' | 'bottom';
export type CardType = 'unit' | 'building' | 'spell' | 'trap' | 'catalyst';
export type BattleCardType = Exclude<CardType, 'catalyst'>;
export type FusionDirection = 'combat' | 'mystic';
export type TargetMode = 'none' | 'ground' | 'area' | 'lane';
export type MovementMode = 'ground' | 'air';
export type TargetMask = 'ground' | 'air' | 'both';

export interface EffectSpec {
  kind: 'damage' | 'heal' | 'slow' | 'dot' | 'speed';
  value: number;
  duration?: number;
  radius?: number;
}

export interface UnitStats {
  maxHp: number;
  damage: number;
  range: number;
  attackInterval: number;
  speed: number;
  radius: number;
  movement: MovementMode;
  targets: TargetMask;
  attackEffects?: EffectSpec[];
  deployEffects?: EffectSpec[];
  deathEffects?: EffectSpec[];
  splashRadius?: number;
  chargeDistance?: number;
  chargeMultiplier?: number;
  lifetime?: number;
  spawnCount?: number;
  healPerSecond?: number;
  healRadius?: number;
}

export interface SpellSpec {
  radius: number;
  effects: EffectSpec[];
}

export interface TrapSpec {
  triggerRadius: number;
  radius: number;
  effects: EffectSpec[];
  lifetime: number;
}

export interface CatalystSpec {
  direction: FusionDirection;
}

export interface CardDefinition {
  id: string;
  name: string;
  type: CardType;
  tags: string[];
  cost: number;
  power: number;
  targeting: TargetMode;
  artKey: string;
  effectId: string;
  description: string;
  stats?: UnitStats;
  spell?: SpellSpec;
  trap?: TrapSpec;
  catalyst?: CatalystSpec;
}

export interface FusionResult {
  id: string;
  name: string;
  type: BattleCardType;
  tags: string[];
  cost: number;
  powerScore: number;
  targeting: TargetMode;
  artKey: string;
  effectId: string;
  description: string;
  direction: FusionDirection;
  sourceCardIds: [string, string];
  signature: boolean;
  stats?: UnitStats;
  spell?: SpellSpec;
  trap?: TrapSpec;
}

export type PlayableCard = CardDefinition | FusionResult;

export interface StageConfig {
  id: number;
  name: string;
  subtitle: string;
  aiName: string;
  statMultiplier: number;
  elixirMultiplier: number;
  reactionMin: number;
  reactionMax: number;
  deck: string[];
  usesCatalysts: boolean;
  usesTraps: boolean;
  difficultyLabel: string;
}

export interface SaveV1 {
  version: 1;
  unlockedCardIds: string[];
  deckCardIds: string[];
  clearedStageIds: number[];
  settings: {
    musicVolume: number;
    sfxVolume: number;
  };
}

export interface TowerState {
  id: string;
  side: Side;
  lane: 'king' | Lane;
  x: number;
  y: number;
  maxHp: number;
  hp: number;
  damage: number;
  range: number;
  attackInterval: number;
  attackCooldown: number;
  alive: boolean;
}

export interface UnitState {
  id: number;
  owner: Side;
  cardId: string;
  name: string;
  lane: Lane;
  x: number;
  y: number;
  maxHp: number;
  hp: number;
  damage: number;
  range: number;
  attackInterval: number;
  attackCooldown: number;
  speed: number;
  radius: number;
  movement: MovementMode;
  targets: TargetMask;
  attackEffects: EffectSpec[];
  deathEffects: EffectSpec[];
  splashRadius: number;
  chargeDistance: number;
  chargeMultiplier: number;
  chargeProgress: number;
  lifetime?: number;
  age: number;
  alive: boolean;
  statuses: ActiveStatus[];
  isBuilding: boolean;
  healPerSecond?: number;
  healRadius?: number;
}

export interface ActiveStatus {
  kind: 'slow' | 'dot' | 'speed';
  value: number;
  remaining: number;
  sourceId: number;
}

export interface TrapState {
  id: number;
  owner: Side;
  cardId: string;
  lane: Lane;
  x: number;
  y: number;
  triggerRadius: number;
  radius: number;
  effects: EffectSpec[];
  lifetime: number;
  age: number;
  alive: boolean;
}

export interface BattleEvent {
  type:
    | 'deploy'
    | 'attack'
    | 'spell'
    | 'trap-trigger'
    | 'unit-died'
    | 'tower-damaged'
    | 'tower-destroyed'
    | 'battle-ended';
  side?: Side;
  x?: number;
  y?: number;
  targetX?: number;
  targetY?: number;
  unitId?: number;
  cardId?: string;
  text?: string;
}

export interface BattleSnapshot {
  elapsed: number;
  timeLeft: number;
  overtime: boolean;
  playerElixir: number;
  enemyElixir: number;
  towers: TowerState[];
  units: UnitState[];
  traps: TrapState[];
  result: BattleResult | null;
}

export interface BattleResult {
  winner: Side | 'draw';
  reason: 'king-destroyed' | 'time' | 'health';
  playerCrowns: number;
  enemyCrowns: number;
}
