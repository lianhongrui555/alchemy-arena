import { describe, expect, it } from 'vitest';
import { chooseRewardCards, createDefaultSave, recordVictory, sanitizeSave, updateDeck, unlockCard } from '../src/core/save';
import { ALL_CARD_IDS, INITIAL_UNLOCKED_IDS } from '../src/data/cards';

describe('存档与永久收藏', () => {
  it('默认存档包含八张初始卡与合法牌组', () => {
    const save = createDefaultSave();
    expect(save.unlockedCardIds).toEqual(INITIAL_UNLOCKED_IDS);
    expect(save.deckCardIds).toHaveLength(8);
  });

  it('胜利后记录关卡并从三张未解锁卡中选择奖励', () => {
    const save = recordVictory(createDefaultSave(), 1);
    expect(save.clearedStageIds).toEqual([1]);
    const rewards = chooseRewardCards(save, () => 0);
    expect(rewards).toHaveLength(3);
    expect(rewards.every((id) => !save.unlockedCardIds.includes(id))).toBe(true);
    const unlocked = unlockCard(save, rewards[0]!);
    expect(unlocked.unlockedCardIds).toContain(rewards[0]);
  });

  it('拒绝未解锁卡牌组成牌组', () => {
    const save = createDefaultSave();
    expect(() => updateDeck(save, [...save.deckCardIds.slice(0, 7), ALL_CARD_IDS[13]!])).toThrow();
  });

  it('损坏的存档会回退到合法的初始数据', () => {
    const save = sanitizeSave({ unlockedCardIds: ['unknown'], deckCardIds: ['bad'], clearedStageIds: [99] });
    expect(save.unlockedCardIds).toEqual(INITIAL_UNLOCKED_IDS);
    expect(save.clearedStageIds).toEqual([]);
  });
});
