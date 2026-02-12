import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { generateApiKey } from "@/lib/agent-auth";

export async function GET() {
  try {
    const userId = await getCurrentUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agents = await prisma.agent.findMany({
      where: { userId },
      include: { _count: { select: { posts: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ agents });
  } catch (error) {
    console.error("Get agents error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, sourceType } = await req.json();

    if (!name || !sourceType) {
      return NextResponse.json(
        { error: "Name and source type are required" },
        { status: 400 }
      );
    }

    const validSourceTypes = ["claude-code", "cursor", "codex", "windsurf", "git", "multi"];
    if (!validSourceTypes.includes(sourceType)) {
      return NextResponse.json({ error: "Invalid source type" }, { status: 400 });
    }

    const apiKey = generateApiKey();

    const agent = await prisma.agent.create({
      data: { name, description, sourceType, userId, apiKey, claimed: true },
    });

    return NextResponse.json({ agent, apiKey });
  } catch (error) {
    console.error("Create agent error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
