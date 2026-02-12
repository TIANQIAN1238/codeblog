/**
 * Claude Code Session Reader
 * Reads JSONL session files from ~/.claude/projects/
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface SessionMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  toolName?: string;
}

export interface Session {
  sessionId: string;
  projectPath: string;
  messages: SessionMessage[];
  startTime: string;
  endTime: string;
}

export class SessionReader {
  private basePath: string;

  constructor(basePath?: string) {
    this.basePath =
      basePath || path.join(os.homedir(), ".claude", "projects");
  }

  scan(): Session[] {
    if (!fs.existsSync(this.basePath)) {
      console.log(`⚠️ No Claude sessions found at ${this.basePath}`);
      return [];
    }

    const sessions: Session[] = [];

    const projectDirs = fs.readdirSync(this.basePath).filter((name) => {
      return fs.statSync(path.join(this.basePath, name)).isDirectory();
    });

    for (const dir of projectDirs) {
      const dirPath = path.join(this.basePath, dir);
      const jsonlFiles = fs.readdirSync(dirPath).filter((f) => f.endsWith(".jsonl"));

      for (const file of jsonlFiles) {
        try {
          const session = this.parseJsonl(path.join(dirPath, file), dir);
          if (session && session.messages.length >= 2) {
            sessions.push(session);
          }
        } catch {
          // skip bad files
        }
      }
    }

    sessions.sort(
      (a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
    );

    return sessions;
  }

  private parseJsonl(filePath: string, projectDir: string): Session | null {
    const lines = fs.readFileSync(filePath, "utf-8").trim().split("\n");
    const messages: SessionMessage[] = [];
    let sessionId = "";
    let startTime = "";
    let endTime = "";
    const projectPath = projectDir.replace(/-/g, "/");

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);

        if (!sessionId && entry.sessionId) sessionId = entry.sessionId;
        if (entry.timestamp) {
          if (!startTime) startTime = entry.timestamp;
          endTime = entry.timestamp;
        }

        if (entry.type !== "user" && entry.type !== "assistant") continue;
        const msg = entry.message;
        if (!msg) continue;

        let text = "";
        let toolName: string | undefined;

        if (typeof msg.content === "string") {
          text = msg.content;
        } else if (Array.isArray(msg.content)) {
          for (const part of msg.content) {
            if (part.type === "text" && part.text) text += part.text + "\n";
            if (part.type === "tool_use" && part.name) toolName = part.name;
          }
        }

        text = text.trim();
        if (text || toolName) {
          messages.push({
            role: entry.type,
            content: text,
            timestamp: entry.timestamp || "",
            toolName,
          });
        }
      } catch {
        // skip
      }
    }

    if (messages.length === 0) return null;

    return {
      sessionId: sessionId || path.basename(filePath, ".jsonl"),
      projectPath,
      messages,
      startTime,
      endTime,
    };
  }
}
