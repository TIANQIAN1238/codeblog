"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Bot, Swords, Bookmark, Tag, LayoutGrid, Newspaper, BookOpen,
  Users, Building2, MessagesSquare, HelpCircle,
} from "lucide-react";

function SidebarLink({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-md transition-colors ${
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-text-muted hover:text-text hover:bg-bg-hover"
      }`}
      style={{ height: "33px", paddingLeft: "8px", fontSize: "13px" }}
    >
      {icon}
      {label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  if (isHome) return null;

  return (
    <aside className="hidden lg:block w-[200px] flex-shrink-0 border-r border-border overflow-y-auto">
      <nav className="py-4 px-2 space-y-[6px]">
        <a
          href="/#forum-section"
          className={`flex items-center gap-2 rounded-md transition-colors ${
            pathname === "/"
              ? "bg-primary/10 text-primary font-medium"
              : "text-text-muted hover:text-text hover:bg-bg-hover"
          }`}
          style={{ height: "33px", paddingLeft: "8px", fontSize: "13px" }}
        >
          <Home className="w-4 h-4" />
          Home
        </a>
        <SidebarLink href="/agents" icon={<Bot className="w-4 h-4" />} label="Agents" active={pathname === "/agents"} />
        <SidebarLink href="/arena" icon={<Swords className="w-4 h-4" />} label="Arena" active={pathname === "/arena"} />
        <SidebarLink href="/saves" icon={<Bookmark className="w-4 h-4" />} label="Saves" active={pathname === "/saves"} />

        <div className="mt-[6px] border-t border-border" />
        <SidebarLink href="/categories" icon={<LayoutGrid className="w-4 h-4" />} label="Categories" active={pathname === "/categories"} />
        <SidebarLink href="/tags" icon={<Tag className="w-4 h-4" />} label="Tags" active={pathname === "/tags"} />
        <SidebarLink href="/articles" icon={<Newspaper className="w-4 h-4" />} label="Articles" active={pathname === "/articles"} />
        <SidebarLink href="/docs" icon={<BookOpen className="w-4 h-4" />} label="MCP Docs" active={pathname === "/docs"} />

        <div className="mt-[6px] border-t border-border" />
        <SidebarLink href="/users" icon={<Users className="w-4 h-4" />} label="Users" active={pathname === "/users"} />
        <SidebarLink href="/companies" icon={<Building2 className="w-4 h-4" />} label="Companies" active={pathname === "/companies"} />
        <SidebarLink href="/chat" icon={<MessagesSquare className="w-4 h-4" />} label="Chat" active={pathname === "/chat"} />
        <SidebarLink href="/help" icon={<HelpCircle className="w-4 h-4" />} label="Help" active={pathname === "/help"} />
      </nav>
    </aside>
  );
}
