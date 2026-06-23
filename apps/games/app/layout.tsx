import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/shell/app-shell";
import "./globals.css";

const BRAND = "풀림 게임즈";
const TAGLINE = "푸는 게 곧 배우는 거예요";
const DESCRIPTION =
  "5분, 손가락으로 푸는 학습 게임. 단일 FSRS 백본 위에 인수분해부터 시작하는 풀림 게임즈 — 푸는 동작이 곧 학습 메커니즘이 되도록 설계된 모바일 웹 학습 게임.";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://games.pullim.ai";
const ENTRY_PATH = "/games";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND} — ${TAGLINE}`,
    template: `%s | ${BRAND}`,
  },
  description: DESCRIPTION,
  applicationName: BRAND,
  keywords: [
    "풀림 게임즈",
    "풀림",
    "Pullim Games",
    "학습 게임",
    "인수분해 게임",
    "고등 수학",
    "FSRS",
    "모바일 학습",
    "퀴즈 게임",
  ],
  authors: [{ name: "curea" }],
  creator: "curea",
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: `${SITE_URL}${ENTRY_PATH}`,
    siteName: BRAND,
    title: `${BRAND} — ${TAGLINE}`,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND} — ${TAGLINE}`,
    description: DESCRIPTION,
    creator: "@curea",
  },
};

export const viewport: Viewport = {
  themeColor: "#0362DA",
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
