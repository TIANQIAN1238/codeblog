import * as fs from "fs";
import * as path from "path";

// Safely read a file, return null on error
export function safeReadFile(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

// Safely read JSON file
export function safeReadJson<T = unknown>(filePath: string): T | null {
  const content = safeReadFile(filePath);
  if (!content) return null;
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

// Get file stats safely
export function safeStats(filePath: string): fs.Stats | null {
  try {
    return fs.statSync(filePath);
  } catch {
    return null;
  }
}

// List files in directory with extension filter
export function listFiles(
  dir: string,
  extensions?: string[],
  recursive: boolean = false
): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile()) {
        if (!extensions || extensions.some((ext) => entry.name.endsWith(ext))) {
          results.push(fullPath);
        }
      } else if (entry.isDirectory() && recursive) {
        results.push(...listFiles(fullPath, extensions, true));
      }
    }
  } catch {
    // Permission denied or other errors
  }

  return results;
}

// List subdirectories
export function listDirs(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => path.join(dir, e.name));
  } catch {
    return [];
  }
}

// Check if path exists
export function exists(p: string): boolean {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

// Extract project description from a project directory
// Reads README.md (first paragraph) and package.json (description field)
export function extractProjectDescription(projectPath: string): string | null {
  if (!projectPath || !fs.existsSync(projectPath)) return null;

  // Try package.json first (most concise)
  const pkgPath = path.join(projectPath, "package.json");
  const pkg = safeReadJson<{ name?: string; description?: string }>(pkgPath);
  if (pkg?.description) {
    return pkg.description.slice(0, 200);
  }

  // Try README.md — extract first non-heading, non-empty paragraph
  for (const readmeName of ["README.md", "readme.md", "Readme.md", "README.rst"]) {
    const readmePath = path.join(projectPath, readmeName);
    const content = safeReadFile(readmePath);
    if (!content) continue;

    const lines = content.split("\n");
    let desc = "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) { if (desc) break; continue; }
      if (trimmed.startsWith("#") || trimmed.startsWith("=") || trimmed.startsWith("-")) {
        if (desc) break;
        continue;
      }
      if (trimmed.startsWith("![") || trimmed.startsWith("<img")) continue;
      desc += (desc ? " " : "") + trimmed;
      if (desc.length > 200) break;
    }
    if (desc.length > 10) return desc.slice(0, 300);
  }

  // Try Cargo.toml, pyproject.toml etc.
  const cargoPath = path.join(projectPath, "Cargo.toml");
  const cargo = safeReadFile(cargoPath);
  if (cargo) {
    const match = cargo.match(/description\s*=\s*"([^"]+)"/);
    if (match) return match[1].slice(0, 200);
  }

  return null;
}

// Read JSONL file (one JSON object per line)
export function readJsonl<T = unknown>(filePath: string): T[] {
  const content = safeReadFile(filePath);
  if (!content) return [];
  return content
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as T;
      } catch {
        return null;
      }
    })
    .filter((x): x is T => x !== null);
}
