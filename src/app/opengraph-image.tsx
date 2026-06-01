import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "풀림 게임즈 — 5분, 인수분해를 손으로.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
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
          background: "#FBFAF8",
          color: "#0F172A",
          fontFamily:
            'system-ui, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
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
              "linear-gradient(#E5E5E5 1px, transparent 1px), linear-gradient(90deg, #E5E5E5 1px, transparent 1px)",
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
              background: "#0362DA",
            }}
          />
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: 1,
              color: "#0F172A",
            }}
          >
            풀림 게임즈
          </div>
          <div
            style={{
              marginLeft: 8,
              fontSize: 18,
              fontWeight: 500,
              color: "#64748B",
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
              color: "#0F172A",
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
              color: "#0F172A",
              display: "flex",
              alignItems: "baseline",
              gap: 12,
            }}
          >
            손으로
            <span style={{ color: "#0362DA" }}>.</span>
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 32,
              fontWeight: 500,
              color: "#64748B",
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
                  background: i === 0 ? "#0362DA" : "transparent",
                  border: i === 0 ? "none" : "1.5px solid #E5E5E5",
                }}
              />
            ))}
            <div
              style={{
                marginLeft: 12,
                fontSize: 20,
                fontWeight: 500,
                color: "#64748B",
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
              color: "#64748B",
            }}
          >
            pullim-games.vercel.app
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
