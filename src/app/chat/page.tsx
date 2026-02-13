"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquare, Star, Users, Clock } from "lucide-react";

const TABS = [
  { label: "Explore", href: "/chat", active: true },
  { label: "All", href: "/chat?tab=all", active: false },
  { label: "Starred", href: "/chat?tab=starred", active: false },
  { label: "Events", href: "/chat?tab=events", active: false },
  { label: "Rooms you're in", href: "/chat?tab=mine", active: false },
];

const FEATURED_ROOMS = [
  {
    id: "1",
    name: "CodeBlog Lobby",
    description:
      "Welcome to the lobby. A place to chat with other CodeBlog users with no set topic. Feel free to use the room more like a Water Cooler space.",
    tags: ["Open to all users"],
    lastMessage: "12m ago",
    messageCount: "12.3k",
    avatars: ["🤖", "👤", "🧑‍💻", "👨‍💻", "👩‍💻"],
    extraAvatars: 11,
    starred: true,
  },
  {
    id: "2",
    name: "Python & AI",
    description:
      "Discussions about Python, machine learning, and AI agents. Share your latest experiments and get help with your code.",
    tags: [],
    lastMessage: "10h ago",
    messageCount: "2.1k",
    avatars: ["🐍", "🤖", "🧠", "📊"],
    extraAvatars: 6,
    starred: false,
  },
  {
    id: "3",
    name: "TypeScript",
    description:
      "General discussions about TypeScript, type systems, and best practices. From beginners to advanced users.",
    tags: [],
    lastMessage: "9h ago",
    messageCount: "871",
    avatars: ["📘", "⚡", "🔷"],
    extraAvatars: 2,
    starred: false,
  },
  {
    id: "4",
    name: "MCP & Agents",
    description:
      "Talk about Model Context Protocol, building AI agents, and integrating them with your IDE and workflows.",
    tags: [],
    lastMessage: "5h ago",
    messageCount: "456",
    avatars: ["🔌", "🤖", "🛠️"],
    extraAvatars: 0,
    starred: false,
  },
  {
    id: "5",
    name: "React & Next.js",
    description:
      "Topic: Anything React and Next.js including Server Components, App Router, and the latest features.",
    tags: [],
    lastMessage: "11h ago",
    messageCount: "5.3k",
    avatars: ["⚛️", "▲", "🔵", "🟢"],
    extraAvatars: 3,
    starred: false,
  },
  {
    id: "6",
    name: "The Meta Room",
    description:
      "General chat & hangout for CodeBlog, including Meta discussions about the platform, features, and community.",
    tags: [],
    lastMessage: "15m ago",
    messageCount: "135k",
    avatars: ["💬", "🏠", "📢"],
    extraAvatars: 3,
    starred: false,
  },
];

export default function ChatPage() {
  const [starredRooms, setStarredRooms] = useState<Set<string>>(
    new Set(FEATURED_ROOMS.filter((r) => r.starred).map((r) => r.id))
  );

  const toggleStar = (id: string) => {
    setStarredRooms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6">
        {TABS.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab.active
                ? "bg-primary text-white"
                : "text-text-muted hover:text-text hover:bg-bg-hover"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Explore Chat</h1>
        <p className="text-text-muted text-sm">
          Find and explore communities on CodeBlog. Conversations are open and
          public to read by anyone. Need help? Visit our{" "}
          <Link href="/help" className="text-primary hover:underline">
            Chat FAQ
          </Link>
        </p>
      </div>

      {/* Featured Section */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
          🗨️ Featured
        </h2>
        <p className="text-xs text-text-dim mb-4">
          Highlighted rooms due to their activity, growth, or topic of interest.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURED_ROOMS.map((room) => (
            <div
              key={room.id}
              className="bg-bg-card border border-border rounded-lg p-4 hover:border-primary/30 hover:bg-bg-hover transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sm hover:text-primary transition-colors cursor-pointer">
                    {room.name}
                  </h3>
                  <button onClick={() => toggleStar(room.id)}>
                    <Star
                      className={`w-4 h-4 cursor-pointer flex-shrink-0 mt-0.5 transition-colors ${
                        starredRooms.has(room.id)
                          ? "text-primary fill-primary"
                          : "text-text-dim hover:text-primary"
                      }`}
                    />
                  </button>
                </div>

                {/* Tags */}
                {room.tags.length > 0 && (
                  <div className="flex gap-1.5 mb-2 flex-wrap">
                    {room.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                    <span className="text-[10px] text-text-dim flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      Last message {room.lastMessage}
                    </span>
                  </div>
                )}

                {room.tags.length === 0 && (
                  <div className="mb-2">
                    <span className="text-[10px] text-primary flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      Last message {room.lastMessage}
                    </span>
                  </div>
                )}

                {/* Description */}
                <p className="text-xs text-text-muted line-clamp-3 mb-3">
                  {room.description}
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <div className="flex -space-x-1">
                    {room.avatars.slice(0, 5).map((avatar, i) => (
                      <span
                        key={i}
                        className="w-5 h-5 rounded-full bg-bg-input border border-border flex items-center justify-center text-[10px]"
                      >
                        {avatar}
                      </span>
                    ))}
                  </div>
                  {room.extraAvatars > 0 && (
                    <span className="text-[10px] text-text-dim ml-1">
                      +{room.extraAvatars} more
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/chat/${room.id}`}
                    className="text-[10px] text-primary hover:underline"
                  >
                    More info
                  </Link>
                  <span className="text-[10px] text-text-dim flex items-center gap-0.5">
                    {room.messageCount} <MessageSquare className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
