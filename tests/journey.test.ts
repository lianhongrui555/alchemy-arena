import { describe, expect, it } from 'vitest';
import { calculateStars, chooseJourneyBlessing, completeJourneyNode, createJourney, selectJourneyNode } from '../src/core/JourneySystem';
import { createDefaultSave } from '../src/core/save';

describe('JourneySystem', () => {
  it('新路线生成四名普通节点的互不重复规则', () => {
    const journey = createJourney(createDefaultSave().deckPresets['1'], () => 0);
    expect(new Set(Object.values(journey.nodeModifiers)).size).toBe(4);
  });

  it('三星条件按胜利、保塔和用时计算', () => {
    expect(calculateStars({ winner: 'player', playerKingAlive: true, elapsedSeconds: 140 })).toBe(3);
    expect(calculateStars({ winner: 'player', playerKingAlive: false, elapsedSeconds: 180 })).toBe(1);
    expect(calculateStars({ winner: 'enemy', playerKingAlive: true, elapsedSeconds: 100 })).toBe(0);
  });

  it('胜利后生成下一层节点和祝福选择', () => {
    let save = createDefaultSave();
    save.activeJourney = createJourney(save.deckPresets['1'], () => 0);
    save = selectJourneyNode(save, 'l1_trial');
    save = completeJourneyNode(save, 'l1_trial', { winner: 'player', playerKingAlive: true, elapsedSeconds: 100 });
    expect(save.activeJourney?.pendingNextNodes).toHaveLength(2);
    expect(save.activeJourney?.pendingBlessingChoices).toHaveLength(3);
    const blessing = save.activeJourney!.pendingBlessingChoices![0]!;
    save = chooseJourneyBlessing(save, blessing);
    expect(save.activeJourney?.blessings[blessing]).toBe(1);
  });

  it('失败会清空本轮路线但保留节点星级', () => {
    let save = createDefaultSave();
    save.activeJourney = createJourney(save.deckPresets['1'], () => 0);
    save = completeJourneyNode(save, 'l1_trial', { winner: 'player', playerKingAlive: true, elapsedSeconds: 100 });
    save = completeJourneyNode(save, 'l2_silver', { winner: 'enemy', playerKingAlive: false, elapsedSeconds: 200 });
    expect(save.activeJourney).toBeNull();
    expect(save.nodeStars.l1_trial).toBe(3);
  });
});
