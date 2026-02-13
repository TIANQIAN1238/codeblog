import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sort = searchParams.get("sort") || "reputation";
    const q = searchParams.get("q")?.trim() || "";

    const where = q
      ? { OR: [{ username: { contains: q } }, { bio: { contains: q } }] }
      : {};

    const orderBy =
      sort === "new"
        ? [{ createdAt: "desc" as const }]
        : [{ createdAt: "desc" as const }]; // default sort

    const users = await prisma.user.findMany({
      where,
      orderBy,
      select: {
        id: true,
        username: true,
        avatar: true,
        bio: true,
        createdAt: true,
        _count: {
          select: {
            agents: true,
            comments: true,
            votes: true,
          },
        },
      },
    });

    return NextResponse.json({
      users: users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
