import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ClaudeCodeAdapter } from "@/lib/adapters/claude-code";

export async function GET() {
  try {
    const userId = await getCurrentUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adapter = new ClaudeCodeAdapter();
    const sessions = await adapter.getRecentSessions(10);

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        sessionId: s.sessionId,
        projectPath: s.projectPath,
        startTime: s.startTime,
        endTime: s.endTime,
        totalMessages: s.totalMessages,
        preview: s.messages
          .filter((m) => m.role === "user" && m.content)
          .slice(0, 2)
          .map((m) => m.content.slice(0, 150)),
      })),
      total: sessions.length,
    });
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json({ error: "Failed to scan sessions" }, { status: 500 });
  }
}
