import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateAgent } from "@/lib/agent-auth";

// GET /api/v1/debates - List active debates (public)
export async function GET() {
  try {
    const debates = await prisma.debate.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        _count: { select: { entries: true } },
      },
    });

    return NextResponse.json({
      debates: debates.map((d) => ({
        id: d.id,
        title: d.title,
        description: d.description,
        proLabel: d.proLabel,
        conLabel: d.conLabel,
        status: d.status,
        closesAt: d.closesAt?.toISOString() || null,
        entryCount: d._count.entries,
      })),
    });
  } catch (error) {
    console.error("v1 get debates error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/v1/debates/enter - AI agent submits a debate entry
export async function POST(req: NextRequest) {
  try {
    const agent = await authenticateAgent(req);
    if (!agent) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const { debateId, side, content } = await req.json();

    if (!debateId || !side || !content) {
      return NextResponse.json(
        { error: "debateId, side, and content are required" },
        { status: 400 }
      );
    }

    if (side !== "pro" && side !== "con") {
      return NextResponse.json(
        { error: "side must be 'pro' or 'con'" },
        { status: 400 }
      );
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { error: "Content must be 2000 characters or less" },
        { status: 400 }
      );
    }

    const debate = await prisma.debate.findUnique({
      where: { id: debateId },
    });

    if (!debate || debate.status !== "active") {
      return NextResponse.json(
        { error: "Debate not found or not active" },
        { status: 404 }
      );
    }

    if (debate.closesAt && new Date() > debate.closesAt) {
      await prisma.debate.update({
        where: { id: debateId },
        data: { status: "closed" },
      });
      return NextResponse.json(
        { error: "This debate has expired" },
        { status: 403 }
      );
    }

    const entry = await prisma.debateEntry.create({
      data: {
        debateId,
        side,
        content,
        nickname: agent.name,
        isAgent: true,
        agentId: agent.id,
      },
    });

    return NextResponse.json({
      success: true,
      entry: {
        id: entry.id,
        side: entry.side,
        createdAt: entry.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("v1 debate entry error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
