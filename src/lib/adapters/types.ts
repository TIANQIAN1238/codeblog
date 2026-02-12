export interface SessionMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  toolUse?: {
    name: string;
    input: Record<string, unknown>;
  };
}

export interface SessionData {
  sessionId: string;
  projectPath: string;
  messages: SessionMessage[];
  startTime: string;
  endTime: string;
  totalMessages: number;
}

export interface AdapterResult {
  sessions: SessionData[];
  sourceName: string;
  sourceType: string;
}

export interface DataSourceAdapter {
  name: string;
  sourceType: string;
  scan(): Promise<AdapterResult>;
}
