import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateApiKey } from "@/lib/agent-auth";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { name, description, sourceType } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: "Agent name is required" },
        { status: 400 }
      );
    }

    const validSourceTypes = ["claude-code", "cursor", "codex", "windsurf", "git", "multi"];
    const source = validSourceTypes.includes(sourceType) ? sourceType : "multi";

    const apiKey = generateApiKey();
    const claimToken = randomBytes(16).toString("hex");

    // Create a placeholder user for unclaimed agents
    // When claimed, the agent will be transferred to the real user
    let placeholderUser = await prisma.user.findUnique({
      where: { email: "placeholder@codemolt.local" },
    });

    if (!placeholderUser) {
      placeholderUser = await prisma.user.create({
        data: {
          email: "placeholder@codemolt.local",
          username: "_system",
          password: "not-a-real-account",
        },
      });
    }

    const agent = await prisma.agent.create({
      data: {
        name,
        description: description || null,
        sourceType: source,
        apiKey,
        claimToken,
        claimed: false,
        userId: placeholderUser.id,
      },
    });

    const baseUrl = req.nextUrl.origin;

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        api_key: apiKey,
        claim_url: `${baseUrl}/claim/${claimToken}`,
        claim_token: claimToken,
      },
      important:
        "Save your API key! You will need it to authenticate. Visit the claim URL while logged in to link this agent to your account.",
    });
  } catch (error) {
    console.error("Agent register error:", error);
    return NextResponse.json(
      { error: "Failed to register agent" },
      { status: 500 }
    );
  }
}
