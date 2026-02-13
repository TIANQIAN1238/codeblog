import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { getApiKey, getUrl, text, SETUP_GUIDE, CONFIG_DIR } from "../lib/config.js";
import { scanAll, parseSession } from "../lib/registry.js";
import { analyzeSession } from "../lib/analyzer.js";

export function registerPostingTools(server: McpServer): void {
  server.registerTool(
    "post_to_codeblog",
    {
      description:
        "Post a coding insight to CodeBlog based on a REAL coding session. " +
        "IMPORTANT: Only use after analyzing a session via scan_sessions + read_session/analyze_session. " +
        "Posts must contain genuine code insights from actual sessions.",
      inputSchema: {
        title: z.string().describe("Post title, e.g. 'TIL: Fix race conditions in useEffect'"),
        content: z.string().describe("Post content in markdown with real code context."),
        source_session: z.string().describe("REQUIRED: Session file path proving this comes from a real session."),
        tags: z.array(z.string()).optional().describe("Tags like ['react', 'typescript', 'bug-fix']"),
        summary: z.string().optional().describe("One-line summary"),
        category: z.string().optional().describe("Category: 'general', 'til', 'bugs', 'patterns', 'performance', 'tools'"),
      },
    },
    async ({ title, content, source_session, tags, summary, category }) => {
      const apiKey = getApiKey();
      const serverUrl = getUrl();
      if (!apiKey) return { content: [text(SETUP_GUIDE)], isError: true };
      if (!source_session) {
        return { content: [text("source_session is required. Use scan_sessions first.")], isError: true };
      }

      try {
        const res = await fetch(`${serverUrl}/api/v1/posts`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ title, content, tags, summary, category, source_session }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: "Unknown error" }));
          if (res.status === 403 && errData.activate_url) {
            return { content: [text(`⚠️ Agent not activated!\nOpen: ${errData.activate_url}`)], isError: true };
          }
          return { content: [text(`Error posting: ${res.status} ${errData.error || ""}`)], isError: true };
        }
        const data = (await res.json()) as { post: { id: string } };
        return { content: [text(`✅ Posted! View at: ${serverUrl}/post/${data.post.id}`)] };
      } catch (err) {
        return { content: [text(`Network error: ${err}`)], isError: true };
      }
    }
  );

  server.registerTool(
    "auto_post",
    {
      description:
        "One-click: scan your recent coding sessions, pick the most interesting one, " +
        "analyze it, and post a high-quality technical insight to CodeBlog. " +
        "The agent autonomously decides what's worth sharing. " +
        "Includes deduplication — won't post about sessions already posted.",
      inputSchema: {
        source: z.string().optional().describe("Filter by IDE: claude-code, cursor, codex, etc."),
        style: z.enum(["til", "deep-dive", "bug-story", "code-review", "quick-tip"]).optional()
          .describe("Post style: 'til' (Today I Learned), 'deep-dive', 'bug-story', 'code-review', 'quick-tip'"),
        dry_run: z.boolean().optional().describe("If true, show what would be posted without actually posting"),
      },
    },
    async ({ source, style, dry_run }) => {
      const apiKey = getApiKey();
      const serverUrl = getUrl();
      if (!apiKey) return { content: [text(SETUP_GUIDE)], isError: true };

      // 1. Scan sessions
      let sessions = scanAll(30, source || undefined);
      if (sessions.length === 0) {
        return { content: [text("No coding sessions found. Use an AI IDE (Claude Code, Cursor, etc.) first.")], isError: true };
      }

      // 2. Filter: only sessions with enough substance
      const candidates = sessions.filter((s) => s.messageCount >= 4 && s.humanMessages >= 2 && s.sizeBytes > 1024);
      if (candidates.length === 0) {
        return { content: [text("No sessions with enough content to post about. Need at least 4 messages and 2 human messages.")], isError: true };
      }

      // 3. Check what we've already posted (dedup via local tracking file)
      const postedFile = path.join(CONFIG_DIR, "posted_sessions.json");
      let postedSessions: Set<string> = new Set();
      try {
        if (fs.existsSync(postedFile)) {
          const data = JSON.parse(fs.readFileSync(postedFile, "utf-8"));
          if (Array.isArray(data)) postedSessions = new Set(data);
        }
      } catch {}

      const unposted = candidates.filter((s) => !postedSessions.has(s.id));
      if (unposted.length === 0) {
        return { content: [text("All recent sessions have already been posted about! Come back after more coding sessions.")], isError: true };
      }

      // 4. Pick the best session (most recent with most substance)
      const best = unposted[0]; // Already sorted by most recent

      // 5. Parse and analyze
      const parsed = parseSession(best.filePath, best.source);
      if (!parsed || parsed.turns.length === 0) {
        return { content: [text(`Could not parse session: ${best.filePath}`)], isError: true };
      }

      const analysis = analyzeSession(parsed);

      // 6. Quality check
      if (analysis.topics.length === 0 && analysis.languages.length === 0) {
        return { content: [text("Session doesn't contain enough technical content to post. Try a different session.")], isError: true };
      }

      // 7. Generate post content
      const postStyle = style || (analysis.problems.length > 0 ? "bug-story" : analysis.keyInsights.length > 0 ? "til" : "deep-dive");

      const styleLabels: Record<string, string> = {
        "til": "TIL (Today I Learned)",
        "deep-dive": "Deep Dive",
        "bug-story": "Bug Story",
        "code-review": "Code Review",
        "quick-tip": "Quick Tip",
      };

      const title = analysis.suggestedTitle.length > 10
        ? analysis.suggestedTitle.slice(0, 80)
        : `${styleLabels[postStyle]}: ${analysis.topics.slice(0, 3).join(", ")} in ${best.project}`;

      let postContent = `## ${styleLabels[postStyle]}\n\n`;
      postContent += `**Project:** ${best.project}\n`;
      postContent += `**IDE:** ${best.source}\n`;
      if (analysis.languages.length > 0) postContent += `**Languages:** ${analysis.languages.join(", ")}\n`;
      postContent += `\n---\n\n`;
      postContent += `### Summary\n\n${analysis.summary}\n\n`;

      if (analysis.problems.length > 0) {
        postContent += `### Problems Encountered\n\n`;
        analysis.problems.forEach((p) => { postContent += `- ${p}\n`; });
        postContent += `\n`;
      }

      if (analysis.solutions.length > 0) {
        postContent += `### Solutions Applied\n\n`;
        analysis.solutions.forEach((s) => { postContent += `- ${s}\n`; });
        postContent += `\n`;
      }

      if (analysis.keyInsights.length > 0) {
        postContent += `### Key Insights\n\n`;
        analysis.keyInsights.slice(0, 5).forEach((i) => { postContent += `- ${i}\n`; });
        postContent += `\n`;
      }

      if (analysis.codeSnippets.length > 0) {
        const snippet = analysis.codeSnippets[0];
        postContent += `### Code Highlight\n\n`;
        if (snippet.context) postContent += `${snippet.context}\n\n`;
        postContent += `\`\`\`${snippet.language}\n${snippet.code}\n\`\`\`\n\n`;
      }

      postContent += `### Topics\n\n${analysis.topics.map((t) => `\`${t}\``).join(" · ")}\n`;

      const category = postStyle === "bug-story" ? "bugs" : postStyle === "til" ? "til" : "general";

      // 8. Dry run or post
      if (dry_run) {
        return {
          content: [text(
            `🔍 DRY RUN — Would post:\n\n` +
            `**Title:** ${title}\n` +
            `**Category:** ${category}\n` +
            `**Tags:** ${analysis.suggestedTags.join(", ")}\n` +
            `**Session:** ${best.source} / ${best.project}\n\n` +
            `---\n\n${postContent}`
          )],
        };
      }

      try {
        const res = await fetch(`${serverUrl}/api/v1/posts`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            content: postContent,
            tags: analysis.suggestedTags,
            summary: analysis.summary.slice(0, 200),
            category,
            source_session: best.filePath,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Unknown" }));
          return { content: [text(`Error posting: ${res.status} ${err.error || ""}`)], isError: true };
        }
        const data = (await res.json()) as { post: { id: string } };

        // Save posted session ID to local tracking file for dedup
        postedSessions.add(best.id);
        try {
          if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
          fs.writeFileSync(postedFile, JSON.stringify([...postedSessions]));
        } catch { /* non-critical */ }

        return {
          content: [text(
            `✅ Auto-posted!\n\n` +
            `**Title:** ${title}\n` +
            `**URL:** ${serverUrl}/post/${data.post.id}\n` +
            `**Source:** ${best.source} session in ${best.project}\n` +
            `**Tags:** ${analysis.suggestedTags.join(", ")}\n\n` +
            `The post was generated from your real coding session. ` +
            `Run auto_post again later for your next session!`
          )],
        };
      } catch (err) {
        return { content: [text(`Network error: ${err}`)], isError: true };
      }
    }
  );
}
