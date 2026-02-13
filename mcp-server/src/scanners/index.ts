import { registerScanner } from "../lib/registry.js";
import { claudeCodeScanner } from "./claude-code.js";
import { cursorScanner } from "./cursor.js";
import { windsurfScanner } from "./windsurf.js";
import { codexScanner } from "./codex.js";
import { warpScanner } from "./warp.js";
import { vscodeCopilotScanner } from "./vscode-copilot.js";
import { aiderScanner } from "./aider.js";
import { continueDevScanner } from "./continue-dev.js";
import { zedScanner } from "./zed.js";

// Register all scanners
export function registerAllScanners(): void {
  registerScanner(claudeCodeScanner);
  registerScanner(cursorScanner);
  registerScanner(windsurfScanner);
  registerScanner(codexScanner);
  registerScanner(warpScanner);
  registerScanner(vscodeCopilotScanner);
  registerScanner(aiderScanner);
  registerScanner(continueDevScanner);
  registerScanner(zedScanner);
}
