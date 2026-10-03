import Phaser from 'phaser';
import { CARDS } from '../data/cards';
import type { CardDefinition, FusionResult } from '../core/types';

const TYPE_COLORS: Record<string, number> = {
  unit: 0x3bb6d4,
  building: 0xb8864e,
  spell: 0x8156b8,
  trap: 0x55b66c,
  catalyst: 0xf0b84f,
  fusion: 0xf08b4f,
};

export function ensurePlaceholderTextures(scene: Phaser.Scene): void {
  for (const card of Object.values(CARDS)) {
    if (scene.textures.exists(card.artKey)) continue;
    drawCardTexture(scene, card.artKey, card);
  }
  if (!scene.textures.exists('tower_king_player')) drawTowerTexture(scene, 'tower_king_player', 0x3bb6d4, true);
  if (!scene.textures.exists('tower_guard_player')) drawTowerTexture(scene, 'tower_guard_player', 0x3bb6d4, false);
  if (!scene.textures.exists('tower_king_enemy')) drawTowerTexture(scene, 'tower_king_enemy', 0xd85b67, true);
  if (!scene.textures.exists('tower_guard_enemy')) drawTowerTexture(scene, 'tower_guard_enemy', 0xd85b67, false);
  if (!scene.textures.exists('particle_dot')) drawParticle(scene);
  if (!scene.textures.exists('spell_fusion_generic')) drawGenericFusion(scene, 'spell_fusion_generic', 0x9b6de0);
  if (!scene.textures.exists('trap_fusion_generic')) drawGenericFusion(scene, 'trap_fusion_generic', 0x62ca83);
}

export function ensureFusionTexture(scene: Phaser.Scene, result: FusionResult): string {
  if (scene.textures.exists(result.artKey)) return result.artKey;
  const baseKey = result.type === 'spell' || result.type === 'trap' ? `${result.type}_fusion_generic` : null;
  if (baseKey && scene.textures.exists(baseKey)) return baseKey;
  drawGenericFusion(scene, result.artKey, result.signature ? 0xf0b84f : TYPE_COLORS[result.type] ?? 0xf08b4f);
  return result.artKey;
}

function drawCardTexture(scene: Phaser.Scene, key: string, card: CardDefinition): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  const color = TYPE_COLORS[card.type] ?? 0xffffff;
  const dark = Phaser.Display.Color.IntegerToColor(color).darken(35).color;
  graphics.fillStyle(0x201827, 1);
  graphics.fillRoundedRect(4, 4, 56, 56, 8);
  graphics.lineStyle(4, color, 1);
  graphics.strokeRoundedRect(4, 4, 56, 56, 8);
  graphics.fillStyle(dark, 1);
  graphics.fillCircle(32, 31, 19);
  graphics.fillStyle(color, 1);
  if (card.type === 'unit') {
    graphics.fillRect(23, 21, 18, 22);
    graphics.fillRect(17, 27, 30, 8);
    graphics.fillRect(20, 43, 7, 10);
    graphics.fillRect(37, 43, 7, 10);
  } else if (card.type === 'building') {
    graphics.fillRect(20, 25, 24, 28);
    graphics.fillRect(16, 48, 32, 6);
    graphics.fillStyle(0x201827, 1);
    graphics.fillRect(29, 35, 7, 18);
  } else if (card.type === 'spell') {
    graphics.fillCircle(32, 33, 13);
    graphics.fillRect(29, 12, 6, 15);
    graphics.fillStyle(0xffef9a, 1);
    graphics.fillCircle(27, 29, 4);
  } else if (card.type === 'trap') {
    graphics.fillTriangle(32, 14, 49, 48, 15, 48);
    graphics.fillStyle(0x201827, 1);
    graphics.fillRect(29, 29, 6, 13);
  } else {
    graphics.fillTriangle(32, 13, 49, 49, 15, 49);
    graphics.fillStyle(0xffef9a, 1);
    graphics.fillCircle(32, 34, 8);
  }
  graphics.generateTexture(key, 64, 64);
  graphics.destroy();
}

function drawTowerTexture(scene: Phaser.Scene, key: string, color: number, king: boolean): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0x201827, 1);
  graphics.fillRoundedRect(6, 12, 84, 78, 8);
  graphics.lineStyle(5, color, 1);
  graphics.strokeRoundedRect(6, 12, 84, 78, 8);
  graphics.fillStyle(color, 1);
  graphics.fillRect(20, king ? 30 : 40, 56, king ? 50 : 40);
  graphics.fillRect(14, 22, 16, 21);
  graphics.fillRect(66, 22, 16, 21);
  graphics.fillStyle(0xffef9a, 1);
  graphics.fillCircle(48, king ? 40 : 49, king ? 13 : 10);
  graphics.generateTexture(key, 96, 96);
  graphics.destroy();
}

function drawParticle(scene: Phaser.Scene): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0xffffff, 1);
  graphics.fillRect(0, 0, 8, 8);
  graphics.generateTexture('particle_dot', 8, 8);
  graphics.destroy();
}

function drawGenericFusion(scene: Phaser.Scene, key: string, color: number): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0x201827, 1);
  graphics.fillCircle(32, 32, 27);
  graphics.lineStyle(5, color, 1);
  graphics.strokeCircle(32, 32, 25);
  graphics.fillStyle(color, 1);
  graphics.fillTriangle(32, 11, 51, 47, 13, 47);
  graphics.fillStyle(0xffef9a, 1);
  graphics.fillCircle(32, 35, 8);
  graphics.generateTexture(key, 64, 64);
  graphics.destroy();
}

