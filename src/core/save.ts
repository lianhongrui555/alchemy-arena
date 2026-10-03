import { ALL_CARD_IDS, INITIAL_DECK_IDS, INITIAL_UNLOCKED_IDS } from '../data/cards';
import type { SaveV1 } from './types';

const SAVE_KEY = 'alchemy-arena.save.v1';

export function createDefaultSave(): SaveV1 {
  return {
    version: 1,
    unlockedCardIds: [...INITIAL_UNLOCKED_IDS],
    deckCardIds: [...INITIAL_DECK_IDS],
    clearedStageIds: [],
    settings: { musicVolume: 0.38, sfxVolume: 0.65 },
  };
}

export function loadSave(): SaveV1 {
  if (typeof localStorage === 'undefined') return createDefaultSave();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createDefaultSave();
    return sanitizeSave(JSON.parse(raw) as SaveV1);
  } catch {
    return createDefaultSave();
  }
}

export function persistSave(save: SaveV1): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(SAVE_KEY, JSON.stringify(sanitizeSave(save)));
}

export function resetSave(): SaveV1 {
  const save = createDefaultSave();
  persistSave(save);
  return save;
}

export function recordVictory(save: SaveV1, stageId: number): SaveV1 {
  const next = cloneSave(save);
  if (!next.clearedStageIds.includes(stageId)) next.clearedStageIds.push(stageId);
  next.clearedStageIds.sort((a, b) => a - b);
  persistSave(next);
  return next;
}

export function unlockCard(save: SaveV1, cardId: string): SaveV1 {
  if (!ALL_CARD_IDS.includes(cardId) || save.unlockedCardIds.includes(cardId)) return cloneSave(save);
  const next = cloneSave(save);
  next.unlockedCardIds.push(cardId);
  persistSave(next);
  return next;
}

export function chooseRewardCards(save: SaveV1, random: () => number = Math.random): string[] {
  const pool = ALL_CARD_IDS.filter((id) => !save.unlockedCardIds.includes(id));
  const choices: string[] = [];
  while (choices.length < Math.min(3, pool.length) && pool.length > 0) {
    const index = Math.floor(random() * pool.length);
    const cardId = pool.splice(index, 1)[0];
    if (cardId) choices.push(cardId);
  }
  return choices;
}

export function updateDeck(save: SaveV1, deckCardIds: string[]): SaveV1 {
  if (deckCardIds.length !== 8 || new Set(deckCardIds).size !== 8) throw new Error('牌组必须正好包含 8 张不重复卡牌');
  if (deckCardIds.some((id) => !ALL_CARD_IDS.includes(id) || !save.unlockedCardIds.includes(id))) throw new Error('牌组包含未解锁卡牌');
  const next = cloneSave(save);
  next.deckCardIds = [...deckCardIds];
  persistSave(next);
  return next;
}

export function updateSettings(save: SaveV1, settings: Partial<SaveV1['settings']>): SaveV1 {
  const next = cloneSave(save);
  next.settings = {
    musicVolume: clamp01(settings.musicVolume ?? next.settings.musicVolume),
    sfxVolume: clamp01(settings.sfxVolume ?? next.settings.sfxVolume),
  };
  persistSave(next);
  return next;
}

export function sanitizeSave(input: Partial<SaveV1>): SaveV1 {
  const defaults = createDefaultSave();
  const unlocked = Array.isArray(input.unlockedCardIds) ? input.unlockedCardIds.filter((id) => ALL_CARD_IDS.includes(id)) : defaults.unlockedCardIds;
  const uniqueUnlocked = [...new Set([...INITIAL_UNLOCKED_IDS, ...unlocked])];
  const deck = Array.isArray(input.deckCardIds) ? input.deckCardIds.filter((id) => uniqueUnlocked.includes(id)) : [];
  const uniqueDeck = [...new Set(deck)];
  const fallbackDeck = uniqueDeck.length === 8 ? uniqueDeck : [...uniqueUnlocked].slice(0, 8);
  return {
    version: 1,
    unlockedCardIds: uniqueUnlocked,
    deckCardIds: fallbackDeck.length === 8 ? fallbackDeck : defaults.deckCardIds,
    clearedStageIds: Array.isArray(input.clearedStageIds) ? [...new Set(input.clearedStageIds.filter((id) => [1, 2, 3].includes(id)))].sort() : [],
    settings: {
      musicVolume: clamp01(input.settings?.musicVolume ?? defaults.settings.musicVolume),
      sfxVolume: clamp01(input.settings?.sfxVolume ?? defaults.settings.sfxVolume),
    },
  };
}

function cloneSave(save: SaveV1): SaveV1 {
  return {
    version: 1,
    unlockedCardIds: [...save.unlockedCardIds],
    deckCardIds: [...save.deckCardIds],
    clearedStageIds: [...save.clearedStageIds],
    settings: { ...save.settings },
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}
