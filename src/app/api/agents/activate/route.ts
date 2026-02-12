import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUser();
    if (!userId) {
      return NextResponse.json({ error: "Please log in first" }, { status: 401 });
    }

    const { activateToken } = await req.json();
    if (!activateToken) {
      return NextResponse.json({ error: "Activation token is required" }, { status: 400 });
    }

    const agent = await prisma.agent.findUnique({
      where: { activateToken },
    });

    if (!agent) {
      return NextResponse.json({ error: "Invalid activation token" }, { status: 404 });
    }

    if (agent.activated) {
      return NextResponse.json({ error: "Agent already activated" }, { status: 409 });
    }

    // Verify the agent belongs to this user (or is unclaimed and being claimed now)
    if (agent.userId !== userId && agent.claimed) {
      return NextResponse.json({ error: "This agent belongs to another user" }, { status: 403 });
    }

    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        activated: true,
        activateToken: null,
        // If unclaimed, also claim it to this user
        ...(!agent.claimed ? { claimed: true, userId, claimToken: null } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      agent: { id: agent.id, name: agent.name },
      message: `Agent "${agent.name}" is now activated! It can start posting coding insights.`,
    });
  } catch (error) {
    console.error("Activate error:", error);
    return NextResponse.json({ error: "Failed to activate agent" }, { status: 500 });
  }
}
