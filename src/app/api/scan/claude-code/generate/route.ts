import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ClaudeCodeAdapter } from "@/lib/adapters/claude-code";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId, agentId } = await req.json();

    if (!sessionId || !agentId) {
      return NextResponse.json(
        { error: "sessionId and agentId are required" },
        { status: 400 }
      );
    }

    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent || agent.userId !== userId) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const adapter = new ClaudeCodeAdapter();
    const result = await adapter.scan();
    const session = result.sessions.find((s) => s.sessionId === sessionId);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const summary = adapter.summarizeSession(session);

    // Generate a structured post from the session data
    // For MVP without AI API key, we do rule-based extraction
    const post = generatePostFromSession(session, summary);

    const created = await prisma.post.create({
      data: {
        title: post.title,
        content: post.content,
        summary: post.summary,
        tags: JSON.stringify(post.tags),
        agentId,
      },
      include: {
        agent: {
          include: {
            user: { select: { id: true, username: true } },
          },
        },
      },
    });

    return NextResponse.json({ post: created });
  } catch (error) {
    console.error("Generate post error:", error);
    return NextResponse.json({ error: "Failed to generate post" }, { status: 500 });
  }
}

function generatePostFromSession(
  session: { sessionId: string; projectPath: string; messages: Array<{ role: string; content: string; toolUse?: { name: string } }>; totalMessages: number; startTime: string; endTime: string },
  _summary: string
) {
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

  // Extract key topics from user messages
  const firstUserMsg = userMessages[0] || "Coding session";
  const titleBase = firstUserMsg.slice(0, 80).replace(/\n/g, " ").trim();
  const title = titleBase.length > 60 ? titleBase.slice(0, 60) + "..." : titleBase;

  // Build tags from tools used and common keywords
  const tags: string[] = [];
  const keywords = ["react", "typescript", "python", "nextjs", "prisma", "css", "api",
    "database", "auth", "bug", "fix", "refactor", "test", "deploy", "docker",
    "git", "node", "express", "tailwind", "vue", "angular", "svelte"];
  const allText = [...userMessages, ...assistantMessages].join(" ").toLowerCase();
  for (const kw of keywords) {
    if (allText.includes(kw)) tags.push(kw);
  }
  if (toolsUsed.length > 0) tags.push("tool-use");
  if (tags.length === 0) tags.push("coding-session");

  // Build content
  const projectName = session.projectPath.split("/").pop() || "Project";
  const duration = calculateDuration(session.startTime, session.endTime);

  const keyExchanges = userMessages
    .slice(0, 5)
    .map((msg, i) => {
      const response = assistantMessages[i] || "";
      const truncatedMsg = msg.length > 300 ? msg.slice(0, 300) + "..." : msg;
      const truncatedResp = response.length > 400 ? response.slice(0, 400) + "..." : response;
      return `### Step ${i + 1}\n\n**Request:** ${truncatedMsg}\n\n**Response:** ${truncatedResp}`;
    })
    .join("\n\n---\n\n");

  const content = `## Session Overview

- **Project:** ${projectName}
- **Duration:** ${duration}
- **Messages exchanged:** ${session.totalMessages}
- **Tools used:** ${toolsUsed.length > 0 ? toolsUsed.join(", ") : "None"}

## What Happened

${keyExchanges}

## Key Takeaways

This session involved ${session.totalMessages} message exchanges working on the **${projectName}** project. ${
    toolsUsed.length > 0
      ? `The AI used ${toolsUsed.length} different tools (${toolsUsed.slice(0, 5).join(", ")}) to help accomplish the task.`
      : "The session was primarily a discussion without tool usage."
  }

${
    userMessages.length > 3
      ? "The session covered multiple topics and required iterative refinement."
      : "The session was focused on a specific task."
  }`;

  const summary = `Session on ${projectName}: ${firstUserMsg.slice(0, 120).replace(/\n/g, " ")}`;

  return { title, content, summary, tags: tags.slice(0, 5) };
}

function calculateDuration(start: string, end: string): string {
  try {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  } catch {
    return "Unknown";
  }
}
