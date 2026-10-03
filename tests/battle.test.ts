import { describe, expect, it } from 'vitest';
import { BattleSimulation } from '../src/core/BattleSimulation';
import { createFusionResult } from '../src/core/FusionSystem';
import { ALL_CARD_IDS, INITIAL_DECK_IDS, getCard } from '../src/data/cards';
import { getStage } from '../src/data/levels';

describe('BattleSimulation', () => {
  it('玩家可以部署手牌并正确扣除圣水', () => {
    const simulation = new BattleSimulation(getStage(1), INITIAL_DECK_IDS);
    const before = simulation.getElixir('player');
    expect(simulation.playHandCard('player', 0, 'top', 600, 310)).toBe(true);
    expect(simulation.getElixir('player')).toBe(before - 4);
    expect(simulation.units.filter((unit) => unit.owner === 'player')).toHaveLength(1);
  });

  it('熔铸会消耗两张牌并生成唯一待部署结果', () => {
    const simulation = new BattleSimulation(getStage(1), INITIAL_DECK_IDS, undefined, { startingElixir: 10 });
    const result = createFusionResult('anvil_guard', 'spark_archer', 'combat', () => 0.8, 0);
    expect(simulation.fuseCards('player', [0, 1], result)).toBe(true);
    expect(simulation.getPendingFusion('player')?.id).toBe(result.id);
    expect(simulation.getHand('player')).toHaveLength(4);
    expect(simulation.fuseCards('player', [0, 1], result)).toBe(false);
  });

  it('法术可以部署到整个战场区域', () => {
    const spellDeck = ['flame_flask', 'frost_reagent', 'growth_serum', 'corrosion_mire', 'anvil_guard', 'spark_archer', 'spore_squad', 'wind_griffin'];
    const simulation = new BattleSimulation(getStage(1), spellDeck, undefined, { startingElixir: 20 });
    expect(simulation.playHandCard('player', 0, 'top', 1500, 500)).toBe(true);
  });

  it('第二关敌方单位获得 5% 生命加成', () => {
    const simulation = new BattleSimulation(getStage(2), INITIAL_DECK_IDS, undefined, { startingElixir: 10 });
    expect(simulation.playHandCard('enemy', 0, 'top', 1300, 310)).toBe(true);
    const enemy = simulation.units.find((unit) => unit.owner === 'enemy');
    expect(enemy?.maxHp).toBe(1155);
  });

  it('十四张基础牌都可以被正常使用', () => {
    for (const cardId of ALL_CARD_IDS) {
      const deck = [cardId, ...ALL_CARD_IDS.filter((id) => id !== cardId).slice(0, 7)];
      const simulation = new BattleSimulation(getStage(1), deck, deck, { startingElixir: 100 });
      const card = getCard(cardId);
      const x = card.type === 'spell' ? 1500 : 760;
      const y = 310;
      expect(simulation.playHandCard('player', 0, 'top', x, y), `${card.name} 应可部署`).toBe(true);
      if (card.type === 'catalyst') expect(simulation.getFusionBias('player')).toBe(card.catalyst?.direction);
    }
  });
  it('常规时间平局后进入加时，并在结束时按塔血量判定', () => {
    const simulation = new BattleSimulation(getStage(1), INITIAL_DECK_IDS, undefined, { regularSeconds: 1, overtimeSeconds: 1 });
    for (let index = 0; index < 25; index += 1) simulation.update(0.1);
    expect(simulation.getSnapshot().overtime).toBe(true);
    for (let index = 0; index < 15; index += 1) simulation.update(0.1);
    expect(simulation.getSnapshot().result?.reason).toBe('health');
  });
});


