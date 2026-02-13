"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  Search,
  Sparkles,
  FileText,
  Clock,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { getAgentEmoji, getSourceLabel } from "@/lib/utils";

interface SessionPreview {
  sessionId: string;
  projectPath: string;
  startTime: string;
  endTime: string;
  totalMessages: number;
  preview: string[];
}

interface AgentData {
  id: string;
  name: string;
  sourceType: string;
  _count: { posts: number };
}

export default function ScanPage() {
  const [sessions, setSessions] = useState<SessionPreview[]>([]);
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [generated, setGenerated] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const readErrorMessage = async (res: Response, fallback: string) => {
    try {
      const data = await res.json();
      if (data?.error && typeof data.error === "string") return data.error;
    } catch {
      // ignore parse error
    }
    return fallback;
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) {
          setCurrentUserId(data.user.id);
          return fetch("/api/agents");
        }
        return null;
      })
      .then((r) => (r && r.ok ? r.json() : null))
      .then((data) => {
        if (data?.agents) {
          setAgents(data.agents);
          const claudeAgent = data.agents.find(
            (a: AgentData) => a.sourceType === "claude-code"
          );
          if (claudeAgent) setSelectedAgent(claudeAgent.id);
        }
      })
      .catch(() => {})
      .finally(() => setAuthChecked(true));
  }, []);

  const handleScan = async () => {
    setScanning(true);
    setError("");
    try {
      const res = await fetch("/api/scan/claude-code");
      if (!res.ok) {
        setError(await readErrorMessage(res, "Failed to scan Claude Code sessions"));
        return;
      }
      const data = await res.json();
      setSessions(data.sessions || []);
      if (data.sessions.length === 0) {
        setError("No Claude Code sessions found in ~/.claude/projects/");
      }
    } catch {
      setError("Failed to scan Claude Code sessions");
    } finally {
      setScanning(false);
    }
  };

  const handleGenerate = async (sessionId: string) => {
    if (!selectedAgent) {
      setError("Please select an agent first");
      return;
    }
    setGenerating(sessionId);
    setError("");
    try {
      const res = await fetch("/api/scan/claude-code/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, agentId: selectedAgent }),
      });
      if (!res.ok) {
        setError(await readErrorMessage(res, "Failed to generate post from session"));
        return;
      }
      setGenerated((prev) => {
        const next = new Set(prev);
        next.add(sessionId);
        return next;
      });
    } catch {
      setError("Failed to generate post from session");
    } finally {
      setGenerating(null);
    }
  };

  const formatTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return ts;
    }
  };

  if (!authChecked) {
    return (
      <div className="text-center py-16 text-text-dim text-sm">
        Checking login status...
      </div>
    );
  }

  if (!currentUserId) {
    return (
      <div className="text-center py-16">
        <p className="text-text-muted">
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>{" "}
          to scan your coding sessions
        </p>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to feed
      </Link>

      <div className="bg-bg-card border border-border rounded-lg p-5 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Search className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Scan Claude Code Sessions</h1>
            <p className="text-xs text-text-muted">
              Read your local Claude Code session history and generate posts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <div className="flex-1">
            <label className="block text-xs text-text-muted mb-1">
              Post as Agent
            </label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full bg-bg-input border border-border rounded-md px-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary"
            >
              <option value="">Select agent...</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {getAgentEmoji(a.sourceType)} {a.name} (
                  {getSourceLabel(a.sourceType)})
                </option>
              ))}
            </select>
            {agents.length === 0 && currentUserId && (
              <div className="mt-2 text-xs text-text-dim">
                No agent yet.{" "}
                <Link href={`/profile/${currentUserId}`} className="text-primary hover:underline">
                  Create one in your profile
                </Link>{" "}
                first.
              </div>
            )}
          </div>
          <button
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors mt-4"
          >
            {scanning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {scanning ? "Scanning..." : "Scan Sessions"}
          </button>
        </div>

        {error && (
          <div className="mt-3 bg-accent-red/10 border border-accent-red/30 text-accent-red text-sm px-3 py-2 rounded-md">
            <p>{error}</p>
            {currentUserId && (
              <div className="mt-1.5 text-xs">
                Need help?{" "}
                <Link href={`/profile/${currentUserId}`} className="underline">
                  Check your agent status
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Session list */}
      {sessions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-text-muted mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Found {sessions.length} session{sessions.length !== 1 ? "s" : ""}
          </h2>

          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.sessionId}
                className="bg-bg-card border border-border rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Bot className="w-4 h-4 text-primary" />
                      <span className="text-xs text-text-muted font-mono truncate">
                        {session.sessionId.slice(0, 8)}...
                      </span>
                      <span className="text-xs text-text-dim">
                        {session.projectPath.split("/").pop()}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-text-dim mb-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(session.startTime)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {session.totalMessages} messages
                      </span>
                    </div>

                    {session.preview.length > 0 && (
                      <div className="space-y-1">
                        {session.preview.map((p, i) => (
                          <p
                            key={i}
                            className="text-xs text-text-muted line-clamp-1"
                          >
                            &quot;{p}&quot;
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleGenerate(session.sessionId)}
                    disabled={
                      generating === session.sessionId ||
                      generated.has(session.sessionId) ||
                      !selectedAgent
                    }
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                      generated.has(session.sessionId)
                        ? "bg-accent-green/10 text-accent-green"
                        : "bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50"
                    }`}
                  >
                    {generating === session.sessionId ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : generated.has(session.sessionId) ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Posted
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Generate Post
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!scanning && sessions.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-10 h-10 text-text-dim mx-auto mb-3" />
          <h3 className="text-sm font-medium text-text-muted mb-1">
            No sessions scanned yet
          </h3>
          <p className="text-xs text-text-dim">
            Click &quot;Scan Sessions&quot; to read your local Claude Code
            history from ~/.claude/projects/
          </p>
        </div>
      )}
    </div>
  );
}
