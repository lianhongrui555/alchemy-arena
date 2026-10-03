import { BATTLE_RULES } from './constants';
import { getCard } from '../data/cards';
import type {
  CardDefinition,
  EffectSpec,
  FusionDirection,
  FusionResult,
  UnitStats,
} from './types';

export type RandomFn = () => number;

interface SignatureRecipe {
  pair: [string, string];
  result: Omit<FusionResult, 'cost' | 'sourceCardIds' | 'signature'>;
}

const SIGNATURE_RECIPES: SignatureRecipe[] = [
  {
    pair: ['flame_flask', 'frost_reagent'],
    result: {
      id: 'fusion_icefire', name: '冰火爆裂', type: 'spell', tags: ['spell', 'damage', 'slow', 'elemental'],
      powerScore: 5.2, targeting: 'area', artKey: 'spell_fusion_icefire', effectId: 'fusion_icefire', direction: 'mystic',
      description: '冰火交错，造成高额范围伤害并使幸存者减速。',
      spell: { radius: 185, effects: [{ kind: 'damage', value: 530, radius: 185 }, { kind: 'slow', value: 0.6, duration: 5, radius: 185 }] },
    },
  },
  {
    pair: ['spore_squad', 'growth_serum'],
    result: {
      id: 'fusion_proliferation', name: '增殖菌群', type: 'unit', tags: ['ground', 'swarm', 'fast', 'heal'],
      powerScore: 4.3, targeting: 'ground', artKey: 'unit_fusion_proliferation', effectId: 'fusion_proliferation', direction: 'combat',
      description: '六只强化孢子快速涌出，移动速度极快。',
      stats: { maxHp: 180, damage: 58, range: 36, attackInterval: 0.58, speed: 125, radius: 11, movement: 'ground', targets: 'ground', spawnCount: 6 },
    },
  },
  {
    pair: ['anvil_guard', 'steam_charger'],
    result: {
      id: 'fusion_forge_rider', name: '熔炉重骑', type: 'unit', tags: ['ground', 'tank', 'charger'],
      powerScore: 5.6, targeting: 'ground', artKey: 'unit_fusion_forge', effectId: 'fusion_forge_rider', direction: 'combat',
      description: '厚重装甲与蒸汽推进器结合，冲锋命中造成巨额伤害。',
      stats: { maxHp: 1320, damage: 185, range: 52, attackInterval: 1.0, speed: 72, radius: 27, movement: 'ground', targets: 'ground', chargeDistance: 210, chargeMultiplier: 2.25, attackEffects: [{ kind: 'damage', value: 80, radius: 75 }] },
    },
  },
  {
    pair: ['wind_griffin', 'blast_rune'],
    result: {
      id: 'fusion_thunder_dive', name: '雷鸣俯冲', type: 'unit', tags: ['air', 'fast', 'damage', 'area'],
      powerScore: 5.1, targeting: 'ground', artKey: 'unit_fusion_thunder', effectId: 'fusion_thunder_dive', direction: 'combat',
      description: '从天而降的狮鹫，落地时引爆一圈雷击。',
      stats: { maxHp: 620, damage: 125, range: 58, attackInterval: 0.78, speed: 128, radius: 22, movement: 'air', targets: 'both', splashRadius: 72, deployEffects: [{ kind: 'damage', value: 260, radius: 145 }] },
    },
  },
  {
    pair: ['alchemy_cannon', 'corrosion_mire'],
    result: {
      id: 'fusion_acid_cannon', name: '酸液炮台', type: 'building', tags: ['ground', 'building', 'ranged', 'dot'],
      powerScore: 5.0, targeting: 'ground', artKey: 'building_fusion_acid', effectId: 'fusion_acid_cannon', direction: 'combat',
      description: '发射腐蚀炮弹，命中后继续侵蚀敌军。',
      stats: { maxHp: 930, damage: 120, range: 390, attackInterval: 1.15, speed: 0, radius: 28, movement: 'ground', targets: 'ground', splashRadius: 72, lifetime: 40, attackEffects: [{ kind: 'dot', value: 24, duration: 4, radius: 78 }] },
    },
  },
  {
    pair: ['life_spring', 'frost_reagent'],
    result: {
      id: 'fusion_frost_spring', name: '寒泉领域', type: 'building', tags: ['ground', 'building', 'heal', 'slow'],
      powerScore: 4.9, targeting: 'ground', artKey: 'building_fusion_frost', effectId: 'fusion_frost_spring', direction: 'combat',
      description: '泉水持续治疗友军，同时让靠近的敌军减速。',
      stats: { maxHp: 850, damage: 0, range: 205, attackInterval: 1.0, speed: 0, radius: 28, movement: 'ground', targets: 'ground', lifetime: 38, healPerSecond: 82, healRadius: 215, attackEffects: [{ kind: 'slow', value: 0.35, duration: 1.5, radius: 205 }] },
    },
  },
];

const COMBAT_PREFIXES = ['炽热', '重铸', '狂化', '晶体', '风暴'];
const MYSTIC_PREFIXES = ['混乱', '剧毒', '霜火', '扭曲', '闪爆'];
const GENERIC_COMBAT_NAMES = ['熔铸魔像', '炼金战兽', '晶化先锋', '蒸汽异兽'];
const GENERIC_MYSTIC_NAMES = ['元素爆裂', '混沌药剂', '炼金地雷', '风暴符文'];

export function getFusionCost(cardA: CardDefinition, cardB: CardDefinition): number {
  return Math.min(BATTLE_RULES.maxFusionCost, Math.max(cardA.cost, cardB.cost) + 1);
}

export function getAutomaticDirection(a: CardDefinition, b: CardDefinition, random: RandomFn): FusionDirection {
  const aMystic = a.type === 'spell' || a.type === 'trap';
  const bMystic = b.type === 'spell' || b.type === 'trap';
  if (aMystic && bMystic) return 'mystic';
  if (!aMystic && !bMystic) return 'combat';
  return random() < 0.62 ? 'combat' : 'mystic';
}

export function createFusionResult(
  cardAId: string,
  cardBId: string,
  forcedDirection: FusionDirection | null = null,
  random: RandomFn = Math.random,
  signatureChance = 0.22,
): FusionResult {
  const cardA = getCard(cardAId);
  const cardB = getCard(cardBId);
  const sourceIds = orderSources(cardA, cardB).map((card) => card.id) as [string, string];
  const sourceA = getCard(sourceIds[0]);
  const sourceB = getCard(sourceIds[1]);
  const direction = forcedDirection ?? getAutomaticDirection(sourceA, sourceB, random);
  const signature = findSignature(sourceIds[0], sourceIds[1]);

  if (signature && (signature.result.direction === direction || forcedDirection === null) && random() < signatureChance) {
    return {
      ...signature.result,
      cost: getFusionCost(sourceA, sourceB),
      sourceCardIds: sourceIds,
      signature: true,
    };
  }

  const result = direction === 'combat'
    ? createCombatFusion(sourceA, sourceB, random)
    : createMysticFusion(sourceA, sourceB, random);

  return {
    ...result,
    cost: getFusionCost(sourceA, sourceB),
    sourceCardIds: sourceIds,
    signature: false,
  };
}

function orderSources(a: CardDefinition, b: CardDefinition): [CardDefinition, CardDefinition] {
  if (a.power === b.power) return [a, b];
  return a.power > b.power ? [a, b] : [b, a];
}

function findSignature(a: string, b: string): SignatureRecipe | undefined {
  return SIGNATURE_RECIPES.find((recipe) =>
    (recipe.pair[0] === a && recipe.pair[1] === b) || (recipe.pair[0] === b && recipe.pair[1] === a),
  );
}

function createCombatFusion(a: CardDefinition, b: CardDefinition, random: RandomFn): Omit<FusionResult, 'cost' | 'sourceCardIds' | 'signature'> {
  const primary = a.stats ? a : b.stats ? b : a;
  const secondary = primary === a ? b : a;
  const primaryStats = primary.stats ?? fallbackStats(primary);
  const secondaryStats = secondary.stats ?? fallbackStats(secondary);
  const targetPower = Math.max(a.power, b.power) + Math.min(a.power, b.power) * 0.48;
  const powerRatio = Math.max(1, targetPower / Math.max(a.power, b.power));
  const variedScale = 0.94 + random() * 0.12;
  const hpScale = Math.sqrt(powerRatio * variedScale);
  const damageScale = Math.sqrt(powerRatio * variedScale);
  const variation = Math.floor(random() * COMBAT_PREFIXES.length);
  const isBuilding = primary.type === 'building' && secondary.type === 'building';
  const isAir = primaryStats.movement === 'air' || secondaryStats.movement === 'air';
  const deployEffects = secondary.spell
    ? secondary.spell.effects.map((effect) => ({ ...effect, radius: effect.radius ?? secondary.spell?.radius }))
    : secondary.trap?.effects.map((effect) => ({ ...effect, radius: effect.radius ?? secondary.trap?.radius }));

  const stats: UnitStats = {
    maxHp: Math.round(Math.max(primaryStats.maxHp, secondaryStats.maxHp * 0.55) * hpScale),
    damage: Math.round(Math.max(primaryStats.damage, secondaryStats.damage * 0.6) * damageScale),
    range: Math.max(primaryStats.range, secondaryStats.range),
    attackInterval: Math.max(0.45, Math.min(primaryStats.attackInterval, secondaryStats.attackInterval || 1.15) * 0.96),
    speed: isBuilding ? 0 : Math.max(38, Math.min(primaryStats.speed, secondaryStats.speed || 58) * (1 + random() * 0.1)),
    radius: Math.max(12, primaryStats.radius + (secondaryStats.radius > 18 ? 3 : 0)),
    movement: isAir ? 'air' : 'ground',
    targets: primaryStats.targets === 'both' || secondaryStats.targets === 'both' ? 'both' : 'ground',
    splashRadius: Math.max(primaryStats.splashRadius ?? 0, secondaryStats.splashRadius ?? 0) + (random() < 0.3 ? 48 : 0),
    chargeDistance: primaryStats.chargeDistance ?? secondaryStats.chargeDistance,
    chargeMultiplier: primaryStats.chargeMultiplier ?? secondaryStats.chargeMultiplier,
    lifetime: isBuilding ? Math.max(30, primaryStats.lifetime ?? 32) : undefined,
    spawnCount: primaryStats.spawnCount,
    attackEffects: [...(primaryStats.attackEffects ?? []), ...(secondaryStats.attackEffects ?? [])],
    deployEffects,
  };

  return {
    id: `fusion_combat_${primary.id}_${secondary.id}_${variation}`,
    name: `${COMBAT_PREFIXES[variation]}·${primary.name}`,
    type: isBuilding ? 'building' : 'unit',
    tags: [...new Set([...primary.tags, ...secondary.tags, 'fusion'])],
    powerScore: targetPower,
    targeting: 'ground',
    artKey: `${primary.artKey}_fusion`,
    effectId: 'fusion_generic_combat',
    description: `熔铸体：${primary.name}的躯壳与${secondary.name}的特性融合。`,
    direction: 'combat',
    stats,
  };
}

function createMysticFusion(a: CardDefinition, b: CardDefinition, random: RandomFn): Omit<FusionResult, 'cost' | 'sourceCardIds' | 'signature'> {
  const targetPower = Math.max(a.power, b.power) + Math.min(a.power, b.power) * 0.42;
  const sourceEffects = [
    ...(a.spell?.effects ?? []),
    ...(b.spell?.effects ?? []),
    ...(a.trap?.effects ?? []),
    ...(b.trap?.effects ?? []),
  ];
  const effects = sourceEffects.length > 0
    ? sourceEffects.map((effect) => ({
        ...effect,
        value: effect.kind === 'slow' || effect.kind === 'speed'
          ? Math.min(0.65, effect.value + 0.08)
          : Math.round(effect.value * (0.95 + targetPower * 0.1)),
        duration: effect.duration ? effect.duration + 0.8 : undefined,
      }))
    : [{ kind: 'damage' as const, value: Math.round(targetPower * 95) }];
  const radius = Math.max(a.spell?.radius ?? a.trap?.radius ?? 120, b.spell?.radius ?? b.trap?.radius ?? 120) + 18;
  const asTrap = random() < 0.42;
  const variation = Math.floor(random() * MYSTIC_PREFIXES.length);
  const name = asTrap ? `${MYSTIC_PREFIXES[variation]}·${GENERIC_MYSTIC_NAMES[3]}` : `${MYSTIC_PREFIXES[variation]}·${GENERIC_MYSTIC_NAMES[variation % 3]}`;

  if (asTrap) {
    return {
      id: `fusion_mystic_trap_${a.id}_${b.id}_${variation}`,
      name,
      type: 'trap',
      tags: [...new Set([...a.tags, ...b.tags, 'fusion', 'trap'])],
      powerScore: targetPower,
      targeting: 'ground',
      artKey: 'trap_fusion_generic',
      effectId: 'fusion_generic_trap',
      description: '不稳定的炼金陷阱，触发后释放混合效果。',
      direction: 'mystic',
      trap: { triggerRadius: 58, radius, effects: normalizeEffectRadii(effects, radius), lifetime: 34 },
    };
  }

  return {
    id: `fusion_mystic_spell_${a.id}_${b.id}_${variation}`,
    name,
    type: 'spell',
    tags: [...new Set([...a.tags, ...b.tags, 'fusion', 'spell'])],
    powerScore: targetPower,
    targeting: 'area',
    artKey: 'spell_fusion_generic',
    effectId: 'fusion_generic_spell',
    description: '向目标区域释放不稳定的炼金混合术式。',
    direction: 'mystic',
    spell: { radius, effects: normalizeEffectRadii(effects, radius) },
  };
}

function normalizeEffectRadii(effects: EffectSpec[], radius: number): EffectSpec[] {
  return effects.map((effect) => ({ ...effect, radius: effect.radius ?? radius }));
}

function fallbackStats(card: CardDefinition): UnitStats {
  return {
    maxHp: Math.round(card.power * 170),
    damage: Math.round(card.power * 32),
    range: card.type === 'building' ? 260 : 48,
    attackInterval: 1,
    speed: card.type === 'building' ? 0 : 62,
    radius: 19,
    movement: 'ground',
    targets: card.type === 'building' ? 'ground' : 'both',
  };
}

export function getFusionPreviewCost(a: CardDefinition, b: CardDefinition): number {
  return getFusionCost(a, b);
}

export function listSignaturePairs(): Array<[string, string]> {
  return SIGNATURE_RECIPES.map((recipe) => [...recipe.pair] as [string, string]);
}
