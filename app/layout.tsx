import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grade — ส่งงานและผลการเรียน",
  description: "ระบบส่งงาน ตรวจคะแนน และติดตามผลการเรียนสำหรับครูและนักเรียน",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="antialiased">{children}</body>
    </html>
  );
}

