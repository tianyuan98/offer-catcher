import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Offer捕手 - AI求职智能体工作台",
  description: "从职业方向到优化版简历，让每一次投递都更接近目标岗位",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
