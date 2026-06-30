import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "골때리는 건강 가이드 스튜디오",
  description: "음식 캐릭터 상황극 숏츠 제작 워크플로우"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
