import Phaser from 'phaser';
import { COLORS } from '../core/constants';
import { chooseRewardCards, loadSave, recordVictory, unlockCard } from '../core/save';
import { CARDS } from '../data/cards';
import { createButton, createCardView, createTopBar } from '../ui/components';
import type { SaveV1 } from '../core/types';

interface RewardData { stageId: number; won: boolean; }

export class RewardScene extends Phaser.Scene {
  private stageId = 1;
  private won = false;
  private save: SaveV1 = loadSave();
  private choices: string[] = [];
  private chosen = false;

  constructor() { super('Reward'); }

  init(data: RewardData): void {
    this.stageId = data.stageId ?? 1;
    this.won = data.won ?? false;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#15111c');
    createTopBar(this, this.won ? '胜利！' : '本局失利', this.won ? `已通过第 ${this.stageId} 关` : '调整牌组后再试一次');
    if (!this.won) {
      this.add.text(960, 420, '熔炉仍在稳定运转，失败不会失去卡牌。', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '36px', color: '#f6dfaa', fontStyle: 'bold' }).setOrigin(0.5);
      createButton(this, 960, 585, 380, 78, '返回关卡选择', () => this.scene.start('StageSelect'), { fill: COLORS.gold, hoverFill: 0xffd775, fontSize: 28 });
      return;
    }

    this.save = recordVictory(this.save, this.stageId);
    this.choices = chooseRewardCards(this.save);
    if (this.choices.length === 0) {
      this.add.text(960, 470, '所有 14 张卡牌均已解锁！', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '42px', color: '#f6dfaa', fontStyle: 'bold' }).setOrigin(0.5);
      createButton(this, 960, 620, 380, 78, '返回关卡选择', () => this.scene.start('StageSelect'), { fill: COLORS.gold, hoverFill: 0xffd775, fontSize: 28 });
      return;
    }

    this.add.text(960, 175, '三选一：永久解锁一张新卡', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '30px', color: '#f6dfaa', fontStyle: 'bold' }).setOrigin(0.5);
    this.choices.forEach((cardId, index) => {
      const card = CARDS[cardId];
      if (!card) return;
      const x = 640 + index * 320;
      const view = createCardView(this, x, 450, 250, 350, card, () => this.choose(cardId), false);
      view.setDepth(2);
    });
    this.add.text(960, 720, '选择后可在牌组编辑中调整出战卡牌。', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '22px', color: '#aa9db3' }).setOrigin(0.5);
    createButton(this, 960, 930, 360, 76, '跳过奖励', () => this.scene.start('StageSelect'), { fontSize: 25 });
  }

  private choose(cardId: string): void {
    if (this.chosen) return;
    this.chosen = true;
    this.save = unlockCard(this.save, cardId);
    const card = CARDS[cardId];
    this.add.rectangle(960, 580, 800, 180, 0x17131e, 0.98).setStrokeStyle(5, COLORS.gold, 1).setDepth(10);
    this.add.text(960, 545, `已永久解锁：${card?.name ?? cardId}`, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '34px', color: '#f6dfaa', fontStyle: 'bold' }).setOrigin(0.5).setDepth(11);
    const next = createButton(this, 960, 650, 320, 66, '继续旅程', () => this.scene.start('StageSelect'), { fill: COLORS.gold, hoverFill: 0xffd775, fontSize: 25 });
    next.setDepth(12);
  }
}
