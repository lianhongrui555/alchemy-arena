import { getCard } from '../data/cards';
import type { StageConfig } from './types';
import { ARENA, BATTLE_RULES, DEPLOY_MARGIN, TOWER_POSITIONS } from './constants';
import { DeckSystem } from './DeckSystem';
import type {
  ActiveStatus,
  BattleEvent,
  BattleResult,
  BattleSnapshot,
  CardDefinition,
  EffectSpec,
  FusionDirection,
  FusionResult,
  Lane,
  PlayableCard,
  Side,
  TowerState,
  TrapState,
  UnitState,
} from './types';

interface TargetRef {
  kind: 'unit' | 'tower';
  id: string;
  x: number;
  y: number;
  radius: number;
  movement: 'ground' | 'air';
}

export interface BattleSimulationOptions {
  regularSeconds?: number;
  overtimeSeconds?: number;
  startingElixir?: number;
  playerElixirMultiplier?: number;
  enemyElixirMultiplier?: number;
  enemyStatMultiplier?: number;
}

export class BattleSimulation {
  readonly towers: TowerState[];
  readonly units: UnitState[] = [];
  readonly traps: TrapState[] = [];
  readonly events: BattleEvent[] = [];
  readonly playerDeck: DeckSystem;
  readonly enemyDeck: DeckSystem;
  readonly stage: StageConfig;
  readonly options: Required<BattleSimulationOptions>;

  private elixir: Record<Side, number> = { player: 5, enemy: 5 };
  private nextEntityId = 1;
  private elapsedSeconds = 0;
  private result: BattleResult | null = null;
  private overtime = false;
  private crowns: Record<Side, number> = { player: 0, enemy: 0 };
  private pendingFusion: Record<Side, FusionResult | null> = { player: null, enemy: null };
  private fusionBias: Record<Side, FusionDirection | null> = { player: null, enemy: null };

  constructor(
    stage: StageConfig,
    playerDeckIds: string[],
    enemyDeckIds: string[] = stage.deck,
    options: BattleSimulationOptions = {},
  ) {
    this.stage = stage;
    this.options = {
      regularSeconds: options.regularSeconds ?? BATTLE_RULES.regularSeconds,
      overtimeSeconds: options.overtimeSeconds ?? BATTLE_RULES.overtimeSeconds,
      startingElixir: options.startingElixir ?? BATTLE_RULES.startingElixir,
      playerElixirMultiplier: options.playerElixirMultiplier ?? 1,
      enemyElixirMultiplier: options.enemyElixirMultiplier ?? stage.elixirMultiplier,
      enemyStatMultiplier: options.enemyStatMultiplier ?? stage.statMultiplier,
    };
    this.elixir = { player: this.options.startingElixir, enemy: this.options.startingElixir };
    this.playerDeck = new DeckSystem(playerDeckIds, BATTLE_RULES.handSize);
    this.enemyDeck = new DeckSystem(enemyDeckIds, BATTLE_RULES.handSize);
    this.towers = createTowers();
  }

  update(rawDeltaSeconds: number): void {
    if (this.result) return;
    const delta = Math.min(rawDeltaSeconds, 0.1);
    this.elapsedSeconds += delta;
    this.updateClock();
    if (this.result) return;
    this.updateElixir(delta);
    this.updateStatuses(delta);
    this.updateTraps(delta);
    this.updateUnits(delta);
    this.updateTowers(delta);
    this.checkEntityDeaths();
  }

  getSnapshot(): BattleSnapshot {
    return {
      elapsed: this.elapsedSeconds,
      timeLeft: this.getTimeLeft(),
      overtime: this.overtime,
      playerElixir: this.elixir.player,
      enemyElixir: this.elixir.enemy,
      towers: this.towers.map((tower) => ({ ...tower })),
      units: this.units.map((unit) => ({ ...unit, statuses: unit.statuses.map((status) => ({ ...status })) })),
      traps: this.traps.map((trap) => ({ ...trap })),
      result: this.result ? { ...this.result } : null,
    };
  }

  getElixir(side: Side): number { return this.elixir[side]; }
  getHand(side: Side): string[] { return (side === 'player' ? this.playerDeck : this.enemyDeck).copyHand(); }
  getNextCard(side: Side): string { return (side === 'player' ? this.playerDeck : this.enemyDeck).peekNext(); }
  getPendingFusion(side: Side): FusionResult | null { return this.pendingFusion[side] ? { ...this.pendingFusion[side] } : null; }
  getFusionBias(side: Side): FusionDirection | null { return this.fusionBias[side]; }
  canAfford(side: Side, cost: number): boolean { return this.elixir[side] + 0.0001 >= cost; }

  playHandCard(side: Side, handIndex: number, lane: Lane, x: number, y: number): boolean {
    const deck = side === 'player' ? this.playerDeck : this.enemyDeck;
    const cardId = deck.hand[handIndex];
    if (!cardId) return false;
    const card = getCard(cardId);
    if (!this.canAfford(side, card.cost)) return false;
    if (card.type === 'catalyst') return this.useCatalyst(side, handIndex);
    if (!this.isValidDeployment(side, card, lane, x, y)) return false;
    if (this.pendingFusion[side]) return false;
    deck.play(handIndex);
    this.elixir[side] -= card.cost;
    this.deployCard(side, card, lane, x, y);
    return true;
  }

  useCatalyst(side: Side, handIndex: number): boolean {
    const deck = side === 'player' ? this.playerDeck : this.enemyDeck;
    const cardId = deck.hand[handIndex];
    if (!cardId) return false;
    const card = getCard(cardId);
    if (card.type !== 'catalyst' || !card.catalyst || !this.canAfford(side, card.cost)) return false;
    deck.play(handIndex);
    this.elixir[side] -= card.cost;
    this.fusionBias[side] = card.catalyst.direction;
    this.emit({ type: 'spell', side, cardId, text: `${card.name}：下一次熔铸方向已锁定` });
    return true;
  }

  fuseCards(side: Side, handIndices: [number, number], result: FusionResult): boolean {
    if (this.pendingFusion[side] || handIndices[0] === handIndices[1]) return false;
    const deck = side === 'player' ? this.playerDeck : this.enemyDeck;
    const cards = handIndices.map((index) => deck.hand[index]);
    if (cards.some((id) => !id) || !this.canAfford(side, result.cost)) return false;
    deck.consume(handIndices);
    this.elixir[side] -= result.cost;
    this.pendingFusion[side] = result;
    this.fusionBias[side] = null;
    this.emit({ type: 'spell', side, cardId: result.id, text: `熔铸完成：${result.name}` });
    return true;
  }

  deployPendingFusion(side: Side, lane: Lane, x: number, y: number): boolean {
    const result = this.pendingFusion[side];
    if (!result || !this.isValidDeployment(side, result, lane, x, y)) return false;
    this.pendingFusion[side] = null;
    this.deployCard(side, result, lane, x, y);
    return true;
  }

  getDeployBounds(side: Side, lane: Lane): { left: number; right: number; top: number; bottom: number } {
    const laneY = lane === 'top' ? ARENA.topLaneY : ARENA.bottomLaneY;
    const laneHeight = 190;
    if (side === 'player') {
      const enemyGuard = this.towers.find((tower) => tower.side === 'enemy' && tower.lane === lane);
      const right = enemyGuard?.alive ? TOWER_POSITIONS.enemyTop.x - 72 : TOWER_POSITIONS.enemyKing.x - 80;
      return { left: ARENA.left + DEPLOY_MARGIN, right, top: Math.max(ARENA.top + 24, laneY - laneHeight), bottom: Math.min(ARENA.bottom - 24, laneY + laneHeight) };
    }
    const playerGuard = this.towers.find((tower) => tower.side === 'player' && tower.lane === lane);
    const left = playerGuard?.alive ? TOWER_POSITIONS.playerTop.x + 72 : TOWER_POSITIONS.playerKing.x + 80;
    return { left, right: ARENA.right - DEPLOY_MARGIN, top: Math.max(ARENA.top + 24, laneY - laneHeight), bottom: Math.min(ARENA.bottom - 24, laneY + laneHeight) };
  }

  getLaneForPosition(y: number): Lane { return y < (ARENA.topLaneY + ARENA.bottomLaneY) / 2 ? 'top' : 'bottom'; }

  private updateClock(): void {
    if (!this.overtime && this.elapsedSeconds >= this.options.regularSeconds) {
      if (this.crowns.player === this.crowns.enemy) {
        this.overtime = true;
        this.emit({ type: 'spell', text: '加时开始！圣水恢复速度翻倍' });
      } else {
        this.finish({ winner: this.crowns.player > this.crowns.enemy ? 'player' : 'enemy', reason: 'time', playerCrowns: this.crowns.player, enemyCrowns: this.crowns.enemy });
        return;
      }
    }
    if (this.overtime && this.elapsedSeconds >= this.options.regularSeconds + this.options.overtimeSeconds) {
      const playerHealth = this.totalTowerHealth('player');
      const enemyHealth = this.totalTowerHealth('enemy');
      const winner = playerHealth === enemyHealth ? 'draw' : playerHealth > enemyHealth ? 'player' : 'enemy';
      this.finish({ winner, reason: 'health', playerCrowns: this.crowns.player, enemyCrowns: this.crowns.enemy });
    }
  }

  private updateElixir(delta: number): void {
    const overtimeMultiplier = this.overtime ? 2 : 1;
    this.elixir.player = Math.min(BATTLE_RULES.maxElixir, this.elixir.player + (delta / BATTLE_RULES.elixirInterval) * overtimeMultiplier * this.options.playerElixirMultiplier);
    this.elixir.enemy = Math.min(BATTLE_RULES.maxElixir, this.elixir.enemy + (delta / BATTLE_RULES.elixirInterval) * overtimeMultiplier * this.options.enemyElixirMultiplier);
  }

  private updateStatuses(delta: number): void {
    for (const unit of this.units) {
      if (!unit.alive) continue;
      let dotDamage = 0;
      for (const status of unit.statuses) {
        status.remaining -= delta;
        if (status.kind === 'dot') dotDamage += status.value * delta;
      }
      if (dotDamage > 0) unit.hp -= dotDamage;
      unit.statuses = unit.statuses.filter((status) => status.remaining > 0);
      if (unit.hp <= 0) this.killUnit(unit);
    }
  }

  private updateTraps(delta: number): void {
    for (const trap of this.traps) {
      if (!trap.alive) continue;
      trap.age += delta;
      if (trap.age >= trap.lifetime) { trap.alive = false; continue; }
      const enemySide: Side = trap.owner === 'player' ? 'enemy' : 'player';
      const triggered = this.units.some((unit) => unit.alive && unit.owner === enemySide && unit.movement === 'ground' && distance(unit.x, unit.y, trap.x, trap.y) <= trap.triggerRadius + unit.radius);
      if (!triggered) continue;
      trap.alive = false;
      this.applyAreaEffects(trap.owner, trap.x, trap.y, trap.effects, trap.radius);
      this.emit({ type: 'trap-trigger', side: trap.owner, x: trap.x, y: trap.y, cardId: trap.cardId });
    }
  }

  private updateUnits(delta: number): void {
    for (const unit of this.units) {
      if (!unit.alive) continue;
      unit.age += delta;
      unit.attackCooldown = Math.max(0, unit.attackCooldown - delta);
      if (unit.lifetime !== undefined && unit.age >= unit.lifetime) { this.killUnit(unit); continue; }
      if (unit.isBuilding && unit.healPerSecond && unit.damage <= 0) {
        if (unit.attackCooldown <= 0) { this.healNearbyAllies(unit); unit.attackCooldown = unit.attackInterval; }
        continue;
      }
      const target = this.findTarget(unit);
      if (!target) continue;
      const currentDistance = distance(unit.x, unit.y, target.x, target.y);
      const attackDistance = unit.range + unit.radius + target.radius;
      if (currentDistance <= attackDistance) {
        if (unit.attackCooldown <= 0) { this.performAttack(unit, target); unit.attackCooldown = unit.attackInterval; }
        continue;
      }
      this.moveUnitTowardTarget(unit, target, delta);
    }
  }

  private updateTowers(delta: number): void {
    for (const tower of this.towers) {
      if (!tower.alive) continue;
      tower.attackCooldown = Math.max(0, tower.attackCooldown - delta);
      const enemySide: Side = tower.side === 'player' ? 'enemy' : 'player';
      const target = this.units
        .filter((unit) => unit.alive && unit.owner === enemySide)
        .map((unit) => ({ unit, dist: distance(tower.x, tower.y, unit.x, unit.y) }))
        .filter(({ unit, dist }) => dist <= tower.range + unit.radius)
        .sort((a, b) => a.dist - b.dist)[0]?.unit;
      if (!target || tower.attackCooldown > 0) continue;
      tower.attackCooldown = tower.attackInterval;
      this.damageUnit(target, tower.damage);
      this.emit({ type: 'attack', side: tower.side, x: tower.x, y: tower.y, targetX: target.x, targetY: target.y });
    }
  }

  private performAttack(unit: UnitState, target: TargetRef): void {
    let damage = unit.damage;
    if (unit.chargeDistance > 0 && unit.chargeProgress >= unit.chargeDistance) { damage *= unit.chargeMultiplier; unit.chargeProgress = 0; }
    if (target.kind === 'unit') {
      const targetUnit = this.units.find((item) => item.id === Number(target.id));
      if (!targetUnit?.alive) return;
      this.damageUnit(targetUnit, damage);
      for (const effect of unit.attackEffects) this.applyEffectToUnit(effect, targetUnit, unit.owner);
      if (unit.splashRadius > 0) this.applySplashDamage(unit.owner, targetUnit.x, targetUnit.y, damage, unit.splashRadius, targetUnit.id);
    } else {
      const tower = this.towers.find((item) => item.id === target.id);
      if (!tower?.alive) return;
      this.damageTower(tower, damage, unit.owner);
    }
    this.emit({ type: 'attack', side: unit.owner, unitId: unit.id, x: unit.x, y: unit.y, targetX: target.x, targetY: target.y });
  }

  private moveUnitTowardTarget(unit: UnitState, target: TargetRef, delta: number): void {
    let destinationX = target.x;
    let destinationY = target.y;
    if (unit.movement === 'ground') {
      const bridgeY = unit.lane === 'top' ? ARENA.topLaneY : ARENA.bottomLaneY;
      if (unit.owner === 'player') {
        if (unit.x < ARENA.riverLeft - unit.radius) destinationX = ARENA.riverLeft + unit.radius;
        else if (unit.x < ARENA.riverRight + unit.radius) destinationX = ARENA.riverRight + unit.radius;
      } else {
        if (unit.x > ARENA.riverRight + unit.radius) destinationX = ARENA.riverRight - unit.radius;
        else if (unit.x > ARENA.riverLeft - unit.radius) destinationX = ARENA.riverLeft - unit.radius;
      }
      destinationY = bridgeY;
      if (unit.x >= ARENA.riverLeft - unit.radius && unit.x <= ARENA.riverRight + unit.radius) {
        destinationX = unit.owner === 'player' ? ARENA.riverRight + unit.radius + 5 : ARENA.riverLeft - unit.radius - 5;
        destinationY = bridgeY;
      } else if ((unit.owner === 'player' && unit.x > ARENA.riverRight) || (unit.owner === 'enemy' && unit.x < ARENA.riverLeft)) {
        destinationX = target.x;
        destinationY = target.y;
      }
    }
    const dx = destinationX - unit.x;
    const dy = destinationY - unit.y;
    const length = Math.hypot(dx, dy);
    if (length < 0.5) return;
    const speedMultiplier = this.getSpeedMultiplier(unit);
    const step = Math.min(length, unit.speed * speedMultiplier * delta);
    unit.x += (dx / length) * step;
    unit.y += (dy / length) * step;
    if (unit.chargeDistance > 0 && unit.chargeProgress < unit.chargeDistance) unit.chargeProgress += step;
  }

  private getSpeedMultiplier(unit: UnitState): number {
    let slow = 0;
    let speedBoost = 0;
    for (const status of unit.statuses) {
      if (status.kind === 'slow') slow = Math.max(slow, status.value);
      if (status.kind === 'speed') speedBoost = Math.max(speedBoost, status.value);
    }
    return Math.max(0.25, 1 - slow + speedBoost);
  }

  private findTarget(unit: UnitState): TargetRef | null {
    const enemySide: Side = unit.owner === 'player' ? 'enemy' : 'player';
    const enemyUnits = this.units
      .filter((candidate) => candidate.alive && candidate.owner === enemySide && canTarget(unit.targets, candidate.movement))
      .map((candidate) => ({ candidate, dist: distance(unit.x, unit.y, candidate.x, candidate.y) }))
      .filter(({ candidate, dist }) => dist <= Math.max(unit.range + 180, 330) + candidate.radius)
      .sort((a, b) => a.dist - b.dist);
    if (enemyUnits[0]) {
      const target = enemyUnits[0].candidate;
      return { kind: 'unit', id: String(target.id), x: target.x, y: target.y, radius: target.radius, movement: target.movement };
    }
    const laneGuard = this.towers.find((tower) => tower.side === enemySide && tower.lane === unit.lane && tower.alive);
    if (laneGuard) return towerTarget(laneGuard);
    const king = this.towers.find((tower) => tower.side === enemySide && tower.lane === 'king' && tower.alive);
    return king ? towerTarget(king) : null;
  }

  private healNearbyAllies(unit: UnitState): void {
    const candidates = this.units
      .filter((candidate) => candidate.alive && candidate.owner === unit.owner && candidate.hp < candidate.maxHp)
      .map((candidate) => ({ candidate, dist: distance(unit.x, unit.y, candidate.x, candidate.y) }))
      .filter(({ candidate, dist }) => dist <= (unit.healRadius ?? unit.range) + candidate.radius)
      .sort((a, b) => a.candidate.hp / a.candidate.maxHp - b.candidate.hp / b.candidate.maxHp);
    const target = candidates[0]?.candidate;
    if (target) target.hp = Math.min(target.maxHp, target.hp + (unit.healPerSecond ?? 0));
  }

  private deployCard(side: Side, card: PlayableCard, lane: Lane, x: number, y: number): void {
    if (card.type === 'spell' && card.spell) {
      this.applyAreaEffects(side, x, y, card.spell.effects, card.spell.radius);
      this.emit({ type: 'spell', side, x, y, cardId: card.id });
      return;
    }
    if (card.type === 'trap' && card.trap) {
      this.traps.push({ id: this.nextEntityId++, owner: side, cardId: card.id, lane, x, y, triggerRadius: card.trap.triggerRadius, radius: card.trap.radius, effects: card.trap.effects.map((effect) => ({ ...effect })), lifetime: card.trap.lifetime, age: 0, alive: true });
      this.emit({ type: 'deploy', side, x, y, cardId: card.id });
      return;
    }
    const stats = card.stats;
    if (!stats) return;
    const statMultiplier = side === 'enemy' ? this.options.enemyStatMultiplier : 1;
    const spawnCount = stats.spawnCount ?? 1;
    const spread = spawnCount > 1 ? Math.min(72, 22 * (spawnCount - 1)) : 0;
    for (let index = 0; index < spawnCount; index += 1) {
      const offset = spawnCount === 1 ? 0 : -spread / 2 + (spread / (spawnCount - 1)) * index;
      const unit = this.createUnit(side, card.id, card.name, lane, x, y + offset, stats, statMultiplier);
      this.units.push(unit);
      if (stats.deployEffects?.length) this.applyAreaEffects(side, x, y, stats.deployEffects, Math.max(...stats.deployEffects.map((effect) => effect.radius ?? 120)));
    }
    this.emit({ type: 'deploy', side, x, y, cardId: card.id });
  }

  private createUnit(side: Side, cardId: string, name: string, lane: Lane, x: number, y: number, stats: NonNullable<CardDefinition['stats']>, multiplier: number): UnitState {
    return {
      id: this.nextEntityId++, owner: side, cardId, name, lane, x, y,
      maxHp: Math.round(stats.maxHp * multiplier), hp: Math.round(stats.maxHp * multiplier), damage: stats.damage * multiplier,
      range: stats.range, attackInterval: stats.attackInterval, attackCooldown: Math.random() * stats.attackInterval * 0.35,
      speed: stats.speed, radius: stats.radius, movement: stats.movement, targets: stats.targets,
      attackEffects: (stats.attackEffects ?? []).map((effect) => ({ ...effect, value: effect.kind === 'damage' ? effect.value * multiplier : effect.value })),
      deathEffects: (stats.deathEffects ?? []).map((effect) => ({ ...effect })), splashRadius: stats.splashRadius ?? 0,
      chargeDistance: stats.chargeDistance ?? 0, chargeMultiplier: stats.chargeMultiplier ?? 1, chargeProgress: 0,
      lifetime: stats.lifetime, age: 0, alive: true, statuses: [], isBuilding: getCardSafeType(cardId) === 'building' || name.includes('炮台') || name.includes('泉'),
      healPerSecond: stats.healPerSecond, healRadius: stats.healRadius,
    };
  }

  private applyAreaEffects(side: Side, x: number, y: number, effects: EffectSpec[], defaultRadius: number): void {
    const enemySide: Side = side === 'player' ? 'enemy' : 'player';
    for (const effect of effects) {
      const radius = effect.radius ?? defaultRadius;
      if (effect.kind === 'damage' || effect.kind === 'slow' || effect.kind === 'dot') {
        for (const unit of this.units) {
          if (!unit.alive || unit.owner !== enemySide || distance(x, y, unit.x, unit.y) > radius + unit.radius) continue;
          this.applyEffectToUnit(effect, unit, side);
        }
      } else {
        for (const unit of this.units) {
          if (!unit.alive || unit.owner !== side || distance(x, y, unit.x, unit.y) > radius + unit.radius) continue;
          this.applyEffectToUnit(effect, unit, side);
        }
      }
    }
    if (effects.some((effect) => effect.kind === 'damage')) {
      const totalDamage = effects.filter((effect) => effect.kind === 'damage').reduce((sum, effect) => sum + effect.value, 0);
      for (const tower of this.towers) {
        if (!tower.alive || tower.side !== enemySide) continue;
        if (distance(x, y, tower.x, tower.y) <= defaultRadius + 54) this.damageTower(tower, totalDamage * 0.35, side);
      }
    }
  }

  private applyEffectToUnit(effect: EffectSpec, unit: UnitState, sourceSide: Side): void {
    if (!unit.alive) return;
    if (effect.kind === 'damage') this.damageUnit(unit, effect.value);
    else if (effect.kind === 'heal') unit.hp = Math.min(unit.maxHp, unit.hp + effect.value);
    else if (effect.kind === 'slow') upsertStatus(unit, { kind: 'slow', value: effect.value, remaining: effect.duration ?? 3, sourceId: -1 });
    else if (effect.kind === 'speed') upsertStatus(unit, { kind: 'speed', value: effect.value, remaining: effect.duration ?? 3, sourceId: -1 });
    else if (effect.kind === 'dot') upsertStatus(unit, { kind: 'dot', value: effect.value, remaining: effect.duration ?? 3, sourceId: -1 });
    if (sourceSide && unit.hp <= 0) this.killUnit(unit);
  }

  private applySplashDamage(side: Side, x: number, y: number, damage: number, radius: number, excludedId: number): void {
    const enemySide: Side = side === 'player' ? 'enemy' : 'player';
    for (const unit of this.units) {
      if (!unit.alive || unit.owner !== enemySide || unit.id === excludedId) continue;
      if (distance(x, y, unit.x, unit.y) <= radius + unit.radius) this.damageUnit(unit, damage * 0.65);
    }
  }

  private damageUnit(unit: UnitState, damage: number): void {
    if (!unit.alive) return;
    unit.hp -= damage;
    if (unit.hp <= 0) this.killUnit(unit);
  }

  private killUnit(unit: UnitState): void {
    if (!unit.alive) return;
    unit.alive = false;
    if (unit.deathEffects.length > 0) this.applyAreaEffects(unit.owner, unit.x, unit.y, unit.deathEffects, Math.max(...unit.deathEffects.map((effect) => effect.radius ?? 100)));
    this.emit({ type: 'unit-died', side: unit.owner, unitId: unit.id, x: unit.x, y: unit.y, cardId: unit.cardId });
  }

  private damageTower(tower: TowerState, damage: number, attacker: Side): void {
    if (!tower.alive) return;
    tower.hp -= damage;
    this.emit({ type: 'tower-damaged', side: attacker, x: tower.x, y: tower.y, targetX: tower.x, targetY: tower.y });
    if (tower.hp > 0) return;
    tower.hp = 0;
    tower.alive = false;
    this.crowns[attacker] += tower.lane === 'king' ? 3 : 1;
    this.emit({ type: 'tower-destroyed', side: attacker, x: tower.x, y: tower.y, text: tower.lane === 'king' ? '国王塔被摧毁' : '守卫塔被摧毁' });
    if (tower.lane === 'king') this.finish({ winner: attacker, reason: 'king-destroyed', playerCrowns: this.crowns.player, enemyCrowns: this.crowns.enemy });
  }

  private checkEntityDeaths(): void {
    for (const unit of this.units) if (unit.alive && unit.hp <= 0) this.killUnit(unit);
  }

  private isValidDeployment(side: Side, card: PlayableCard, lane: Lane, x: number, y: number): boolean {
    if (card.type === 'catalyst') return false;
    if (card.type === 'spell') {
      return x >= ARENA.left && x <= ARENA.right && y >= ARENA.top && y <= ARENA.bottom;
    }
    const bounds = this.getDeployBounds(side, lane);
    if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) return false;
    if (card.type === 'building' || card.type === 'trap') return !this.inRiver(x);
    const movement = card.stats?.movement ?? 'ground';
    return movement === 'air' || !this.inRiver(x);
  }

  private inRiver(x: number): boolean { return x >= ARENA.riverLeft - 12 && x <= ARENA.riverRight + 12; }
  private totalTowerHealth(side: Side): number { return this.towers.filter((tower) => tower.side === side && tower.alive).reduce((sum, tower) => sum + tower.hp, 0); }
  private getTimeLeft(): number { return this.overtime ? Math.max(0, this.options.regularSeconds + this.options.overtimeSeconds - this.elapsedSeconds) : Math.max(0, this.options.regularSeconds - this.elapsedSeconds); }

  private finish(result: BattleResult): void {
    if (this.result) return;
    this.result = result;
    this.emit({ type: 'battle-ended', text: result.winner });
  }

  private emit(event: BattleEvent): void { this.events.push(event); }
}

function createTowers(): TowerState[] {
  return [
    createTower('player_king', 'player', 'king', TOWER_POSITIONS.playerKing.x, TOWER_POSITIONS.playerKing.y, 3800, 135, 350, 0.95),
    createTower('player_top', 'player', 'top', TOWER_POSITIONS.playerTop.x, TOWER_POSITIONS.playerTop.y, 2250, 105, 325, 0.9),
    createTower('player_bottom', 'player', 'bottom', TOWER_POSITIONS.playerBottom.x, TOWER_POSITIONS.playerBottom.y, 2250, 105, 325, 0.9),
    createTower('enemy_king', 'enemy', 'king', TOWER_POSITIONS.enemyKing.x, TOWER_POSITIONS.enemyKing.y, 3800, 135, 350, 0.95),
    createTower('enemy_top', 'enemy', 'top', TOWER_POSITIONS.enemyTop.x, TOWER_POSITIONS.enemyTop.y, 2250, 105, 325, 0.9),
    createTower('enemy_bottom', 'enemy', 'bottom', TOWER_POSITIONS.enemyBottom.x, TOWER_POSITIONS.enemyBottom.y, 2250, 105, 325, 0.9),
  ];
}

function createTower(id: string, side: Side, lane: TowerState['lane'], x: number, y: number, maxHp: number, damage: number, range: number, attackInterval: number): TowerState {
  return { id, side, lane, x, y, maxHp, hp: maxHp, damage, range, attackInterval, attackCooldown: 0, alive: true };
}

function towerTarget(tower: TowerState): TargetRef { return { kind: 'tower', id: tower.id, x: tower.x, y: tower.y, radius: 42, movement: 'ground' }; }
function canTarget(mask: UnitState['targets'], movement: UnitState['movement']): boolean { return mask === 'both' || mask === movement; }
function upsertStatus(unit: UnitState, incoming: ActiveStatus): void {
  const existing = unit.statuses.find((status) => status.kind === incoming.kind);
  if (existing) { existing.value = Math.max(existing.value, incoming.value); existing.remaining = Math.max(existing.remaining, incoming.remaining); }
  else unit.statuses.push(incoming);
}
function getCardSafeType(cardId: string): string | null { try { return getCard(cardId).type; } catch { return null; } }
function distance(ax: number, ay: number, bx: number, by: number): number { return Math.hypot(ax - bx, ay - by); }

