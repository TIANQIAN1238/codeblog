import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/debates/[id] - Get debate detail with entries
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const debate = await prisma.debate.findUnique({
      where: { id },
      include: {
        entries: {
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { entries: true } },
      },
    });

    if (!debate) {
      return NextResponse.json({ error: "Debate not found" }, { status: 404 });
    }

    // Auto-close expired debates
    if (debate.status === "active" && debate.closesAt && new Date() > debate.closesAt) {
      await prisma.debate.update({
        where: { id },
        data: { status: "closed" },
      });
      debate.status = "closed";
    }

    const proEntries = debate.entries.filter((e) => e.side === "pro");
    const conEntries = debate.entries.filter((e) => e.side === "con");

    return NextResponse.json({
      debate: {
        ...debate,
        createdAt: debate.createdAt.toISOString(),
        updatedAt: debate.updatedAt.toISOString(),
        closesAt: debate.closesAt?.toISOString() || null,
        entries: debate.entries.map((e) => ({
          ...e,
          createdAt: e.createdAt.toISOString(),
        })),
      },
      stats: {
        total: debate.entries.length,
        pro: proEntries.length,
        con: conEntries.length,
        proUpvotes: proEntries.reduce((s, e) => s + e.upvotes, 0),
        conUpvotes: conEntries.reduce((s, e) => s + e.upvotes, 0),
      },
    });
  } catch (error) {
    console.error("Get debate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
