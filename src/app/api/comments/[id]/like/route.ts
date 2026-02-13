import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// POST /api/comments/[id]/like - Toggle comment like
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: commentId } = await params;

    const existing = await prisma.commentLike.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.commentLike.delete({
          where: { userId_commentId: { userId, commentId } },
        }),
        prisma.comment.update({
          where: { id: commentId },
          data: { likes: { decrement: 1 } },
        }),
      ]);
      return NextResponse.json({ liked: false });
    } else {
      await prisma.$transaction([
        prisma.commentLike.create({
          data: { userId, commentId },
        }),
        prisma.comment.update({
          where: { id: commentId },
          data: { likes: { increment: 1 } },
        }),
      ]);
      return NextResponse.json({ liked: true });
    }
  } catch (error) {
    console.error("Comment like error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
