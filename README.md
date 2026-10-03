# 熔炉对决

《熔炉对决》是一款桌面浏览器横向实时卡牌对战小游戏。玩家在双路双桥战场上部署炼金单位、建筑、法术与陷阱，并可以把任意两张手牌投入熔铸工坊，获得隐藏结果的随机融合卡。

## 当前内容

- 三关递增 AI：第一关无加成，第二关生命与伤害 +5%，第三关生命与伤害 +10% 且圣水恢复 +20%。
- 14 张永久收藏卡牌，开局解锁 8 张，每次胜利从未解锁牌中选择一张。
- 8 张出战牌组、4 张手牌循环、圣水恢复、3 分钟常规时间与 1 分钟加时。
- 双路双桥寻路、飞行越河、塔攻击、法术、治疗、减速、持续伤害和陷阱。
- 随机熔铸带价值保底，并包含 6 个招牌配方。
- 原创 WebAudio 芯片音乐与音效。
- 当前使用代码绘制的临时像素素材，正式透明 PNG 可通过资源清单替换。

## 操作方式

1. 点击手牌选中，再点击己方战场部署。
2. 也可以直接把卡牌拖到战场。
3. 点击“熔铸工坊”，选择两张非催化剂牌，再点击“确认熔铸”。
4. 随机结果进入唯一的待部署槽，点击战场释放。
5. 催化剂会限定下一次熔铸的方向。
6. 摧毁国王塔立即获胜；时间结束比较皇冠，平局进入加时。

## 本地开发

需要 Node.js 24、npm 和 Chrome/Edge。

```powershell
npm install
npm run dev
```

开发地址为 `http://127.0.0.1:5173/alchemy-arena/`。

## 测试与构建

```powershell
npm test
npm run test:e2e
npm run build
```

`npm run build` 输出到 `dist/`，可直接部署到任意静态站点。

## 正式素材替换

将透明 PNG 放入 `public/assets/cards/` 或 `public/assets/towers/`，再更新 `src/assets/manifest.ts`。推荐规格见 `public/assets/README.md`。未列入清单的贴图会自动使用临时像素占位图。

## GitHub Pages

推送到公开仓库 `lianhongrui555/alchemy-arena` 的 `main` 分支后，`.github/workflows/deploy.yml` 会构建并发布到：

`https://lianhongrui555.github.io/alchemy-arena/`
