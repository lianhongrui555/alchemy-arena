import { expect, test } from '@playwright/test';

async function enterBattle(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/alchemy-arena/?debug=1');
  await page.waitForTimeout(700);
  await page.mouse.click(960, 475);
  await page.waitForTimeout(900);
  await page.mouse.click(390, 715);
  await page.waitForTimeout(1400);
}

test('可以进入战斗、选择手牌并部署单位', async ({ page }) => {
  await enterBattle(page);
  await page.mouse.click(610, 973);
  await page.waitForTimeout(200);
  const selected = await page.evaluate(() => (window as any).__ALCHEMY_BATTLE__.selectedHandIndex());
  expect(selected).toBe(0);

  await page.mouse.click(700, 310);
  await page.waitForTimeout(350);
  const playerUnits = await page.evaluate(() => (window as any).__ALCHEMY_BATTLE__.snapshot().units.filter((unit: { owner: string }) => unit.owner === 'player').length);
  expect(playerUnits).toBe(1);
});

test('可以选择两张牌完成随机熔铸', async ({ page }) => {
  await enterBattle(page);
  await page.mouse.click(220, 889);
  await page.mouse.click(610, 973);
  await page.mouse.click(780, 973);
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => (window as any).__ALCHEMY_BATTLE__.fusionSelection())).toEqual([0, 1]);

  await page.mouse.click(1830, 889);
  await page.waitForTimeout(250);
  const pending = await page.evaluate(() => (window as any).__ALCHEMY_BATTLE__.pendingFusion());
  expect(pending).not.toBeNull();
  expect(pending.name.length).toBeGreaterThan(0);

  await page.mouse.click(960, 720);
  await page.waitForTimeout(150);
  await page.mouse.click(700, 310);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => (window as any).__ALCHEMY_BATTLE__.pendingFusion())).toBeNull();
});

