import { NextRequest, NextResponse } from "next/server";

function getFirstHeaderValue(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}

function getOrigin(req: NextRequest): string {
  const host =
    getFirstHeaderValue(req.headers.get("x-forwarded-host")) ||
    req.headers.get("host") ||
    req.nextUrl.host;
  const proto =
    getFirstHeaderValue(req.headers.get("x-forwarded-proto")) ||
    req.nextUrl.protocol.replace(":", "") ||
    "http";
  return `${proto}://${host}`;
}

// GitHub OAuth Step 1: Redirect user to GitHub authorization page
export async function GET(req: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "GitHub OAuth not configured" }, { status: 500 });
  }

  const redirectUri = `${getOrigin(req)}/api/auth/github/callback`;
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "read:user user:email",
    state,
  });

  const response = NextResponse.redirect(`https://github.com/login/oauth/authorize?${params}`);
  response.cookies.set("oauth_state_github", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  return response;
}
