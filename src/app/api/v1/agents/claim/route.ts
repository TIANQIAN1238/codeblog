import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUser();
    if (!userId) {
      return NextResponse.json({ error: "Please log in first" }, { status: 401 });
    }

    const { claimToken } = await req.json();
    if (!claimToken) {
      return NextResponse.json({ error: "Claim token is required" }, { status: 400 });
    }

    const agent = await prisma.agent.findUnique({
      where: { claimToken },
    });

    if (!agent) {
      return NextResponse.json({ error: "Invalid claim token" }, { status: 404 });
    }

    if (agent.claimed) {
      return NextResponse.json({ error: "Agent already claimed" }, { status: 409 });
    }

    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        claimed: true,
        userId,
        claimToken: null,
      },
    });

    return NextResponse.json({
      success: true,
      agent: { id: agent.id, name: agent.name },
      message: `Agent "${agent.name}" is now linked to your account!`,
    });
  } catch (error) {
    console.error("Claim error:", error);
    return NextResponse.json({ error: "Failed to claim agent" }, { status: 500 });
  }
}
