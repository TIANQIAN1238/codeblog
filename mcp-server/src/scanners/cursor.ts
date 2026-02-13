import * as path from "path";
import type { Scanner, Session, ParsedSession, ConversationTurn } from "../lib/types.js";
import { getHome, getPlatform } from "../lib/platform.js";
import { listFiles, listDirs, safeReadFile, safeReadJson, safeStats, extractProjectDescription } from "../lib/fs-utils.js";

// Cursor stores conversations in two places:
//
// 1. Agent transcripts (plain text, XML-like tags):
//    ~/.cursor/projects/<project>/agent-transcripts/*.txt
//    Format: user: <user_query>...</user_query> \n A: <response>
//
// 2. Chat sessions (JSON):
//    macOS:   ~/Library/Application Support/Cursor/User/workspaceStorage/<hash>/chatSessions/*.json
//    Windows: %APPDATA%/Cursor/User/workspaceStorage/<hash>/chatSessions/*.json
//    Linux:   ~/.config/Cursor/User/workspaceStorage/<hash>/chatSessions/*.json
//    Format:  { requests: [{ message: "...", response: [...] }], sessionId, creationDate }

export const cursorScanner: Scanner = {
  name: "Cursor",
  sourceType: "cursor",
  description: "Cursor AI IDE sessions (agent transcripts + chat sessions)",

  getSessionDirs(): string[] {
    const home = getHome();
    const platform = getPlatform();
    const candidates: string[] = [];

    // Agent transcripts (all platforms)
    candidates.push(path.join(home, ".cursor", "projects"));

    // Chat sessions in workspaceStorage
    if (platform === "macos") {
      candidates.push(
        path.join(home, "Library", "Application Support", "Cursor", "User", "workspaceStorage")
      );
    } else if (platform === "windows") {
      const appData = process.env.APPDATA || path.join(home, "AppData", "Roaming");
      candidates.push(path.join(appData, "Cursor", "User", "workspaceStorage"));
    } else {
      candidates.push(path.join(home, ".config", "Cursor", "User", "workspaceStorage"));
    }

    return candidates.filter((d) => {
      try { return require("fs").existsSync(d); } catch { return false; }
    });
  },

  scan(limit: number): Session[] {
    const sessions: Session[] = [];
    const dirs = this.getSessionDirs();

    for (const baseDir of dirs) {
      const projectDirs = listDirs(baseDir);
      for (const projectDir of projectDirs) {
        const dirName = path.basename(projectDir);

        // Resolve project path:
        // - agent-transcripts dirs: "Users-zhaoyifei-SimenDevelop-Simen" → "/Users/zhaoyifei/SimenDevelop/Simen"
        // - workspaceStorage dirs: read workspace.json for folder URI
        let projectPath: string | undefined;
        const workspaceJsonPath = path.join(projectDir, "workspace.json");
        const workspaceJson = safeReadJson<{ folder?: string }>(workspaceJsonPath);
        if (workspaceJson?.folder) {
          try {
            projectPath = decodeURIComponent(new URL(workspaceJson.folder).pathname);
          } catch { /* ignore */ }
        }
        if (!projectPath && dirName.startsWith("Users-")) {
          // Decode hyphenated path: "Users-zhaoyifei-Foo" → "/Users/zhaoyifei/Foo"
          projectPath = "/" + dirName.replace(/-/g, "/");
        }

        const project = projectPath ? path.basename(projectPath) : dirName;
        const projectDescription = projectPath
          ? extractProjectDescription(projectPath) || undefined
          : undefined;

        // --- Path 1: agent-transcripts/*.txt ---
        const transcriptsDir = path.join(projectDir, "agent-transcripts");
        const txtFiles = listFiles(transcriptsDir, [".txt"]);

        for (const filePath of txtFiles) {
          const stats = safeStats(filePath);
          if (!stats) continue;

          const content = safeReadFile(filePath);
          if (!content || content.length < 100) continue;

          const userQueries = content.match(/<user_query>\n?([\s\S]*?)\n?<\/user_query>/g) || [];
          const humanCount = userQueries.length;
          if (humanCount === 0) continue;

          const firstQuery = content.match(/<user_query>\n?([\s\S]*?)\n?<\/user_query>/);
          const preview = firstQuery ? firstQuery[1].trim().slice(0, 200) : content.slice(0, 200);

          sessions.push({
            id: path.basename(filePath, ".txt"),
            source: "cursor",
            project,
            projectPath,
            projectDescription,
            title: preview.slice(0, 80) || `Cursor session in ${project}`,
            messageCount: humanCount * 2,
            humanMessages: humanCount,
            aiMessages: humanCount,
            preview,
            filePath,
            modifiedAt: stats.mtime,
            sizeBytes: stats.size,
          });
        }

        // --- Path 2: chatSessions/*.json (inside workspaceStorage/<hash>/) ---
        const chatSessionsDir = path.join(projectDir, "chatSessions");
        const jsonFiles = listFiles(chatSessionsDir, [".json"]);

        for (const filePath of jsonFiles) {
          const stats = safeStats(filePath);
          if (!stats || stats.size < 100) continue;

          const data = safeReadJson<CursorChatSession>(filePath);
          if (!data || !Array.isArray(data.requests) || data.requests.length === 0) continue;

          const humanCount = data.requests.length;
          const firstMsg = data.requests[0]?.message || "";
          const preview = (typeof firstMsg === "string" ? firstMsg : "").slice(0, 200);

          sessions.push({
            id: data.sessionId || path.basename(filePath, ".json"),
            source: "cursor",
            project,
            projectPath,
            projectDescription,
            title: preview.slice(0, 80) || `Cursor chat in ${project}`,
            messageCount: humanCount * 2,
            humanMessages: humanCount,
            aiMessages: humanCount,
            preview: preview || "(cursor chat session)",
            filePath,
            modifiedAt: stats.mtime,
            sizeBytes: stats.size,
          });
        }
      }
    }

    sessions.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
    return sessions.slice(0, limit);
  },

  parse(filePath: string, maxTurns?: number): ParsedSession | null {
    const stats = safeStats(filePath);
    const turns: ConversationTurn[] = [];

    if (filePath.endsWith(".txt")) {
      // Parse agent transcript format:
      // user:\n<user_query>\n...\n</user_query>\n\nA:\n...
      const content = safeReadFile(filePath);
      if (!content) return null;

      const blocks = content.split(/^user:\s*$/m);
      for (const block of blocks) {
        if (!block.trim()) continue;
        if (maxTurns && turns.length >= maxTurns) break;

        const queryMatch = block.match(/<user_query>\n?([\s\S]*?)\n?<\/user_query>/);
        if (queryMatch) {
          turns.push({ role: "human", content: queryMatch[1].trim() });
        }

        // Everything after </user_query> and after "A:" is the assistant response
        const afterQuery = block.split(/<\/user_query>/)[1];
        if (afterQuery) {
          const aiContent = afterQuery.replace(/^\s*\n\s*A:\s*\n?/, "").trim();
          if (aiContent && (!maxTurns || turns.length < maxTurns)) {
            turns.push({ role: "assistant", content: aiContent });
          }
        }
      }
    } else {
      // Parse chatSessions JSON: { requests: [{ message, response }] }
      const data = safeReadJson<CursorChatSession>(filePath);
      if (!data || !Array.isArray(data.requests)) return null;

      for (const req of data.requests) {
        if (maxTurns && turns.length >= maxTurns) break;

        if (req.message) {
          turns.push({
            role: "human",
            content: typeof req.message === "string" ? req.message : JSON.stringify(req.message),
          });
        }

        if (maxTurns && turns.length >= maxTurns) break;

        // Response can be array of text chunks or a string
        if (req.response) {
          let respText = "";
          if (typeof req.response === "string") {
            respText = req.response;
          } else if (Array.isArray(req.response)) {
            respText = req.response
              .map((r: unknown) => (typeof r === "string" ? r : (r as Record<string, unknown>)?.text || ""))
              .join("");
          }
          if (respText.trim()) {
            turns.push({ role: "assistant", content: respText.trim() });
          }
        }
      }
    }

    if (turns.length === 0) return null;

    const humanMsgs = turns.filter((t) => t.role === "human");
    const aiMsgs = turns.filter((t) => t.role === "assistant");

    return {
      id: path.basename(filePath).replace(/\.\w+$/, ""),
      source: "cursor",
      project: path.basename(path.dirname(filePath)),
      title: humanMsgs[0]?.content.slice(0, 80) || "Cursor session",
      messageCount: turns.length,
      humanMessages: humanMsgs.length,
      aiMessages: aiMsgs.length,
      preview: humanMsgs[0]?.content.slice(0, 200) || "",
      filePath,
      modifiedAt: stats?.mtime || new Date(),
      sizeBytes: stats?.size || 0,
      turns,
    };
  },
};

// Cursor chatSessions JSON format (verified from local files)
interface CursorChatSession {
  version?: number;
  requests: Array<{
    message: string;
    response?: string | unknown[];
  }>;
  sessionId?: string;
  creationDate?: string;
  lastMessageDate?: string;
}
