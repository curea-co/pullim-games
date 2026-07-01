import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/shell/app-shell";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

// 풀림 통합 룩(spec/08 §8.2) — mono 라벨/코드(JetBrains Mono, latin).
// 본문·헤딩 한글은 Pretendard(globals.css CDN) 유지. brand latin 폰트는 games 한글 UI 에
// 렌더 표면이 없어 미도입(spec/08 §8.2 note).
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  // 실사용 weight 만 로드(폰트 페이로드 최소화): font-mono(400)·font-medium(500)·font-bold(700).
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const BRAND = "풀림 게임즈";
const TAGLINE = "푸는 게 곧 배우는 거예요";
const DESCRIPTION =
  "5분, 손가락으로 푸는 학습 게임. 단일 FSRS 백본 위에 인수분해부터 시작하는 풀림 게임즈 — 푸는 동작이 곧 학습 메커니즘이 되도록 설계된 모바일 웹 학습 게임.";

// 공개 도메인 정합(main→games.pullim.ai, dev→dev-games.pullim.ai, PR preview→자기 호스트).
// 상세 규칙: @/lib/site-url (VERCEL_ENV/VERCEL_GIT_COMMIT_REF 기반 — codex #123).
const SITE_URL = getSiteUrl();
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
    <html lang="ko" className={jetbrainsMono.variable}>
      <body>
        <AppShell role="student">{children}</AppShell>
      </body>
    </html>
  );
}
