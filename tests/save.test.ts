import { describe, expect, it } from 'vitest';
import { chooseRewardCards, createDefaultSave, sanitizeSave, updateDeck, unlockCard } from '../src/core/save';
import { INITIAL_UNLOCKED_IDS } from '../src/data/cards';

describe('存档与永久收藏', () => {
  it('默认 V2 存档包含三套牌组和教程状态', () => {
    const save = createDefaultSave();
    expect(save.version).toBe(2);
    expect(save.deckPresets['1']).toHaveLength(8);
    expect(save.deckPresets['2']).toHaveLength(8);
    expect(save.tutorialCompleted).toBe(false);
  });

  it('V1 存档迁移后保留收藏、牌组和音量并跳过教程', () => {
    const migrated = sanitizeSave({ version: 1, unlockedCardIds: INITIAL_UNLOCKED_IDS, deckCardIds: createDefaultSave().deckPresets['1'], clearedStageIds: [1], settings: { musicVolume: 0.2, sfxVolume: 0.3 } });
    expect(migrated.version).toBe(2);
    expect(migrated.tutorialCompleted).toBe(true);
    expect(migrated.unlockedJourneyLayers).toContain(2);
    expect(migrated.settings.musicVolume).toBeCloseTo(0.2);
  });

  it('可以从三张未解锁卡中选择奖励', () => {
    const save = createDefaultSave();
    const rewards = chooseRewardCards(save, () => 0);
    expect(rewards).toHaveLength(3);
    const unlocked = unlockCard(save, rewards[0]!);
    expect(unlocked.unlockedCardIds).toContain(rewards[0]);
  });

  it('拒绝未解锁卡组成正式牌组', () => {
    const save = createDefaultSave();
    expect(() => updateDeck(save, [...save.deckPresets['1'].slice(0, 7), 'chaos_dust'])).toThrow();
  });
});
