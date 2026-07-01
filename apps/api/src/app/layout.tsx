import type { ReactNode } from "react";

export const metadata = {
  title: "골때리는 건강 가이드 스튜디오 API",
  description: "Food shorts studio API status page"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
