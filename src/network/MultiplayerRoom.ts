import type { RaceResult } from "../core/raceTypes";
import type { ReplaySnapshot } from "../core/replayEngine";

export type MultiplayerMessage =
  | {
      type: "RACE_START";
      raceId: string;
      result: RaceResult;
    }
  | {
      type: "RACE_SYNC";
      raceId: string;
      snapshot: ReplaySnapshot;
      cursor: number;
      playing: boolean;
      speed: number;
    }
  | {
      type: "CHEER";
      name: string;
      text: string;
    }
  | {
      type: "HELLO";
      name: string;
    };

export type MultiplayerEvent =
  | { type: "open"; id: string }
  | { type: "peer"; id: string }
  | { type: "data"; message: MultiplayerMessage }
  | { type: "close"; id?: string }
  | { type: "error"; message: string };

type PeerInstance = import("peerjs").Peer;
type DataConnection = import("peerjs").DataConnection;

export class MultiplayerRoom {
  private peer?: PeerInstance;
  private connections: DataConnection[] = [];

  constructor(private readonly onEvent: (event: MultiplayerEvent) => void) {}

  async host(): Promise<void> {
    const { Peer } = await import("peerjs");
    this.peer = new Peer();
    this.peer.on("open", (id) => this.onEvent({ type: "open", id }));
    this.peer.on("connection", (connection) => this.addConnection(connection));
    this.peer.on("error", (error) => this.onEvent({ type: "error", message: error.message }));
  }

  async join(roomCode: string, name: string): Promise<void> {
    const { Peer } = await import("peerjs");
    this.peer = new Peer();
    this.peer.on("open", (id) => {
      this.onEvent({ type: "open", id });
      const connection = this.peer?.connect(roomCode, { reliable: true });
      if (connection) {
        this.addConnection(connection, () => {
          this.send({ type: "HELLO", name });
        });
      }
    });
    this.peer.on("error", (error) => this.onEvent({ type: "error", message: error.message }));
  }

  broadcast(message: MultiplayerMessage): void {
    for (const connection of this.connections) {
      if (connection.open) {
        connection.send(message);
      }
    }
  }

  send(message: MultiplayerMessage): void {
    const [connection] = this.connections;
    if (connection?.open) {
      connection.send(message);
    }
  }

  close(): void {
    for (const connection of this.connections) {
      connection.close();
    }
    this.connections = [];
    this.peer?.destroy();
  }

  private addConnection(connection: DataConnection, onOpen?: () => void): void {
    this.connections.push(connection);
    connection.on("open", () => {
      this.onEvent({ type: "peer", id: connection.peer });
      onOpen?.();
    });
    connection.on("data", (data) => {
      this.onEvent({ type: "data", message: data as MultiplayerMessage });
    });
    connection.on("close", () => {
      this.connections = this.connections.filter((item) => item !== connection);
      this.onEvent({ type: "close", id: connection.peer });
    });
    connection.on("error", (error) => this.onEvent({ type: "error", message: error.message }));
  }
}
