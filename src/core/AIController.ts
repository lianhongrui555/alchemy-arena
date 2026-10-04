import { getCard } from '../data/cards';
import { ARENA, TOWER_POSITIONS } from './constants';
import { BattleSimulation } from './BattleSimulation';
import { createFusionResult, getFusionCost } from './FusionSystem';
import type { Lane } from './types';

export class AIController {
  private reactionTimer = 0;
  private random: () => number;

  constructor(random: () => number = Math.random) {
    this.random = random;
  }

  update(delta: number, simulation: BattleSimulation): void {
    if (simulation.getSnapshot().result) return;
    this.reactionTimer -= delta;
    if (this.reactionTimer > 0) return;
    this.scheduleNextReaction(simulation);

    const pending = simulation.getPendingFusion('enemy');
    if (pending) {
      this.deployPending(simulation, pending.type);
      return;
    }

    if (simulation.stage.usesCatalysts && !simulation.getFusionCatalyst('enemy')) {
      const catalystIndex = simulation.getHand('enemy').findIndex((id) => getCard(id).type === 'catalyst');
      if (catalystIndex >= 0 && this.random() < 0.08) {
        simulation.useCatalyst('enemy', catalystIndex);
        return;
      }
    }

    if (this.shouldFuse(simulation)) return;
    this.playReactiveCard(simulation);
  }

  private scheduleNextReaction(simulation: BattleSimulation): void {
    const { reactionMin, reactionMax } = simulation.stage;
    this.reactionTimer = reactionMin + this.random() * (reactionMax - reactionMin);
  }

  private shouldFuse(simulation: BattleSimulation): boolean {
    const hand = simulation.getHand('enemy');
    const playable = hand
      .map((id, index) => ({ card: getCard(id), index }))
      .filter(({ card }) => card.type !== 'catalyst');
    if (playable.length < 2 || this.random() > 0.2) return false;
    const first = playable[0];
    const second = playable[1];
    if (!first || !second) return false;
    const cost = getFusionCost(first.card, second.card);
    if (!simulation.canAfford('enemy', cost)) return false;
    const result = createFusionResult(first.card.id, second.card.id, simulation.getFusionCatalyst('enemy'), this.random, 0.22);
    return simulation.fuseCards('enemy', [first.index, second.index], result);
  }

  private deployPending(simulation: BattleSimulation, type: string): void {
    const playerUnits = simulation.units.filter((unit) => unit.alive && unit.owner === 'player');
    const lane = this.chooseThreatLane(simulation);
    const cluster = getCluster(playerUnits);
    const laneY = lane === 'top' ? ARENA.topLaneY : ARENA.bottomLaneY;
    if (type === 'spell' || type === 'trap') {
      const x = cluster ? cluster.x : ARENA.riverLeft + 80;
      const y = type === 'trap' ? laneY : cluster?.y ?? laneY;
      simulation.deployPendingFusion('enemy', lane, Math.max(ARENA.riverLeft, x), y);
      return;
    }
    simulation.deployPendingFusion('enemy', lane, TOWER_POSITIONS.enemyTop.x - 155, laneY + (this.random() - 0.5) * 45);
  }

  private playReactiveCard(simulation: BattleSimulation): void {
    const hand = simulation.getHand('enemy');
    const candidates = hand
      .map((id, index) => ({ card: getCard(id), index }))
      .filter(({ card }) => card.type !== 'catalyst' && simulation.canAfford('enemy', card.cost));
    if (candidates.length === 0) return;

    const threats = simulation.units.filter((unit) => unit.alive && unit.owner === 'player' && unit.x > ARENA.riverRight - 80);
    const cluster = getCluster(threats);
    const lane = this.chooseThreatLane(simulation);
    const laneY = lane === 'top' ? ARENA.topLaneY : ARENA.bottomLaneY;

    const spell = cluster && threats.length >= 2 ? candidates.find(({ card }) => card.type === 'spell') : undefined;
    const trap = !spell && simulation.stage.usesTraps ? candidates.find(({ card }) => card.type === 'trap') : undefined;
    const building = !spell && !trap && threats.length > 0 ? candidates.find(({ card }) => card.type === 'building') : undefined;
    const unit = [...candidates]
      .filter(({ card }) => card.type === 'unit' && (!threats.length || card.stats?.targetPreference !== 'buildings'))
      .sort((a, b) => b.card.power - a.card.power)[0];
    const selected = spell ?? trap ?? building ?? unit ?? candidates[0];
    if (!selected) return;

    let x = TOWER_POSITIONS.enemyTop.x - 160;
    let y = laneY + (this.random() - 0.5) * 70;
    if (selected.card.type === 'spell') {
      x = cluster?.x ?? ARENA.riverLeft + 120;
      y = cluster?.y ?? laneY;
    } else if (selected.card.type === 'trap') {
      x = ARENA.riverRight + 38;
      y = laneY;
    } else if (selected.card.type === 'building') {
      x = TOWER_POSITIONS.enemyTop.x - 95;
    } else if (selected.card.stats?.movement === 'air') {
      x = TOWER_POSITIONS.enemyTop.x - 200;
      y = laneY;
    }
    simulation.playHandCard('enemy', selected.index, lane, x, y);
  }

  private chooseThreatLane(simulation: BattleSimulation): Lane {
    const threats = simulation.units.filter((unit) => unit.alive && unit.owner === 'player' && unit.x > ARENA.riverRight - 200);
    const top = threats.filter((unit) => unit.lane === 'top').reduce((sum, unit) => sum + unit.hp, 0);
    const bottom = threats.filter((unit) => unit.lane === 'bottom').reduce((sum, unit) => sum + unit.hp, 0);
    if (top === bottom) return this.random() < 0.5 ? 'top' : 'bottom';
    return top > bottom ? 'top' : 'bottom';
  }
}

function getCluster(units: BattleSimulation['units']): { x: number; y: number; count: number } | null {
  if (units.length === 0) return null;
  return {
    x: units.reduce((sum, unit) => sum + unit.x, 0) / units.length,
    y: units.reduce((sum, unit) => sum + unit.y, 0) / units.length,
    count: units.length,
  };
}


