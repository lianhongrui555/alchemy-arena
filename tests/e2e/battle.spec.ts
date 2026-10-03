import { expect, test } from '@playwright/test';

const deck = ['anvil_guard', 'spore_squad', 'flame_flask', 'frost_reagent', 'alchemy_cannon', 'spark_archer', 'wind_griffin', 'order_crystal'];

async function seedSave(page: import('@playwright/test').Page, tutorialCompleted = true): Promise<void> {
  await page.addInitScript(({ tutorialCompleted, deck }) => {
    localStorage.setItem('alchemy-arena.save.v1', JSON.stringify({
      version: 2,
      unlockedCardIds: deck,
      deckPresets: { '1': deck, '2': deck, '3': deck },
      activeDeckPreset: 1,
      practice: { deckIds: deck, opponent: 'off', infiniteElixir: true, timerEnabled: false },
      nodeStars: {}, firstClearedNodeIds: [], unlockedJourneyLayers: [1], activeJourney: null,
      tutorialCompleted,
      tutorialStep: 0,
      settings: { musicVolume: 0, sfxVolume: 0, preferredBattleSpeed: 1 },
    }));
  }, { tutorialCompleted, deck });
}

async function enterBattle(page: import('@playwright/test').Page): Promise<void> {
  await seedSave(page, true);
  await page.goto('/alchemy-arena/?debug=1');
  await page.waitForTimeout(700);
  await page.mouse.click(960, 455);
  await page.waitForTimeout(900);
  await page.mouse.click(960, 760);
  await page.waitForTimeout(4800);
}

test('拖动卡牌可以完成部署', async ({ page }) => {
  await enterBattle(page);
  await page.mouse.move(610, 973);
  await page.mouse.down();
  await page.mouse.move(700, 310, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(350);
  const playerUnits = await page.evaluate(() => (window as any).__ALCHEMY_BATTLE__.snapshot().units.filter((unit: { owner: string }) => unit.owner === 'player').length);
  expect(playerUnits).toBeGreaterThan(0);
});

test('可以熔铸并拖动结果卡部署', async ({ page }) => {
  await enterBattle(page);
  await page.mouse.click(220, 889);
  await page.waitForTimeout(250);
  await page.mouse.click(950, 973);
  await page.waitForTimeout(120);
  await page.mouse.click(1120, 973);
  await page.waitForTimeout(180);
  expect(await page.evaluate(() => (window as any).__ALCHEMY_BATTLE__.fusionSelection())).toEqual([2, 3]);
  await page.mouse.click(1830, 889);
  await page.waitForTimeout(1000);
  await page.mouse.click(960, 755);
  await page.waitForTimeout(180);
  expect(await page.evaluate(() => (window as any).__ALCHEMY_BATTLE__.pendingFusion())).not.toBeNull();
  await page.mouse.move(960, 833);
  await page.mouse.down();
  await page.mouse.move(700, 310, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => (window as any).__ALCHEMY_BATTLE__.pendingFusion())).toBeNull();
});

test('新存档首次进入会开启教程', async ({ page }) => {
  await seedSave(page, false);
  await page.goto('/alchemy-arena/?debug=1');
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => Boolean((window as any).__ALCHEMY_BATTLE__))).toBe(true);
  await page.mouse.move(610, 973);
  await page.mouse.down();
  await page.mouse.move(700, 310, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => (window as any).__ALCHEMY_BATTLE__.snapshot().units.some((unit: { owner: string }) => unit.owner === 'player'))).toBe(true);
});




