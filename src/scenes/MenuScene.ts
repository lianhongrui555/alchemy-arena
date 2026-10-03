import Phaser from 'phaser';
import { audioManager } from '../audio/AudioManager';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../core/constants';
import { createButton, createPanel } from '../ui/components';

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#16111d');
    this.drawBackdrop();
    const panel = createPanel(this, GAME_WIDTH / 2, 535, 680, 760, 0.9);
    panel.setDepth(2);
    this.add.text(960, 245, '熔 炉 对 决', {
      fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '86px', color: '#f6dfaa', fontStyle: 'bold', stroke: '#40234f', strokeThickness: 10,
    }).setOrigin(0.5).setDepth(3);
    this.add.text(960, 333, '随机熔铸 · 三关竞技 · 炼金卡牌对战', {
      fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '26px', color: '#c9b8d6',
    }).setOrigin(0.5).setDepth(3);

    createButton(this, 960, 475, 420, 84, '开始竞技旅程', () => this.scene.start('StageSelect'), { fill: COLORS.gold, hoverFill: 0xffd775, fontSize: 34 }).setDepth(4);
    createButton(this, 960, 585, 420, 74, '编辑牌组', () => this.scene.start('Deck'), { fontSize: 30 }).setDepth(4);
    createButton(this, 960, 685, 420, 74, '设置', () => this.scene.start('Settings'), { fontSize: 30 }).setDepth(4);

    this.add.text(960, 1024, '桌面浏览器体验 · 原创程序音效 · 临时像素占位素材', {
      fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '18px', color: '#756b7f',
    }).setOrigin(0.5).setDepth(3);

    this.input.once('pointerdown', () => audioManager.startMusic());
  }

  private drawBackdrop(): void {
    for (let index = 0; index < 18; index += 1) {
      const x = (index * 137) % GAME_WIDTH;
      const y = (index * 211) % GAME_HEIGHT;
      this.add.circle(x, y, 2 + (index % 4), COLORS.gold, 0.12);
    }
    this.add.circle(285, 810, 220, COLORS.purple, 0.12).setStrokeStyle(3, COLORS.gold, 0.25);
    this.add.circle(1645, 240, 260, COLORS.player, 0.08).setStrokeStyle(3, COLORS.gold, 0.2);
    this.add.circle(960, 535, 390, 0x000000, 0.18).setStrokeStyle(5, COLORS.parchmentDark, 0.34);
  }
}
