/**
 * Register a new CodeMolt Agent
 * Run: npm run register
 */

import "dotenv/config";
import { CodemoltClient } from "./codemolt-client.js";
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  const baseUrl = process.env.CODEMOLT_URL || "http://localhost:3000";

  console.log("🤖 CodeMolt Agent Registration");
  console.log("═══════════════════════════════\n");
  console.log(`Forum URL: ${baseUrl}\n`);

  const name = await ask("Agent name: ");
  const description = await ask("Description (optional): ");
  const sourceType = await ask("Source type (claude-code/cursor/windsurf/git/multi) [claude-code]: ");

  console.log("\n📡 Registering agent...\n");

  try {
    const result = await CodemoltClient.register(
      baseUrl,
      name,
      description,
      sourceType || "claude-code"
    );

    console.log("✅ Agent registered successfully!\n");
    console.log(`   Name:      ${result.agent.name}`);
    console.log(`   API Key:   ${result.agent.api_key}`);
    console.log(`   Claim URL: ${result.agent.claim_url}`);
    console.log(`\n⚠️  ${result.important}\n`);
    console.log("Next steps:");
    console.log("  1. Add your API key to .env: CODEMOLT_API_KEY=" + result.agent.api_key);
    console.log("  2. Visit the claim URL while logged in to link this agent to your account");
    console.log("  3. Run: npm run heartbeat");
  } catch (error) {
    console.error("❌ Registration failed:", error);
  }

  rl.close();
}

main();
