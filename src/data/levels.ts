import type { StageConfig } from '../core/types';

export const STAGES: StageConfig[] = [
  {
    id: 1,
    name: '试炼熔炉',
    subtitle: '熟悉部署、圣水与随机熔铸',
    aiName: '见习炼金师',
    statMultiplier: 1,
    elixirMultiplier: 1,
    reactionMin: 0.9,
    reactionMax: 1.4,
    deck: ['anvil_guard', 'spark_archer', 'spore_squad', 'wind_griffin', 'alchemy_cannon', 'flame_flask', 'frost_reagent', 'order_crystal'],
    usesCatalysts: true,
    usesTraps: false,
    difficultyLabel: '普通',
  },
  {
    id: 2,
    name: '白银工坊',
    subtitle: '敌方获得轻微属性强化并开始使用陷阱',
    aiName: '白银铸造师',
    statMultiplier: 1.05,
    elixirMultiplier: 1,
    reactionMin: 0.6,
    reactionMax: 1.0,
    deck: ['anvil_guard', 'spark_archer', 'spore_squad', 'wind_griffin', 'steam_charger', 'alchemy_cannon', 'flame_flask', 'corrosion_mire'],
    usesCatalysts: false,
    usesTraps: true,
    difficultyLabel: '困难',
  },
  {
    id: 3,
    name: '王冠坩埚',
    subtitle: 'AI 拥有更强数值与更快圣水恢复',
    aiName: '大炼金师',
    statMultiplier: 1.1,
    elixirMultiplier: 1.2,
    reactionMin: 0.3,
    reactionMax: 0.7,
    deck: ['anvil_guard', 'spark_archer', 'spore_squad', 'wind_griffin', 'steam_charger', 'life_spring', 'blast_rune', 'chaos_dust'],
    usesCatalysts: true,
    usesTraps: true,
    difficultyLabel: '挑战',
  },
];

export function getStage(id: number): StageConfig {
  const stage = STAGES.find((item) => item.id === id);
  if (!stage) throw new Error(`未知关卡: ${id}`);
  return stage;
}
