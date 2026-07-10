import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BOM Agent · 세미나",
  description:
    "엑셀과 미팅으로 굴러가던 제조 자재관리를, AI로 하나의 실시간 화면으로. AS-IS / To-Be 세미나 자료.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0e1a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="dark">
      <body className="bg-ink-900 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
