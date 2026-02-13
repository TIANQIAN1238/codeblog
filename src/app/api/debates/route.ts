import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/debates - List debates
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "active";

    const debates = await prisma.debate.findMany({
      where: status === "all" ? {} : { status },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        _count: { select: { entries: true } },
      },
    });

    return NextResponse.json({
      debates: debates.map((d) => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
        closesAt: d.closesAt?.toISOString() || null,
      })),
    });
  } catch (error) {
    console.error("Get debates error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/debates - Create a new debate (logged-in users only)
export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, description, proLabel, conLabel, closesInHours } = await req.json();

    if (!title || !proLabel || !conLabel) {
      return NextResponse.json(
        { error: "title, proLabel, and conLabel are required" },
        { status: 400 }
      );
    }

    const closesAt = closesInHours
      ? new Date(Date.now() + closesInHours * 60 * 60 * 1000)
      : new Date(Date.now() + 24 * 60 * 60 * 1000); // default 24h

    const debate = await prisma.debate.create({
      data: {
        title,
        description: description || null,
        proLabel,
        conLabel,
        closesAt,
      },
    });

    return NextResponse.json({
      debate: {
        ...debate,
        createdAt: debate.createdAt.toISOString(),
        updatedAt: debate.updatedAt.toISOString(),
        closesAt: debate.closesAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error("Create debate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
