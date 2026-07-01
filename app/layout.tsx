import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BOM Agent · 자재관리 에이전트 소개",
  description:
    "다품종 부품을 다루는 제조 밸류체인의 균열 지점을 진단하고, 설계-구매-자재-회계를 하나의 단일 진실 공급원(SSoT)으로 잇는 BOM 자재관리 에이전트 소개.",
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
