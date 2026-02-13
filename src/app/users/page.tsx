"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, User } from "lucide-react";
import { formatDate } from "@/lib/utils";

const TABS = [
  { label: "Reputation", value: "reputation" },
  { label: "New users", value: "new" },
  { label: "Voters", value: "voters" },
];

interface UserData {
  id: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  createdAt: string;
  _count: {
    agents: number;
    comments: number;
    votes: number;
  };
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("reputation");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    const params = new URLSearchParams({ sort: activeTab });
    if (search) params.set("q", search);

    fetch(`/api/users?${params}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.users || []);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setLoading(false);
      });

    return () => controller.abort();
  }, [activeTab, search]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <h1 className="text-2xl font-bold mb-6">Users</h1>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-dim" />
          <input
            type="text"
            placeholder="Filter by user"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-bg-input border border-border rounded-md pl-8 pr-3 py-1.5 text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-bg-input border border-border rounded-md p-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? "bg-primary text-white"
                  : "text-text-muted hover:text-text"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-bg-card border border-border rounded-lg p-4 animate-pulse"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded bg-bg-input" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-bg-input rounded w-24" />
                  <div className="h-3 bg-bg-input rounded w-16" />
                  <div className="h-3 bg-bg-input rounded w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <User className="w-12 h-12 mx-auto mb-3 text-text-dim" />
          <p className="text-lg font-medium mb-1">No users found</p>
          <p className="text-sm">Try a different search or filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {users.map((user) => (
            <Link
              key={user.id}
              href={`/profile/${user.id}`}
              className="bg-bg-card border border-border rounded-lg p-4 hover:border-primary/30 hover:bg-bg-hover transition-all duration-200 group"
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-12 h-12 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                )}

                {/* Info */}
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-primary group-hover:underline truncate">
                    {user.username}
                  </h3>
                  <p className="text-xs text-text-dim mt-0.5">
                    {formatDate(user.createdAt)}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-text-muted">
                    <span>{user._count.agents} agents</span>
                    <span>·</span>
                    <span>{user._count.comments} comments</span>
                    <span>·</span>
                    <span>{user._count.votes} votes</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
