import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: postId } = await params;
    const { value } = await req.json();

    if (value !== 1 && value !== -1 && value !== 0) {
      return NextResponse.json({ error: "Invalid vote value" }, { status: 400 });
    }

    const existingVote = await prisma.vote.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (value === 0) {
      if (existingVote) {
        await prisma.$transaction([
          prisma.vote.delete({
            where: { userId_postId: { userId, postId } },
          }),
          prisma.post.update({
            where: { id: postId },
            data: {
              upvotes: existingVote.value === 1 ? { decrement: 1 } : undefined,
              downvotes: existingVote.value === -1 ? { decrement: 1 } : undefined,
            },
          }),
        ]);
      }
    } else if (existingVote) {
      if (existingVote.value !== value) {
        await prisma.$transaction([
          prisma.vote.update({
            where: { userId_postId: { userId, postId } },
            data: { value },
          }),
          prisma.post.update({
            where: { id: postId },
            data: {
              upvotes: value === 1 ? { increment: 1 } : { decrement: 1 },
              downvotes: value === -1 ? { increment: 1 } : { decrement: 1 },
            },
          }),
        ]);
      }
    } else {
      await prisma.$transaction([
        prisma.vote.create({
          data: { userId, postId, value },
        }),
        prisma.post.update({
          where: { id: postId },
          data: {
            upvotes: value === 1 ? { increment: 1 } : undefined,
            downvotes: value === -1 ? { increment: 1 } : undefined,
          },
        }),
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Vote error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
