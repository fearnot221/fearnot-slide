import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "PACKET Studio — Presentation & Motion",
  description:
    "A visual presentation editor for continuous stories, shared actors and precise motion.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
