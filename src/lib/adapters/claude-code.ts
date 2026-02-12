import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import type {
  DataSourceAdapter,
  AdapterResult,
  SessionData,
  SessionMessage,
} from "./types";

interface ClaudeJsonlEntry {
  type: string;
  sessionId?: string;
  uuid?: string;
  timestamp?: string;
  cwd?: string;
  message?: {
    role?: string;
    content?: string | Array<{ type: string; text?: string; name?: string; input?: Record<string, unknown> }>;
  };
}

export class ClaudeCodeAdapter implements DataSourceAdapter {
  name = "Claude Code";
  sourceType = "claude-code";

  private basePath: string;

  constructor(basePath?: string) {
    this.basePath = basePath || path.join(os.homedir(), ".claude", "projects");
  }

  async scan(): Promise<AdapterResult> {
    const sessions: SessionData[] = [];

    if (!fs.existsSync(this.basePath)) {
      return { sessions, sourceName: this.name, sourceType: this.sourceType };
    }

    const projectDirs = fs.readdirSync(this.basePath).filter((name) => {
      const fullPath = path.join(this.basePath, name);
      return fs.statSync(fullPath).isDirectory();
    });

    for (const projectDir of projectDirs) {
      const projectPath = path.join(this.basePath, projectDir);
      const jsonlFiles = fs.readdirSync(projectPath).filter((f) => f.endsWith(".jsonl"));

      for (const jsonlFile of jsonlFiles) {
        try {
          const session = this.parseSession(
            path.join(projectPath, jsonlFile),
            projectDir
          );
          if (session && session.messages.length >= 2) {
            sessions.push(session);
          }
        } catch {
          // skip malformed files
        }
      }
    }

    // Sort by most recent first
    sessions.sort(
      (a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
    );

    return { sessions, sourceName: this.name, sourceType: this.sourceType };
  }

  private parseSession(filePath: string, projectDir: string): SessionData | null {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.trim().split("\n");

    const messages: SessionMessage[] = [];
    let sessionId = "";
    let startTime = "";
    let endTime = "";
    // Decode project path: "-Users-zhaoyifei-VibeCodingWork" -> "/Users/zhaoyifei/VibeCodingWork"
    const projectPath = projectDir.replace(/-/g, "/");

    for (const line of lines) {
      try {
        const entry: ClaudeJsonlEntry = JSON.parse(line);

        if (!sessionId && entry.sessionId) {
          sessionId = entry.sessionId;
        }

        if (entry.timestamp) {
          if (!startTime) startTime = entry.timestamp;
          endTime = entry.timestamp;
        }

        if (entry.type === "user" || entry.type === "assistant") {
          const msg = entry.message;
          if (!msg) continue;

          const role = entry.type as "user" | "assistant";
          let textContent = "";
          let toolUse: SessionMessage["toolUse"] = undefined;

          if (typeof msg.content === "string") {
            textContent = msg.content;
          } else if (Array.isArray(msg.content)) {
            const textParts: string[] = [];
            for (const part of msg.content) {
              if (part.type === "text" && part.text) {
                textParts.push(part.text);
              } else if (part.type === "tool_use" && part.name) {
                toolUse = {
                  name: part.name,
                  input: part.input || {},
                };
              }
            }
            textContent = textParts.join("\n");
          }

          if (textContent.trim() || toolUse) {
            messages.push({
              role,
              content: textContent.trim(),
              timestamp: entry.timestamp || "",
              toolUse,
            });
          }
        }
      } catch {
        // skip malformed lines
      }
    }

    if (messages.length === 0) return null;

    return {
      sessionId: sessionId || path.basename(filePath, ".jsonl"),
      projectPath,
      messages,
      startTime,
      endTime,
      totalMessages: messages.length,
    };
  }

  async getRecentSessions(limit = 5): Promise<SessionData[]> {
    const result = await this.scan();
    return result.sessions.slice(0, limit);
  }

  summarizeSession(session: SessionData): string {
    const userMessages = session.messages
      .filter((m) => m.role === "user" && m.content)
      .map((m) => m.content);
    const assistantMessages = session.messages
      .filter((m) => m.role === "assistant" && m.content)
      .map((m) => m.content);
    const toolsUsed = [
      ...new Set(
        session.messages
          .filter((m) => m.toolUse)
          .map((m) => m.toolUse!.name)
      ),
    ];

    return `Session: ${session.sessionId}
Project: ${session.projectPath}
Duration: ${session.startTime} to ${session.endTime}
Messages: ${session.totalMessages} (${userMessages.length} user, ${assistantMessages.length} assistant)
Tools used: ${toolsUsed.join(", ") || "none"}

User requests summary:
${userMessages.slice(0, 5).map((m, i) => `${i + 1}. ${m.slice(0, 200)}`).join("\n")}

Key assistant responses:
${assistantMessages
  .filter((m) => m.length > 50)
  .slice(0, 3)
  .map((m, i) => `${i + 1}. ${m.slice(0, 300)}`)
  .join("\n")}`;
  }
}
