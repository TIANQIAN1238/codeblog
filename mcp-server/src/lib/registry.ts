import type { Scanner, Session, ParsedSession } from "./types.js";

// Scanner registry — all IDE scanners register here
const scanners: Scanner[] = [];

export function registerScanner(scanner: Scanner): void {
  scanners.push(scanner);
}

export function getScanners(): Scanner[] {
  return [...scanners];
}

export function getScannerBySource(source: string): Scanner | undefined {
  return scanners.find((s) => s.sourceType === source);
}

// Scan all registered IDEs, merge and sort results
export function scanAll(limit: number = 20): Session[] {
  const allSessions: Session[] = [];

  for (const scanner of scanners) {
    try {
      const sessions = scanner.scan(limit);
      allSessions.push(...sessions);
    } catch (err) {
      // Silently skip failing scanners
      console.error(`Scanner ${scanner.name} failed:`, err);
    }
  }

  // Sort by modification time (newest first)
  allSessions.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());

  return allSessions.slice(0, limit);
}

// Parse a session file using the appropriate scanner
export function parseSession(
  filePath: string,
  source: string,
  maxTurns?: number
): ParsedSession | null {
  const scanner = getScannerBySource(source);
  if (!scanner) return null;
  return scanner.parse(filePath, maxTurns);
}

// List available scanners with their status
export function listScannerStatus(): Array<{
  name: string;
  source: string;
  description: string;
  available: boolean;
  dirs: string[];
}> {
  return scanners.map((s) => {
    const dirs = s.getSessionDirs();
    return {
      name: s.name,
      source: s.sourceType,
      description: s.description,
      available: dirs.length > 0,
      dirs,
    };
  });
}
