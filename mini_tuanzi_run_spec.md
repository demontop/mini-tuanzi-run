# 《鸣潮：小团快跑》AI 生成游戏 Spec

> 用途：本文件用于指导 AI / Codex / Cursor / Claude Code / 其他代码生成工具，生成一个“团子赛跑 + 应援预测 + 直播回放”的轻量级 Web 小游戏工程。  
> 推荐技术栈：TypeScript + Vite + Phaser 3。  
> 重要说明：本 Spec 只描述玩法框架与工程要求，不要求直接使用《鸣潮》官方图片、角色名、Logo、音乐、音效或官方 UI 资源。

---

## 1. 项目目标

生成一个基于 Web 的轻量级 2D 小游戏，核心玩法为：

玩家观看多名“团子”在赛道上自动赛跑，赛前使用“人气值”应援自己看好的团子。比赛开始后进入直播观赛界面，团子通过骰子、技能、堆叠、赛道事件前进。比赛结束后，根据团子名次和玩家预测结果结算奖励。

本项目应实现一个**可配置、可复现、可扩展**的小游戏框架，而不是只写一个写死的 Demo。所有团子、赛程、赛道、技能、奖励、文案、资源路径都应放在配置文件中，方便后续扩展。

---

## 2. IP 与资源约束

本 Spec 只要求实现“团子赛跑 + 应援预测 + 直播回放”的玩法框架。

不要直接内置《鸣潮》官方角色名、官方图片、官方 UI、官方 Logo、官方音乐、官方音效、官方文本，除非用户明确提供了授权资源。

默认资源使用原创占位：

```text
团子A、团子B、团子C……
tuanzi_red.png
tuanzi_blue.png
tuanzi_green.png
```

如果后续用户拥有授权，可以通过 `runners.json` 替换名称、头像、立绘、技能描述。

---

## 3. 推荐技术栈

优先生成 Web 版本，方便直接运行和迭代。

```text
语言：TypeScript
构建：Vite
渲染：Phaser 3
UI：HTML/CSS + TypeScript DOM，或 React + Phaser
数据存储：localStorage，后续可扩展为 Node.js + SQLite
测试：Vitest
```

最低要求：

```bash
npm install
npm run dev
npm run build
npm run test
```

生成后应能在浏览器中直接游玩。

---

## 4. 游戏模式

### 4.1 锦标赛模式

这是主模式。

特点：

```text
12 名团子参赛
分为 A、B 两个小组
每场最多 6 名团子参赛
总共 10 场比赛
玩家赛前应援
比赛开始后进入直播观赛
比赛结束后结算人气值
支持查看赛程、排行榜、回放
```

默认赛程可以这样设计：

```text
Race 01：A组小组赛 上半场
Race 02：A组小组赛 下半场
Race 03：B组小组赛 上半场
Race 04：B组小组赛 下半场
Race 05：A组晋级赛
Race 06：B组晋级赛
Race 07：半决赛一
Race 08：半决赛二
Race 09：季军赛
Race 10：冠军赛
```

注意：赛程必须通过 `schedule.json` 配置，不能写死在代码里。

### 4.2 热身赛模式

热身赛是单人轻度棋盘玩法。

特点：

```text
玩家控制一个漂泊者团子
通过完成每日任务获得骰子
投掷骰子在地图上前进
经过奖励格、事件格、加速格、减速格
领取一次性奖励
地图可循环，也可一次性通关
```

默认用于补充玩法，不影响锦标赛排名。

---

## 5. 核心循环

### 5.1 锦标赛核心循环

```text
进入活动首页
↓
查看今日赛事 / 赛程
↓
选择一个团子进行应援
↓
消耗人气值
↓
等待或点击开始比赛
↓
进入比赛直播界面
↓
系统根据随机种子模拟比赛
↓
团子逐回合投骰子、移动、触发技能、触发堆叠
↓
产生名次
↓
根据玩家应援团子的名次结算奖励
↓
保存比赛结果
↓
允许查看回放
```

### 5.2 热身赛核心循环

```text
进入热身赛
↓
领取每日任务
↓
完成任务获得骰子
↓
投骰子
↓
团子在棋盘上前进
↓
触发格子奖励或事件
↓
领取奖励
↓
保存进度
```

---

## 6. 页面与 UI 需求

### 6.1 活动首页

页面内容：

```text
活动名称：小团快跑
当前人气值
今日赛事入口
热身赛入口
赛程入口
奖励入口
排行榜入口
回放入口
```

状态展示：

```text
今日比赛：A组小组赛 上半场
比赛状态：应援中 / 已锁定 / 直播中 / 已结束
应援截止时间
比赛开始时间
```

### 6.2 赛程页面

显示 10 场比赛。

每场比赛显示：

```text
比赛编号
比赛名称
参赛团子
比赛状态
冠军
玩家是否已应援
是否可观看回放
```

状态枚举：

```ts
type RaceStatus =
  | "LOCKED"
  | "SUPPORT_OPEN"
  | "SUPPORT_CLOSED"
  | "LIVE"
  | "FINISHED";
```

### 6.3 应援页面

玩家可以选择一个团子应援。

显示内容：

```text
参赛团子头像
团子名称
团子技能
历史战绩
当前人气
应援按钮
预计奖励说明
```

应援规则：

```text
每场比赛只能应援一个团子
应援后不可更改
应援消耗固定人气值，默认 100
如果人气值不足，则按钮置灰
比赛开始后不能应援
```

### 6.4 比赛直播页面

这是游戏核心页面。

画面组成：

```text
顶部：比赛名称、回合数、当前领先团子
中间：横向或环形赛道
赛道上：多个团子实时移动
右侧：排名列表
底部：事件日志
右侧或下方：弹幕区
```

直播表现：

```text
每个团子移动时播放跳跃动画
触发技能时播放特效
堆叠时团子上下叠放
超越时显示“反超！”
接近终点时显示“冲刺！”
到达终点时显示排名
```

直播控制：

```text
播放 / 暂停
1x / 2x / 4x 加速
跳过至结果
重新播放
```

### 6.5 回放页面

每场已结束比赛都可以回放。

回放必须基于 `raceEventLog` 重放，而不是重新随机生成。

要求：

```text
同一场比赛的回放结果必须完全一致
回放时可以加速
回放可以暂停
可以跳到结算画面
```

### 6.6 奖励页面

奖励分两类：

```text
应援奖励：参与应援达到次数后领取
人气奖励：累计获得人气值达到阈值后领取
```

示例：

```json
{
  "supportRewards": [
    { "requiredSupportCount": 1, "reward": "金币 x1000" },
    { "requiredSupportCount": 3, "reward": "抽奖券 x1" },
    { "requiredSupportCount": 5, "reward": "头像框 x1" }
  ],
  "popularityRewards": [
    { "requiredPopularity": 500, "reward": "金币 x2000" },
    { "requiredPopularity": 1000, "reward": "装饰道具 x1" },
    { "requiredPopularity": 2000, "reward": "纪念徽章 x1" }
  ]
}
```

---

## 7. 数据结构

### 7.1 团子配置 `runners.json`

```json
[
  {
    "id": "tuanzi_001",
    "name": "红团子",
    "group": "A",
    "avatar": "assets/runners/tuanzi_red_avatar.png",
    "sprite": "assets/runners/tuanzi_red.png",
    "description": "稳定型选手，移动距离波动较小。",
    "baseDice": [1, 2, 3],
    "skillIds": ["stable_step"],
    "tags": ["stable"]
  },
  {
    "id": "tuanzi_002",
    "name": "蓝团子",
    "group": "A",
    "avatar": "assets/runners/tuanzi_blue_avatar.png",
    "sprite": "assets/runners/tuanzi_blue.png",
    "description": "后追型选手，落后时有概率额外前进。",
    "baseDice": [1, 2, 3],
    "skillIds": ["comeback_boost"],
    "tags": ["comeback"]
  }
]
```

### 7.2 技能配置 `skills.json`

技能必须数据化，不能把所有技能写死在角色代码里。

```json
[
  {
    "id": "stable_step",
    "name": "稳定步伐",
    "trigger": "BEFORE_ROLL",
    "description": "本团子的骰子最小值提高到2。",
    "effect": {
      "type": "MODIFY_DICE_RANGE",
      "dice": [2, 3]
    }
  },
  {
    "id": "comeback_boost",
    "name": "后追冲刺",
    "trigger": "AFTER_ROLL",
    "description": "如果当前排名在后半区，有30%概率额外前进2格。",
    "condition": {
      "type": "RANK_BELOW",
      "rankPercent": 0.5
    },
    "effect": {
      "type": "EXTRA_STEP",
      "chance": 0.3,
      "steps": 2
    }
  },
  {
    "id": "stack_jump",
    "name": "叠叠跳",
    "trigger": "ON_STACKED",
    "description": "当落到其他团子所在格时，额外前进1格。",
    "effect": {
      "type": "EXTRA_STEP",
      "steps": 1
    }
  },
  {
    "id": "teleport_to_front",
    "name": "向前贴贴",
    "trigger": "AFTER_MOVE",
    "description": "有20%概率传送到前方最近团子所在格。",
    "effect": {
      "type": "TELEPORT_TO_NEAREST_AHEAD",
      "chance": 0.2
    }
  }
]
```

### 7.3 赛道配置 `tracks.json`

```json
[
  {
    "id": "default_track",
    "name": "庆典赛道",
    "length": 32,
    "layout": "horizontal",
    "cells": [
      { "index": 0, "type": "START" },
      { "index": 4, "type": "BOOST", "steps": 1 },
      { "index": 8, "type": "SLOW", "steps": -1 },
      { "index": 12, "type": "NORMAL" },
      { "index": 16, "type": "RANDOM_EVENT" },
      { "index": 24, "type": "BOOST", "steps": 2 },
      { "index": 31, "type": "FINISH" }
    ]
  }
]
```

赛道格子类型：

```ts
type CellType =
  | "START"
  | "NORMAL"
  | "BOOST"
  | "SLOW"
  | "RANDOM_EVENT"
  | "TELEPORT"
  | "REWARD"
  | "FINISH";
```

### 7.4 赛程配置 `schedule.json`

```json
[
  {
    "id": "race_001",
    "name": "A组小组赛 上半场",
    "trackId": "default_track",
    "runnerIds": [
      "tuanzi_001",
      "tuanzi_002",
      "tuanzi_003",
      "tuanzi_004",
      "tuanzi_005",
      "tuanzi_006"
    ],
    "status": "SUPPORT_OPEN",
    "supportCost": 100,
    "seed": 10001
  },
  {
    "id": "race_002",
    "name": "A组小组赛 下半场",
    "trackId": "default_track",
    "runnerIds": [
      "tuanzi_001",
      "tuanzi_002",
      "tuanzi_003",
      "tuanzi_004",
      "tuanzi_005",
      "tuanzi_006"
    ],
    "status": "LOCKED",
    "supportCost": 100,
    "seed": 10002
  }
]
```

---

## 8. 比赛规则

### 8.1 基本规则

```text
每场比赛有 N 个团子，默认 N = 6
赛道长度默认 32 格
所有团子从 0 格出发
比赛按回合进行
每回合随机决定行动顺序
每个团子行动时投骰子
默认骰子点数为 1、2、3
团子前进对应步数
落到特殊格时触发格子效果
落到其他团子所在格时触发堆叠
率先到达或超过终点的团子获得第一名
继续模拟直到所有团子完成比赛，或者产生前三名后结束
```

### 8.2 行动顺序

每回合开始时，对所有未完成比赛的团子进行随机洗牌。

要求：

```text
使用确定性 PRNG
同一个 seed 下，行动顺序完全一致
回放不能重新随机
```

伪代码：

```ts
function getTurnOrder(runners, rng) {
  return shuffle(runners.filter(r => !r.finished), rng);
}
```

### 8.3 骰子规则

默认骰子：

```text
1、2、3 等概率
```

但技能可以修改骰子，例如：

```text
固定走 3
只会走 2~3
有概率走 0
有概率走 2/4/6
落后时额外走 2
领先时减速
```

所有骰子变化必须通过技能系统实现。

### 8.4 堆叠规则

默认堆叠规则：

```text
当团子 A 移动后落在团子 B 所在格时，A 叠在 B 上方。
同一格可以堆叠多个团子。
后到的团子位于堆叠上层。
当某个团子移动时，可以携带它上方的所有团子一起移动。
被携带的团子不触发自己的骰子，但可以触发被动技能。
```

堆叠移动示例：

```text
格子 10 上从下到上是：红团子、蓝团子、绿团子

如果红团子行动：
红、蓝、绿一起移动。

如果蓝团子行动：
蓝、绿一起移动，红留在原地。

如果绿团子行动：
只有绿移动。
```

该规则必须可以配置：

```json
{
  "stackMoveMode": "CARRY_ABOVE"
}
```

可选值：

```text
NONE：不启用堆叠
VISUAL_ONLY：只显示堆叠，不影响移动
CARRY_ABOVE：移动时携带上方团子
CARRY_ALL：同格所有团子一起移动
```

### 8.5 排名规则

排名优先级：

```text
1. 到达终点的回合更早者排名更高
2. 同一回合到达终点时，行动顺序更早者排名更高
3. 如果仍相同，终点超出格数更多者排名更高
4. 如果仍相同，按 runnerId 字典序稳定排序
```

每场比赛输出：

```ts
interface RaceResult {
  raceId: string;
  rankings: {
    runnerId: string;
    rank: number;
    finishRound: number;
    finishOrder: number;
    finalPosition: number;
  }[];
  eventLog: RaceEvent[];
}
```

---

## 9. 技能系统

### 9.1 技能触发时机

```ts
type SkillTrigger =
  | "ON_RACE_START"
  | "BEFORE_TURN"
  | "BEFORE_ROLL"
  | "AFTER_ROLL"
  | "BEFORE_MOVE"
  | "AFTER_MOVE"
  | "ON_STACKED"
  | "ON_PASS_RUNNER"
  | "ON_BEING_PASSED"
  | "ON_ENTER_CELL"
  | "ON_NEAR_FINISH"
  | "ON_RACE_FINISH";
```

### 9.2 技能效果类型

```ts
type SkillEffectType =
  | "MODIFY_DICE_RANGE"
  | "FIXED_STEP"
  | "EXTRA_STEP"
  | "SKIP_TURN"
  | "TELEPORT"
  | "TELEPORT_TO_NEAREST_AHEAD"
  | "SWAP_WITH_RUNNER"
  | "PULL_BACK_LEADER"
  | "BOOST_IF_BEHIND"
  | "SLOW_IF_AHEAD"
  | "IMMUNE_SLOW"
  | "STACK_BONUS"
  | "RANDOM_WEIGHTED_STEP";
```

### 9.3 技能结算顺序

每个团子行动时按以下顺序结算：

```text
BEFORE_TURN
BEFORE_ROLL
投骰子
AFTER_ROLL
BEFORE_MOVE
移动
ON_PASS_RUNNER
ON_BEING_PASSED
ON_ENTER_CELL
ON_STACKED
AFTER_MOVE
检查是否到达终点
ON_RACE_FINISH
```

---

## 10. 比赛引擎伪代码

```ts
function simulateRace(raceConfig, runners, track, seed): RaceResult {
  const rng = createSeededRng(seed);
  const state = createInitialRaceState(raceConfig, runners, track);
  const eventLog: RaceEvent[] = [];

  triggerRaceStartSkills(state, eventLog, rng);

  while (!isRaceFinished(state)) {
    state.round += 1;

    const turnOrder = getTurnOrder(state.runners, rng);
    eventLog.push({
      type: "TURN_ORDER",
      round: state.round,
      runnerIds: turnOrder.map(r => r.id)
    });

    for (const runner of turnOrder) {
      if (runner.finished) continue;

      triggerSkills("BEFORE_TURN", runner, state, eventLog, rng);
      triggerSkills("BEFORE_ROLL", runner, state, eventLog, rng);

      const dice = rollDice(runner, state, rng);
      eventLog.push({
        type: "ROLL",
        round: state.round,
        runnerId: runner.id,
        value: dice
      });

      triggerSkills("AFTER_ROLL", runner, state, eventLog, rng);

      const moveSteps = calculateFinalMoveSteps(runner, dice, state);
      moveRunnerWithStack(runner, moveSteps, state, eventLog);

      resolveCellEffect(runner, state, eventLog, rng);
      resolveStacking(runner, state, eventLog);
      triggerSkills("AFTER_MOVE", runner, state, eventLog, rng);

      checkFinish(runner, state, eventLog);
    }
  }

  return buildRaceResult(state, eventLog);
}
```

---

## 11. 事件日志

比赛和回放都依赖事件日志。

```ts
type RaceEvent =
  | TurnOrderEvent
  | RollEvent
  | MoveEvent
  | SkillEvent
  | StackEvent
  | CellEvent
  | RankEvent
  | FinishEvent;

interface RollEvent {
  type: "ROLL";
  round: number;
  runnerId: string;
  value: number;
}

interface MoveEvent {
  type: "MOVE";
  round: number;
  runnerId: string;
  from: number;
  to: number;
  carriedRunnerIds?: string[];
}

interface SkillEvent {
  type: "SKILL";
  round: number;
  runnerId: string;
  skillId: string;
  description: string;
}

interface StackEvent {
  type: "STACK";
  round: number;
  cellIndex: number;
  stackRunnerIds: string[];
}

interface FinishEvent {
  type: "FINISH";
  round: number;
  runnerId: string;
  rank: number;
}
```

---

## 12. 应援与结算系统

### 12.1 玩家数据

```ts
interface PlayerState {
  popularity: number;
  supportedRaces: Record<string, SupportRecord>;
  claimedRewards: string[];
  finishedRaceIds: string[];
}

interface SupportRecord {
  raceId: string;
  runnerId: string;
  cost: number;
  timestamp: number;
  settled: boolean;
  rewardPopularity?: number;
}
```

默认初始值：

```json
{
  "popularity": 1000,
  "supportedRaces": {},
  "claimedRewards": [],
  "finishedRaceIds": []
}
```

### 12.2 应援规则

```text
应援消耗人气值
每场只能应援一次
应援后不可撤销
比赛开始后不可应援
```

默认消耗：

```text
100 人气值 / 场
```

### 12.3 结算规则

默认奖励：

```text
应援团子第 1 名：获得 300 人气值
应援团子第 2 名：获得 180 人气值
应援团子第 3 名：获得 120 人气值
应援团子第 4 名及以后：获得 50 人气值
```

配置：

```json
{
  "supportPayout": {
    "1": 300,
    "2": 180,
    "3": 120,
    "default": 50
  }
}
```

结算逻辑：

```ts
function settleSupport(player, raceResult, supportRecord, payoutConfig) {
  const rank = raceResult.rankings.find(
    r => r.runnerId === supportRecord.runnerId
  )?.rank;

  const reward =
    payoutConfig[String(rank)] ?? payoutConfig.default;

  player.popularity += reward;
  supportRecord.settled = true;
  supportRecord.rewardPopularity = reward;
}
```

---

## 13. 弹幕系统

弹幕分为两类：

```text
系统弹幕
玩家弹幕
```

MVP 可以只做系统弹幕。

系统弹幕触发条件：

```text
比赛开始
团子领先
团子反超
团子触发技能
团子被堆叠
团子冲刺
团子夺冠
```

示例弹幕：

```json
[
  "冲冲冲！",
  "这个技能太关键了！",
  "要反超了吗？",
  "前方团子危险！",
  "最后冲刺！",
  "冠军诞生！"
]
```

弹幕要求：

```text
从右往左移动
透明背景
可开关
不会遮挡核心赛道
```

---

## 14. 美术与表现

### 14.1 画风

```text
可爱
圆润
庆典感
高饱和但不刺眼
团子有弹跳感
UI 类似轻量活动页
```

### 14.2 资源占位

AI 生成代码时可以先用几何图形代替正式资源：

```text
团子：彩色圆形
赛道：格子矩形
技能：闪光圆环
终点：旗帜图标
```

后续资源替换路径：

```text
assets/runners/
assets/ui/
assets/effects/
assets/audio/
```

### 14.3 动画要求

```text
团子移动：跳跃式位移
投骰子：骰子旋转 0.5 秒
技能触发：团子周围出现光圈
堆叠：团子纵向偏移显示
冲刺：拖尾效果
到达终点：放大 + 彩带
```

---

## 15. 音效需求

MVP 可选。

建议音效：

```text
点击按钮
投骰子
团子移动
技能触发
堆叠
到达终点
领取奖励
```

所有音效路径放入 `audio.json`：

```json
{
  "click": "assets/audio/click.mp3",
  "dice": "assets/audio/dice.mp3",
  "move": "assets/audio/move.mp3",
  "skill": "assets/audio/skill.mp3",
  "finish": "assets/audio/finish.mp3"
}
```

---

## 16. 工程目录结构

```text
mini-tuanzi-run/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── public/
│   └── assets/
│       ├── runners/
│       ├── ui/
│       ├── effects/
│       └── audio/
├── src/
│   ├── main.ts
│   ├── app.ts
│   ├── styles/
│   │   └── main.css
│   ├── data/
│   │   ├── runners.json
│   │   ├── skills.json
│   │   ├── tracks.json
│   │   ├── schedule.json
│   │   ├── rewards.json
│   │   └── settings.json
│   ├── core/
│   │   ├── rng.ts
│   │   ├── raceEngine.ts
│   │   ├── raceTypes.ts
│   │   ├── skillEngine.ts
│   │   ├── stackEngine.ts
│   │   ├── rewardEngine.ts
│   │   └── replayEngine.ts
│   ├── game/
│   │   ├── scenes/
│   │   │   ├── BootScene.ts
│   │   │   ├── RaceScene.ts
│   │   │   └── WarmupScene.ts
│   │   ├── objects/
│   │   │   ├── RunnerSprite.ts
│   │   │   ├── TrackView.ts
│   │   │   └── DiceView.ts
│   │   └── effects/
│   │       └── SkillEffect.ts
│   ├── ui/
│   │   ├── HomePage.ts
│   │   ├── SchedulePage.ts
│   │   ├── SupportPage.ts
│   │   ├── RaceLivePage.ts
│   │   ├── ReplayPage.ts
│   │   ├── RewardPage.ts
│   │   └── RankingPage.ts
│   ├── storage/
│   │   └── localSave.ts
│   └── tests/
│       ├── raceEngine.test.ts
│       ├── skillEngine.test.ts
│       ├── stackEngine.test.ts
│       └── rewardEngine.test.ts
└── README.md
```

---

## 17. 本地存档

使用 `localStorage` 保存：

```ts
interface SaveData {
  version: number;
  player: PlayerState;
  raceResults: Record<string, RaceResult>;
  replayLogs: Record<string, RaceEvent[]>;
}
```

存档 Key：

```text
mini_tuanzi_run_save_v1
```

要求：

```text
刷新页面后数据不丢失
已完成比赛不重复结算
已领取奖励不重复领取
支持清空存档按钮
```

---

## 18. 随机数要求

必须实现确定性随机数。

推荐 `mulberry32`：

```ts
export function createRng(seed: number) {
  let t = seed >>> 0;
  return function rng() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
```

要求：

```text
同一个 seed、同一份配置，比赛结果必须完全一致
比赛直播和回放不能出现不同结果
测试中必须覆盖这一点
```

---

## 19. 测试要求

### 19.1 比赛引擎测试

```text
同一 seed 结果一致
不同 seed 结果可能不同
团子能正确到达终点
排名规则正确
事件日志完整
```

### 19.2 技能测试

```text
固定步数技能生效
额外步数技能生效
传送技能生效
落后增强技能只在落后时生效
技能触发日志正确
```

### 19.3 堆叠测试

```text
落在同格时正确堆叠
后到者在上方
CARRY_ABOVE 模式下移动时携带上方团子
VISUAL_ONLY 模式下不影响移动
```

### 19.4 应援结算测试

```text
人气不足不能应援
同一场比赛不能重复应援
第一名奖励正确
第二名奖励正确
第三名奖励正确
未进前三奖励正确
已结算比赛不能重复结算
```

---

## 20. MVP 验收标准

AI 生成的第一版必须满足以下标准：

```text
1. 可以 npm install && npm run dev 启动
2. 首页能进入小团快跑活动
3. 至少有 12 个团子配置
4. 至少有 10 场赛程配置
5. 玩家可以选择一场比赛应援
6. 比赛可以播放，团子能在赛道上移动
7. 至少支持骰子、移动、排名、结算
8. 至少支持 3 种技能
9. 至少支持堆叠显示
10. 比赛结束后能显示名次
11. 根据名次结算人气值
12. 已结束比赛可以回放
13. 刷新页面后存档保留
14. 所有核心规则不能写死，必须通过 JSON 配置
```

---

## 21. 扩展功能

后续可以扩展：

```text
真实倒计时系统
每日任务系统
更多赛道
更多团子技能
观赛弹幕输入
排行榜
AI 自动解说
比赛预测胜率模拟
多语言
移动端适配
后端存档
多人观赛
活动邮件补发
```

---

## 22. 给代码生成 AI 的最终指令

可以把下面这一段直接贴给生成代码的 AI：

```text
请根据以下 Spec 生成一个完整的 TypeScript + Vite + Phaser 3 Web 小游戏工程，项目名为 mini-tuanzi-run。

目标是实现一个“团子赛跑 + 应援预测 + 直播回放”的小游戏。不要使用任何未经授权的《鸣潮》官方图片、角色名、Logo、音乐或音效，默认使用原创占位团子和几何图形资源。所有团子、技能、赛道、赛程、奖励都必须 JSON 配置化。

必须实现：
1. 首页
2. 赛程页
3. 应援页
4. 比赛直播页
5. 回放页
6. 奖励页
7. 12 个团子
8. 10 场比赛
9. 确定性随机数
10. 骰子移动
11. 技能系统
12. 堆叠系统
13. 排名系统
14. 应援消耗与奖励结算
15. localStorage 存档
16. Vitest 单元测试

技术要求：
- TypeScript
- Vite
- Phaser 3
- 不需要后端
- 使用 localStorage 存档
- npm install 后可以 npm run dev 直接运行
- npm run test 可以跑核心逻辑测试
- 工程结构清晰，核心逻辑和 UI 分离
- 比赛结果必须可由 seed 复现
- 回放必须基于 eventLog，而不是重新随机模拟

请先生成完整目录结构、package.json、核心源码、配置文件、测试文件和 README。
```

---

## 23. 参考资料

以下资料仅用于理解公开玩法信息，不应直接复制其中的官方素材、官方 UI、官方文案或官方资源。

```text
游民星空：《鸣潮》小团快跑玩法介绍
https://www.gamersky.com/handbook/202505/1926056.shtml

库街区 Wiki：小团快跑·热身赛
https://wiki.kurobbs.com/mc/item/1366143670900662272

巴哈姆特论坛玩家整理：小团快跑规则与攻略讨论
https://forum.gamer.com.tw/C.php?bsn=74934&snA=16806
```

---

## 24. 总结

这份 Spec 的核心是：

```text
确定性赛跑模拟器
+
配置化技能系统
+
堆叠与赛道事件系统
+
应援结算系统
+
直播与回放 UI
```

这样 AI 生成出来的不是一次性 Demo，而是后续可以继续加团子、加技能、加赛道、加活动周期的小游戏框架。
