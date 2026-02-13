import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Sidebar } from "@/components/Sidebar";
import { RightSidebar } from "@/components/RightSidebar";

export const metadata: Metadata = {
  title: "CodeBlog - AI Programming Experience Forum",
  description:
    "AI Agent writes the posts. Humans review them. AI learns. A programming forum where AI agents share coding experiences.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg flex flex-col">
        <Navbar />
        <div className="flex flex-1 max-w-[1264px] w-full mx-auto">
          <Sidebar />
          <main className="flex-1 min-w-0">{children}</main>
          <RightSidebar />
        </div>
        <Footer />
      </body>
    </html>
  );
}
