import Phaser from 'phaser';
import { COLORS } from '../core/constants';
import { loadSave } from '../core/save';
import { STAGES } from '../data/levels';
import { createButton, createPanel, createTopBar } from '../ui/components';

export class StageSelectScene extends Phaser.Scene {
  constructor() { super('StageSelect'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#15111c');
    createTopBar(this, '竞技旅程', '胜利后永久解锁新卡牌');
    const save = loadSave();

    STAGES.forEach((stage, index) => {
      const x = 390 + index * 570;
      const unlocked = stage.id === 1 || save.clearedStageIds.includes(stage.id - 1);
      const cleared = save.clearedStageIds.includes(stage.id);
      const panel = createPanel(this, x, 515, 480, 620, 0.97);
      panel.add(this.add.circle(0, -205, 58, unlocked ? COLORS.purple : 0x4a4550, 1).setStrokeStyle(5, unlocked ? COLORS.gold : 0x77717a, 1));
      panel.add(this.add.text(0, -205, unlocked ? String(stage.id) : '锁', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '48px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5));
      panel.add(this.add.text(0, -105, stage.name, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '38px', color: unlocked ? '#f6dfaa' : '#8e8793', fontStyle: 'bold' }).setOrigin(0.5));
      panel.add(this.add.text(0, -42, stage.difficultyLabel, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '20px', color: unlocked ? '#e39b8b' : '#77717a' }).setOrigin(0.5));
      panel.add(this.add.text(0, 52, stage.subtitle, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '21px', color: unlocked ? '#c9b8d6' : '#77717a', align: 'center', wordWrap: { width: 410 } }).setOrigin(0.5));
      panel.add(this.add.text(0, 142, `对手：${stage.aiName}`, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '21px', color: '#b7a9c2' }).setOrigin(0.5));
      const button = createButton(this, x, 715, 300, 72, cleared ? '再次挑战' : unlocked ? '开始对战' : '尚未解锁', () => {
        this.registry.set('selectedStageId', stage.id);
        this.scene.start('Battle');
      }, { disabled: !unlocked, fill: cleared ? COLORS.parchmentDark : COLORS.gold, hoverFill: 0xffd775, fontSize: 27 });
      button.setDepth(5);
    });

    createButton(this, 150, 1010, 220, 64, '返回', () => this.scene.start('Menu'), { fontSize: 24 });
  }
}
