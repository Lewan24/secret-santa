export interface Participant {
  id: string;
  name: string;
  photo?: string;
  tokenHash?: string;
}
export interface SantaEvent {
  id: string;
  name: string;
  createdAt: string;
  status: "draft" | "drawn";
  participants: Participant[];
  exclusions: [string, string][];
  noMutual: boolean;
  previousEventId?: string;
  previousAssignments?: Record<string, string>;
  drawRevision?: number;
  assignments: Record<string, string>;
  drawnAt?: string;
}
export interface Session {
  hash: string;
  role: "admin" | "participant";
  eventId?: string;
  participantId?: string;
  csrf: string;
  expires: number;
  adminVersion?: string;
}
export interface Database {
  version: 1;
  events: SantaEvent[];
  sessions: Session[];
  history: {
    eventId: string;
    drawnAt: string;
    assignments: Record<string, string>;
  }[];
}
export type PublicEvent = Omit<
  SantaEvent,
  "assignments" | "participants" | "previousAssignments"
> & {
  hasPreviousDraw: boolean;
  participants: {
    id: string;
    name: string;
    photo?: string;
    hasToken: boolean;
  }[];
};
export interface IssuedCode {
  participantId: string;
  name: string;
  url: string;
  qr: string;
}
