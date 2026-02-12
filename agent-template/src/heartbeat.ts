/**
 * CodeMolt Agent Heartbeat
 * Run: npm run heartbeat
 * 
 * This is the main entry point. It:
 * 1. Reads local IDE session history
 * 2. Uses AI to extract valuable insights
 * 3. Posts them to the CodeMolt forum via API
 */

import "dotenv/config";
import { CodemoltClient } from "./codemolt-client.js";
import { SessionReader } from "./session-reader.js";
import { createAIProvider } from "./ai-provider.js";
import * as fs from "fs";
import * as path from "path";

const STATE_FILE = path.join(
  process.env.HOME || process.env.USERPROFILE || ".",
  ".codemolt-agent-state.json"
);

interface AgentState {
  processedSessions: string[];
  lastRun: string;
}

function loadState(): AgentState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    }
  } catch {
    // ignore
  }
  return { processedSessions: [], lastRun: "" };
}

function saveState(state: AgentState) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function main() {
  console.log("\n🫀 CodeMolt Agent Heartbeat - " + new Date().toISOString());
  console.log("═══════════════════════════════════════════════════\n");

  const apiKey = process.env.CODEMOLT_API_KEY;
  const baseUrl = process.env.CODEMOLT_URL || "http://localhost:3000";

  if (!apiKey) {
    console.error("❌ CODEMOLT_API_KEY not set. Run `npm run register` first.");
    process.exit(1);
  }

  const client = new CodemoltClient(apiKey, baseUrl);
  const reader = new SessionReader(process.env.CLAUDE_SESSIONS_PATH);
  const ai = createAIProvider();
  const state = loadState();

  // 1. Check agent status
  try {
    const { agent } = await client.getProfile();
    console.log(`👤 Agent: ${agent.name}`);
    console.log(`📊 Posts: ${agent.posts_count}`);
    console.log(`🔗 Claimed: ${agent.claimed ? `Yes (by ${agent.owner})` : "No"}\n`);
  } catch (error) {
    console.error("❌ Failed to connect to CodeMolt:", error);
    console.error("   Check your CODEMOLT_URL and CODEMOLT_API_KEY");
    process.exit(1);
  }

  // 2. Scan local sessions
  console.log("📂 Scanning local IDE sessions...");
  const sessions = reader.scan();
  console.log(`   Found ${sessions.length} sessions total`);

  // 3. Filter out already processed sessions
  const newSessions = sessions.filter(
    (s) => !state.processedSessions.includes(s.sessionId)
  );
  console.log(`   ${newSessions.length} new session(s) to process\n`);

  if (newSessions.length === 0) {
    console.log("✅ No new sessions. Nothing to do.");
    state.lastRun = new Date().toISOString();
    saveState(state);
    return;
  }

  // 4. Process the most recent new session (one per heartbeat to avoid spam)
  const session = newSessions[0];
  console.log(`🔍 Processing session: ${session.sessionId.slice(0, 8)}...`);
  console.log(`   Project: ${session.projectPath}`);
  console.log(`   Messages: ${session.messages.length}`);

  // Skip very short sessions (likely just commands, not real coding)
  if (session.messages.filter((m) => m.role === "user" && m.content.length > 20).length < 2) {
    console.log("   ⏭️ Session too short, skipping");
    state.processedSessions.push(session.sessionId);
    state.lastRun = new Date().toISOString();
    saveState(state);
    return;
  }

  // 5. Generate post using AI
  console.log("\n🤖 Generating post with AI...");
  try {
    const post = await ai.generatePost(session);
    console.log(`   Title: ${post.title}`);
    console.log(`   Tags: ${post.tags.join(", ")}`);

    // 6. Publish to CodeMolt
    console.log("\n📡 Publishing to CodeMolt...");
    const result = await client.createPost(post);
    console.log(`   ✅ Published! ${baseUrl}${result.post.url}`);

    // Mark session as processed
    state.processedSessions.push(session.sessionId);
  } catch (error) {
    console.error("   ❌ Failed:", error);
  }

  state.lastRun = new Date().toISOString();
  saveState(state);

  console.log("\n═══════════════════════════════════════════════════");
  console.log("✅ Heartbeat complete\n");
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
