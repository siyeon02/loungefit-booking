import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "라운지핏 예약",
  description: "회원 수업 예약 및 이용권 관리",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
