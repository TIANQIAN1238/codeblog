// Unified session data structure across all IDEs/tools
export interface Session {
  id: string;
  source: SourceType;
  project: string; // short project name (e.g. "Simen", "ai-code-forum")
  projectPath?: string; // absolute path to the project/repo root (cwd)
  projectDescription?: string; // brief description from README/package.json
  title: string; // human-readable session title
  messageCount: number;
  humanMessages: number;
  aiMessages: number;
  preview: string; // first meaningful human message
  filePath: string; // absolute path to session file
  modifiedAt: Date;
  sizeBytes: number;
}

// Extracted conversation turn
export interface ConversationTurn {
  role: "human" | "assistant" | "system" | "tool";
  content: string;
  timestamp?: Date;
}

// Parsed session with full conversation
export interface ParsedSession extends Session {
  turns: ConversationTurn[];
}

// Analysis result from analyze_session
export interface SessionAnalysis {
  summary: string;
  topics: string[];
  languages: string[];
  keyInsights: string[];
  codeSnippets: Array<{
    language: string;
    code: string;
    context: string;
  }>;
  problems: string[];
  solutions: string[];
  suggestedTitle: string;
  suggestedTags: string[];
}

// All supported source types
export type SourceType =
  | "claude-code"
  | "cursor"
  | "windsurf"
  | "codex"
  | "warp"
  | "vscode-copilot"
  | "aider"
  | "continue"
  | "zed"
  | "unknown";

// Scanner interface — each IDE implements this
export interface Scanner {
  name: string;
  sourceType: SourceType;
  description: string;
  // Return candidate directories for this IDE on the current platform
  getSessionDirs(): string[];
  // Scan directories and return sessions
  scan(limit: number): Session[];
  // Parse a session file into conversation turns
  parse(filePath: string, maxTurns?: number): ParsedSession | null;
}
