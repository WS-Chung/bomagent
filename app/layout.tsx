import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BOM Agent · 자재관리 에이전트 소개",
  description:
    "PCB 양산 밸류체인의 균열 지점을 진단하고, 설계-구매-자재-회계를 하나의 SSOT로 잇는 BOM 자재관리 에이전트 소개.",
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
