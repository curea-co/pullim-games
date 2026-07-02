import { ImageResponse } from "next/og";
import { getSiteHost } from "@/lib/site-url";
import { palette } from "@/lib/design-tokens";

export const runtime = "edge";

// 폰트 스택 — spec/08 §8.2: `system-ui` 를 1차 폰트로 쓰지 않는다(fallback 말단만 허용).
// next/og edge 는 CDN 변수 폰트(Pretendard subset CSS)를 렌더하지 못하고 정적 woff 도
// 미서빙이라, Pretendard 를 1차로 명시하되 실제 렌더 fallback 은 플랫폼 한글 폰트
// (Apple SD Gothic Neo·Malgun Gothic)가 담당한다. system-ui 는 스택 말단으로.
const OG_FONT_STACK =
  'Pretendard, "Pretendard Variable", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif, system-ui';

export const alt = "풀림 게임즈 — 5분, 인수분해를 손으로.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  // 표시 도메인 — layout 과 동일한 공개 도메인 규칙(@/lib/site-url). dev→dev-games.pullim.ai
  // 등 실제 공개 호스트와 카드 표기를 일치 (codex #123).
  // OG 카드 폭(1200px) 보호 — preview 의 긴 VERCEL_URL slug 가 넘치지 않게 축약.
  const rawHost = getSiteHost();
  const host = rawHost.length > 32 ? `${rawHost.slice(0, 31)}…` : rawHost;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: palette.paper,
          color: palette.ink,
          fontFamily: OG_FONT_STACK,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage:
              `linear-gradient(${palette.line} 1px, transparent 1px), linear-gradient(90deg, ${palette.line} 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
            opacity: 0.35,
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: palette.blue,
            }}
          />
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: 1,
              color: palette.ink,
            }}
          >
            풀림 게임즈
          </div>
          <div
            style={{
              marginLeft: 8,
              fontSize: 18,
              fontWeight: 500,
              color: palette.ink3,
            }}
          >
            Pullim Games
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontSize: 112,
              fontWeight: 700,
              letterSpacing: -3,
              lineHeight: 1.05,
              color: palette.ink,
            }}
          >
            5분, 인수분해를
          </div>
          <div
            style={{
              fontSize: 112,
              fontWeight: 700,
              letterSpacing: -3,
              lineHeight: 1.05,
              color: palette.ink,
              display: "flex",
              alignItems: "baseline",
              gap: 12,
            }}
          >
            손으로
            <span style={{ color: palette.blue }}>.</span>
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 32,
              fontWeight: 500,
              color: palette.ink3,
              lineHeight: 1.4,
              maxWidth: 880,
            }}
          >
            5문제만 풀어보세요. 푸는 동작이 곧 학습 메커니즘이 되도록
            설계된 모바일 웹 학습 게임.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 4,
                  background: i === 0 ? palette.blue : "transparent",
                  border: i === 0 ? "none" : `1.5px solid ${palette.line}`,
                }}
              />
            ))}
            <div
              style={{
                marginLeft: 12,
                fontSize: 20,
                fontWeight: 500,
                color: palette.ink3,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              오늘 1 / 5
            </div>
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: 1.5,
              color: palette.ink3,
              maxWidth: 1040,
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            {host}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
