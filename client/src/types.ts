export interface Me {
  name: string;
  eventName: string;
  ready: boolean;
  drawRevision: number;
}

export interface DrawResult {
  name: string;
  hasPhoto: boolean;
  drawRevision: number;
}

export type RevealPhase = "closed" | "opening" | "revealed";
