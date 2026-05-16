# 小团快跑

基于当前 `mini_tuanzi_run_spec.md` 生成的 Web 小游戏工程：团子赛跑、应援预测、直播回放、奖励结算和 PeerJS/WebRTC 联机观赛。

## 本地运行

```bash
npm install
npm run dev
npm run test
npm run build
```

## 部署

项目是 Vite 静态前端，已包含：

- `vercel.json`
- `netlify.toml`

推到 GitHub 后，可直接导入 Vercel 或 Netlify。联机房间使用 PeerJS 公共信令服务建立 WebRTC 数据连接，不需要自建后端。

## 已实现

- 12 个原创团子配置：`src/data/runners.json`
- 10 场赛程配置：`src/data/schedule.json`
- 配置化技能、赛道、奖励和设置
- 确定性 PRNG 与可复现比赛引擎
- 骰子、移动、堆叠、赛道事件、技能、排名
- 应援消耗、人气奖励结算和 localStorage 存档
- 基于 `eventLog` 的直播与回放
- 热身赛棋盘玩法
- PeerJS 联机房间：房主同步比赛，观众加入房间码一起观看和发弹幕
- Vitest 核心逻辑测试

## 资源约束

本工程没有内置任何未经授权的官方图片、角色名、Logo、音乐或音效。当前团子和赛道均为原创占位几何表现，后续可通过 JSON 和 `public/assets/` 替换素材。
