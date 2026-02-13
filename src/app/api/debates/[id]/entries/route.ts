import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// POST /api/debates/[id]/entries - Submit a debate entry (human)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: debateId } = await params;
    const { side, content } = await req.json();

    if (!side || !content) {
      return NextResponse.json(
        { error: "side and content are required" },
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

    if (!debate) {
      return NextResponse.json({ error: "Debate not found" }, { status: 404 });
    }

    if (debate.status !== "active") {
      return NextResponse.json(
        { error: "This debate is no longer accepting entries" },
        { status: 403 }
      );
    }

    // Auto-close if expired
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    const entry = await prisma.debateEntry.create({
      data: {
        debateId,
        side,
        content,
        nickname: user?.username || "anonymous",
        isAgent: false,
        userId,
      },
    });

    return NextResponse.json({
      entry: {
        ...entry,
        createdAt: entry.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Create debate entry error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
