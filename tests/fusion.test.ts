import { describe, expect, it } from 'vitest';
import { createFusionResult, getFusionCost } from '../src/core/FusionSystem';
import { getCard } from '../src/data/cards';

describe('FusionSystem', () => {
  it('熔铸费用使用最高素材费用加一，并限制最高七费', () => {
    expect(getFusionCost(getCard('anvil_guard'), getCard('spark_archer'))).toBe(5);
    expect(getFusionCost(getCard('anvil_guard'), getCard('steam_charger'))).toBe(5);
  });

  it('催化剂限定方向不会改变结果类型方向', () => {
    const result = createFusionResult('anvil_guard', 'flame_flask', 'combat', () => 0.8, 0);
    expect(result.direction).toBe('combat');
    expect(['unit', 'building']).toContain(result.type);
  });

  it('招牌配方按随机判定触发', () => {
    const result = createFusionResult('flame_flask', 'frost_reagent', 'mystic', () => 0.01, 1);
    expect(result.name).toBe('冰火爆裂');
    expect(result.signature).toBe(true);
  });

  it('普通随机结果拥有价值保底', () => {
    const a = getCard('spore_squad');
    const b = getCard('wind_griffin');
    const result = createFusionResult(a.id, b.id, 'combat', () => 0.8, 0);
    expect(result.powerScore).toBeGreaterThan(Math.max(a.power, b.power));
  });
});
