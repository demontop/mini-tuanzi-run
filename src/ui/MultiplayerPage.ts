import { MultiplayerRoom, type MultiplayerMessage } from "../network/MultiplayerRoom";
import { RacePlayer } from "./RacePlayer";
import type { AppContext } from "./context";
import { bindRouteButtons, raceById, routeButton, setMain } from "./pageUtils";

export function renderMultiplayerPage(ctx: AppContext): () => void {
  let room: MultiplayerRoom | undefined;
  let player: RacePlayer | undefined;
  let currentStart: Extract<MultiplayerMessage, { type: "RACE_START" }> | undefined;
  let currentSync: Extract<MultiplayerMessage, { type: "RACE_SYNC" }> | undefined;

  setMain(
    ctx,
    "联机房间",
    `
      <section class="multiplayer-grid">
        <div class="room-panel">
          <h2>创建房间</h2>
          <p class="muted">房主负责播放比赛，观众用房间码同步观看。</p>
          <label>比赛
            <select data-host-race>
              ${ctx.data.schedule.map((race) => `<option value="${race.id}">${race.name}</option>`).join("")}
            </select>
          </label>
          <div class="action-row">
            <button class="btn primary" data-host>创建</button>
            <button class="btn secondary" data-start disabled>开始同步</button>
          </div>
          <p class="room-code" data-room-code>房间码：等待创建</p>
        </div>
        <div class="room-panel">
          <h2>加入房间</h2>
          <label>昵称 <input data-name value="团子观众" maxlength="16" /></label>
          <label>房间码 <input data-room-input placeholder="粘贴房主房间码" /></label>
          <div class="action-row">
            <button class="btn primary" data-join>加入</button>
          </div>
          <p class="muted" data-room-status>PeerJS 会使用公共信令服务建立 WebRTC 数据连接。</p>
        </div>
      </section>
      <section class="cheer-line">
        <input data-cheer-input placeholder="发一条应援弹幕" maxlength="40" />
        <button class="btn secondary" data-cheer>发送</button>
      </section>
      <section class="toolbar-line">${routeButton("返回首页", "/")}</section>
      <section data-online-player></section>
      <section class="event-log" data-online-log></section>
    `
  );

  const logPanel = ctx.root.querySelector<HTMLElement>("[data-online-log]")!;
  const mount = ctx.root.querySelector<HTMLElement>("[data-online-player]")!;
  const roomCode = ctx.root.querySelector<HTMLElement>("[data-room-code]")!;
  const status = ctx.root.querySelector<HTMLElement>("[data-room-status]")!;
  const startButton = ctx.root.querySelector<HTMLButtonElement>("[data-start]")!;

  function log(message: string): void {
    const line = document.createElement("p");
    line.textContent = message;
    logPanel.prepend(line);
  }

  function ensureRoom(): MultiplayerRoom {
    if (!room) {
      room = new MultiplayerRoom((event) => {
        if (event.type === "open") {
          status.textContent = `已连接：${event.id}`;
          roomCode.textContent = `房间码：${event.id}`;
        }
        if (event.type === "peer") {
          log(`玩家接入：${event.id}`);
          if (currentStart) {
            room?.broadcast(currentStart);
          }
          if (currentSync) {
            room?.broadcast(currentSync);
          }
        }
        if (event.type === "close") {
          log(`连接离开：${event.id ?? "未知玩家"}`);
        }
        if (event.type === "error") {
          log(`联机错误：${event.message}`);
        }
        if (event.type === "data") {
          handleMessage(event.message);
        }
      });
    }
    return room;
  }

  function handleMessage(message: MultiplayerMessage): void {
    if (message.type === "HELLO") {
      log(`${message.name} 加入房间`);
      return;
    }

    if (message.type === "CHEER") {
      log(`${message.name}：${message.text}`);
      room?.broadcast(message);
      return;
    }

    if (message.type === "RACE_START") {
      currentStart = message;
      const race = raceById(ctx, message.raceId);
      player?.destroy();
      mount.innerHTML = "";
      player = new RacePlayer(ctx, mount, race, message.result, {
        title: "联机同步",
        autoplay: false
      });
      log(`同步比赛：${race.name}`);
      return;
    }

    if (message.type === "RACE_SYNC") {
      currentSync = message;
      player?.setRemoteSnapshot(message.snapshot, message.cursor, message.playing, message.speed);
    }
  }

  ctx.root.querySelector<HTMLElement>("[data-host]")?.addEventListener("click", async () => {
    const activeRoom = ensureRoom();
    await activeRoom.host();
    startButton.disabled = false;
  });

  startButton.addEventListener("click", () => {
    const select = ctx.root.querySelector<HTMLSelectElement>("[data-host-race]")!;
    const race = raceById(ctx, select.value);
    const result = ctx.save.raceResults[race.id] ?? ctx.runRace(race.id);
    currentStart = {
      type: "RACE_START",
      raceId: race.id,
      result
    };
    room?.broadcast(currentStart);
    player?.destroy();
    mount.innerHTML = "";
    player = new RacePlayer(ctx, mount, race, result, {
      title: "房主同步直播",
      autoplay: true,
      onSnapshot: (snapshot, cursor, playing, speed) => {
        currentSync = {
          type: "RACE_SYNC",
          raceId: race.id,
          snapshot,
          cursor,
          playing,
          speed
        };
        room?.broadcast(currentSync);
      }
    });
  });

  ctx.root.querySelector<HTMLElement>("[data-join]")?.addEventListener("click", async () => {
    const code = ctx.root.querySelector<HTMLInputElement>("[data-room-input]")!.value.trim();
    const name = ctx.root.querySelector<HTMLInputElement>("[data-name]")!.value.trim() || "团子观众";
    if (!code) {
      log("请输入房间码");
      return;
    }
    await ensureRoom().join(code, name);
  });

  ctx.root.querySelector<HTMLElement>("[data-cheer]")?.addEventListener("click", () => {
    const input = ctx.root.querySelector<HTMLInputElement>("[data-cheer-input]")!;
    const text = input.value.trim();
    const name = ctx.root.querySelector<HTMLInputElement>("[data-name]")?.value.trim() || "团子观众";
    if (!text) return;
    const message: MultiplayerMessage = { type: "CHEER", name, text };
    room?.broadcast(message);
    log(`${name}：${text}`);
    input.value = "";
  });

  bindRouteButtons(ctx);

  return () => {
    player?.destroy();
    room?.close();
  };
}
