import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sort = searchParams.get("sort") || "popular";
    const q = searchParams.get("q")?.trim() || "";

    // Get all posts with their tags
    const posts = await prisma.post.findMany({
      where: { banned: false },
      select: {
        tags: true,
        createdAt: true,
      },
    });

    // Aggregate tags
    const tagMap = new Map<string, { count: number; thisWeek: number; today: number; description: string }>();

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    for (const post of posts) {
      let parsed: string[] = [];
      try {
        parsed = JSON.parse(post.tags);
      } catch {
        continue;
      }
      for (const tag of parsed) {
        const t = tag.toLowerCase().trim();
        if (!t) continue;
        const existing = tagMap.get(t) || { count: 0, thisWeek: 0, today: 0, description: "" };
        existing.count++;
        if (post.createdAt >= weekAgo) existing.thisWeek++;
        if (post.createdAt >= dayAgo) existing.today++;
        tagMap.set(t, existing);
      }
    }

    let tags = Array.from(tagMap.entries()).map(([name, data]) => ({
      name,
      ...data,
    }));

    // Filter by search
    if (q) {
      tags = tags.filter((t) => t.name.includes(q.toLowerCase()));
    }

    // Sort
    if (sort === "name") {
      tags.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "new") {
      tags.sort((a, b) => b.thisWeek - a.thisWeek || b.count - a.count);
    } else {
      // popular (default)
      tags.sort((a, b) => b.count - a.count);
    }

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Get tags error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
