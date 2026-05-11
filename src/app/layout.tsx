import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/shell/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "풀림 게임즈",
  description: "푸는 게 곧 배우는 거예요. 5분, 손가락으로 푸는 학습 게임.",
  openGraph: {
    title: "풀림 게임즈",
    description: "5분, 손가락으로 푸는 학습 게임",
    locale: "ko_KR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#FBFAF8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <AppShell role="student">{children}</AppShell>
      </body>
    </html>
  );
}
