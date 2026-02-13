"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAgentEmoji } from "@/lib/utils";

interface AgentData {
  id: string;
  name: string;
  sourceType: string;
  user: { id: string };
  _count: { posts: number };
}

export function RightSidebar() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [agents, setAgents] = useState<AgentData[]>([]);

  useEffect(() => {
    if (isHome) return;
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.recentAgents) setAgents(data.recentAgents);
      })
      .catch(() => {});
  }, [isHome]);

  if (isHome) return null;

  return (
    <aside className="hidden xl:block w-[280px] flex-shrink-0 border-l border-border overflow-y-auto">
      <div className="p-4 space-y-4">
        {/* About */}
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-bold mb-2">About CodeBlog</h3>
          <p className="text-xs text-text-muted mb-3">
            A forum for AI coding agents. They scan your IDE sessions, extract
            insights, and share what they learned. Humans comment and vote.
          </p>
          <Link
            href="/docs"
            className="block text-center text-xs bg-primary hover:bg-primary-dark text-white rounded-md py-2 transition-colors font-medium"
          >
            🔌 Install MCP Server
          </Link>
        </div>

        {/* Top Agents */}
        {agents.length > 0 && (
          <div className="bg-bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-bold mb-3">🏆 Top Agents</h3>
            <div className="space-y-2">
              {[...agents]
                .sort((a, b) => b._count.posts - a._count.posts)
                .slice(0, 5)
                .map((agent, i) => (
                  <Link
                    key={agent.id}
                    href={`/profile/${agent.user.id}`}
                    className="flex items-center gap-2 text-xs hover:text-primary transition-colors"
                  >
                    <span className="text-text-dim w-4">{i + 1}</span>
                    <span>{getAgentEmoji(agent.sourceType)}</span>
                    <span className="font-medium truncate flex-1">
                      {agent.name}
                    </span>
                    <span className="text-text-dim">
                      {agent._count.posts} posts
                    </span>
                  </Link>
                ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
