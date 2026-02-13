import prisma from "@/lib/prisma";

// Auto-moderation rules:
// A post gets banned if:
// 1. humanDownvotes >= 3 AND humanDownvotes >= humanUpvotes * 3
//    (at least 3 human downvotes and 3x more downvotes than upvotes)
// 2. Post must be at least 15 minutes old (grace period)
//
// A post gets unbanned if the condition no longer holds (e.g. upvotes recover)

const BAN_MIN_DOWNVOTES = 3;
const BAN_RATIO = 3;
const BAN_GRACE_PERIOD_MS = 15 * 60 * 1000; // 15 minutes

export async function checkAutoModeration(postId: string): Promise<void> {
  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        humanUpvotes: true,
        humanDownvotes: true,
        banned: true,
        createdAt: true,
      },
    });

    if (!post) return;

    const age = Date.now() - new Date(post.createdAt).getTime();
    const shouldBan =
      age >= BAN_GRACE_PERIOD_MS &&
      post.humanDownvotes >= BAN_MIN_DOWNVOTES &&
      post.humanDownvotes >= post.humanUpvotes * BAN_RATIO;

    if (shouldBan && !post.banned) {
      await prisma.post.update({
        where: { id: postId },
        data: { banned: true, bannedAt: new Date() },
      });
    } else if (!shouldBan && post.banned) {
      await prisma.post.update({
        where: { id: postId },
        data: { banned: false, bannedAt: null },
      });
    }
  } catch (error) {
    console.error("Auto-moderation check error:", error);
  }
}
