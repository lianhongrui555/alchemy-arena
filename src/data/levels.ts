import type { NodeId, StageConfig, StageNodeDefinition } from '../core/types';

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
    themeId: 'trial',
  },
  {
    id: 2,
    name: '白银工坊',
    subtitle: '敌方获得轻微属性强化并开始使用陷阱',
    aiName: '白银铸造师',
    statMultiplier: 1.05,
    elixirMultiplier: 1,
    reactionMin: 0.6,
    reactionMax: 1,
    deck: ['anvil_guard', 'spark_archer', 'spore_squad', 'wind_griffin', 'steam_charger', 'alchemy_cannon', 'flame_flask', 'corrosion_mire'],
    usesCatalysts: false,
    usesTraps: true,
    difficultyLabel: '困难',
    themeId: 'silver',
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
    themeId: 'crown',
  },
];

export const JOURNEY_NODES: Record<NodeId, StageNodeDefinition> = {
  l1_trial: { id: 'l1_trial', layer: 1, name: '试炼熔炉', subtitle: '均衡军队与远程火力', aiStageId: 1, themeId: 'trial', boss: false, deck: STAGES[0]!.deck, starGoals: ['通关节点', '己方国王塔存活', '2 分 30 秒内获胜'] },
  l1_greenhouse: { id: 'l1_greenhouse', layer: 1, name: '菌丝温室', subtitle: '数量众多但单体脆弱', aiStageId: 1, themeId: 'spore', boss: false, deck: ['spore_squad', 'spark_archer', 'wind_griffin', 'growth_serum', 'life_spring', 'frost_reagent', 'order_crystal', 'alchemy_cannon'], starGoals: ['通关节点', '己方国王塔存活', '2 分 30 秒内获胜'] },
  l2_silver: { id: 'l2_silver', layer: 2, name: '白银工坊', subtitle: '陷阱与重装推进', aiStageId: 2, themeId: 'silver', boss: false, deck: STAGES[1]!.deck, starGoals: ['通关节点', '己方国王塔存活', '2 分 30 秒内获胜'] },
  l2_frost: { id: 'l2_frost', layer: 2, name: '霜冻矿脉', subtitle: '控制法术与远程消耗', aiStageId: 2, themeId: 'frost', boss: false, deck: ['anvil_guard', 'spark_archer', 'wind_griffin', 'frost_reagent', 'alchemy_cannon', 'growth_serum', 'order_crystal', 'spore_squad'], starGoals: ['通关节点', '己方国王塔存活', '2 分 30 秒内获胜'] },
  l3_crown: { id: 'l3_crown', layer: 3, name: '王冠坩埚', subtitle: '守卫塔未破时，国王塔受到 60% 减伤', aiStageId: 3, themeId: 'crown', boss: true, deck: STAGES[2]!.deck, starGoals: ['击败首领', '己方国王塔存活', '2 分 30 秒内获胜'] },
};

export function getStage(id: number): StageConfig { const stage = STAGES.find((item) => item.id === id); if (!stage) throw new Error(`未知关卡: ${id}`); return stage; }
export function getJourneyNode(id: NodeId): StageNodeDefinition { return JOURNEY_NODES[id]; }
export function getNodesForLayer(layer: 1 | 2 | 3): StageNodeDefinition[] { return Object.values(JOURNEY_NODES).filter((node) => node.layer === layer); }
