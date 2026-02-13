"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Tag } from "lucide-react";

const TABS = [
  { label: "Popular", value: "popular" },
  { label: "Name", value: "name" },
  { label: "New", value: "new" },
];

// Simple tag descriptions based on common programming tags
const TAG_DESCRIPTIONS: Record<string, string> = {
  nextjs: "Next.js is a React framework for building full-stack web applications with server-side rendering and static generation.",
  caching: "Caching is a technique for storing copies of data to serve future requests faster.",
  typescript: "TypeScript is a strongly typed programming language that builds on JavaScript.",
  patterns: "Design patterns are reusable solutions to commonly occurring problems in software design.",
  react: "React is a JavaScript library for building user interfaces with a component-based architecture.",
  postgresql: "PostgreSQL is a powerful, open-source object-relational database system.",
  debugging: "Debugging is the process of finding and resolving bugs or defects in software.",
  "app-router": "The App Router is Next.js's file-system based router built on React Server Components.",
  "server-components": "React Server Components let you render components on the server to reduce client-side JavaScript.",
  "connection-pool": "Connection pooling is a technique for reusing database connections to improve performance.",
  production: "Production refers to the live environment where software is deployed for end users.",
  "discriminated-unions": "Discriminated unions are a TypeScript pattern for creating type-safe tagged unions.",
  api: "API (Application Programming Interface) defines how software components should interact.",
  useeffect: "useEffect is a React Hook for performing side effects in function components.",
};

interface TagData {
  name: string;
  count: number;
  thisWeek: number;
  today: number;
}

export default function TagsPage() {
  const [tags, setTags] = useState<TagData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("popular");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    const params = new URLSearchParams({ sort: activeTab });
    if (search) params.set("q", search);

    fetch(`/api/tags?${params}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        setTags(data.tags || []);
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
      <h1 className="text-2xl font-bold mb-2">Tags</h1>
      <p className="text-text-muted text-sm mb-1">
        A tag is a keyword or label that categorizes your post with other, similar posts.
        Using the right tags makes it easier for others to find and answer your question.
      </p>
      <Link href="/tags/synonyms" className="text-primary text-sm hover:underline">
        Show all tag synonyms
      </Link>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6 mb-6">
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-dim" />
          <input
            type="text"
            placeholder="Filter by tag name"
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

      {/* Tags grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-bg-card border border-border rounded-lg p-4 animate-pulse"
            >
              <div className="h-5 bg-bg-input rounded w-20 mb-3" />
              <div className="h-3 bg-bg-input rounded w-full mb-1" />
              <div className="h-3 bg-bg-input rounded w-3/4 mb-3" />
              <div className="h-3 bg-bg-input rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : tags.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <Tag className="w-12 h-12 mx-auto mb-3 text-text-dim" />
          <p className="text-lg font-medium mb-1">No tags found</p>
          <p className="text-sm">Try a different search or filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tags.map((tag) => (
            <div
              key={tag.name}
              className="bg-bg-card border border-border rounded-lg p-4 hover:border-primary/30 hover:bg-bg-hover transition-all duration-200"
            >
              {/* Tag name */}
              <Link
                href={`/?q=${encodeURIComponent(tag.name)}`}
                className="inline-block px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded mb-3 hover:bg-primary/20 transition-colors"
              >
                {tag.name}
              </Link>

              {/* Description */}
              <p className="text-xs text-text-muted line-clamp-3 mb-3">
                {TAG_DESCRIPTIONS[tag.name] ||
                  `Questions and discussions related to ${tag.name}.`}
              </p>

              {/* Stats */}
              <div className="flex items-center justify-between text-[11px] text-text-dim">
                <span>{tag.count.toLocaleString()} questions</span>
                <span>
                  {tag.today > 0 && `${tag.today} asked today, `}
                  {tag.thisWeek} this week
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
