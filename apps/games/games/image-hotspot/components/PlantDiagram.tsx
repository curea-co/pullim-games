// 식물 구조 SVG 인라인 도식 — viewBox 200x200, lightweight illustrative.
// 5종: flower, leaf, root, stem, seed. region overlay 와 좌표 동일 기준(0~100 %).
//
// 정교도 V0.1 (2026-05-14): 추상 도형 → 식물 부위 식별 가능한 paths.
// region bbox 좌표는 content/index.ts 와 1:1 보존 — 학습 의도/난이도 유지.

import type { DiagramId } from "../schema";

interface PlantDiagramProps {
  diagramId: DiagramId;
}

export function PlantDiagram({ diagramId }: PlantDiagramProps) {
  switch (diagramId) {
    case "flower":
      return <FlowerSvg />;
    case "leaf":
      return <LeafSvg />;
    case "root":
      return <RootSvg />;
    case "stem":
      return <StemSvg />;
    case "seed":
      return <SeedSvg />;
  }
}

/** SSR/client 부동소수점 mismatch 회피 — 소수점 2자리로 round. */
function r2(x: number): number {
  return Math.round(x * 100) / 100;
}

// ───────────────────── 꽃 ─────────────────────
// region: petal(상단), pistil(중앙), stamen(우측), sepal(하단)
// - 꽃잎 5장: 둥근 끝 + 좁은 base 의 잎 모양 path (5장 둘레 배치)
// - 암술: 중앙 굵은 stigma (Y 모양) + 둘레 라운드
// - 수술: filament 라인 + 끝 anther (작은 타원)
// - 꽃받침: 하단 두 잎 (V 두 장)
function FlowerSvg() {
  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label="꽃 구조 도식"
      className="h-full w-full"
    >
      {/* 꽃잎 5장 — 둥근 끝 + base 좁음 (잎 모양 path) */}
      {[0, 72, 144, 216, 288].map((deg) => {
        const r = 50;
        const cx = r2(100 + r * Math.cos((deg * Math.PI) / 180));
        const cy = r2(100 + r * Math.sin((deg * Math.PI) / 180));
        // base = 중앙 쪽, tip = 바깥 쪽. transform 으로 회전.
        // path: 좁은 base 에서 좌우로 부풀고 끝이 둥근 형태
        return (
          <g
            key={deg}
            transform={`rotate(${deg} ${cx} ${cy}) translate(${cx - 24} ${cy - 14})`}
          >
            <path
              d="M 24 14 C 8 18, 0 14, 0 14 C 0 14, 8 10, 24 14 C 36 14, 48 8, 48 14 C 48 20, 36 14, 24 14 Z"
              fill="#fce7f3"
              stroke="#ec4899"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </g>
        );
      })}

      {/* 수술 6개 — filament 라인 + 끝 anther */}
      {[30, 90, 150, 210, 270, 330].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const baseR = 10;
        const tipR = 22;
        const x1 = r2(100 + baseR * Math.cos(rad));
        const y1 = r2(100 + baseR * Math.sin(rad));
        const x2 = r2(100 + tipR * Math.cos(rad));
        const y2 = r2(100 + tipR * Math.sin(rad));
        return (
          <g key={deg}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#d97706"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <ellipse cx={x2} cy={y2} rx="2.4" ry="3.4" fill="#f59e0b" />
          </g>
        );
      })}

      {/* 암술 — 중앙 stigma (Y) + style + ovary */}
      <g>
        <circle cx="100" cy="100" r="8" fill="#fbbf24" stroke="#b45309" strokeWidth="1.6" />
        <path
          d="M 100 92 L 100 86 M 100 92 L 95 85 M 100 92 L 105 85"
          stroke="#b45309"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      {/* 꽃받침 — 하단 두 잎 (V 두 장) */}
      <g>
        <path
          d="M 78 168 Q 86 188 100 184 Q 90 176 82 165 Z"
          fill="#bbf7d0"
          stroke="#16a34a"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M 122 168 Q 114 188 100 184 Q 110 176 118 165 Z"
          fill="#bbf7d0"
          stroke="#16a34a"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

// ───────────────────── 잎 ─────────────────────
// region: blade(좌측 잎몸 22~44, 20~70), vein(중앙 46~54, 20~70), petiole(하단 42~58, 80~98)
// - 잎몸: 잎끝 뾰족한 비대칭 path (top tip, bottom 잎자루 쪽 좁음)
// - 잎맥: 곡선 중심선 + 좌우 깃털 모양 곁가지
// - 잎자루: 좁아지는 path (잎몸과 연결)
function LeafSvg() {
  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label="잎 구조 도식"
      className="h-full w-full"
    >
      {/* 잎몸 — 잎끝 뾰족 path */}
      <path
        d="M 100 20 Q 160 50 150 110 Q 130 150 100 160 Q 70 150 50 110 Q 40 50 100 20 Z"
        fill="#bbf7d0"
        stroke="#16a34a"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* 잎맥 중심선 — 끝까지 살짝 곡선 */}
      <path
        d="M 100 22 Q 100 80 100 158"
        stroke="#15803d"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />

      {/* 잎맥 곁가지 — 깃털 모양 곡선 4쌍 */}
      {[
        { y: 45, sx: 70, ex: 64, ey: 35 },
        { y: 70, sx: 60, ex: 54, ey: 60 },
        { y: 100, sx: 56, ex: 50, ey: 92 },
        { y: 130, sx: 64, ex: 60, ey: 124 },
      ].map((v, i) => (
        <g key={i}>
          <path
            d={`M 100 ${v.y} Q ${v.sx} ${v.y - 4} ${v.ex} ${v.ey}`}
            stroke="#15803d"
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d={`M 100 ${v.y} Q ${200 - v.sx} ${v.y - 4} ${200 - v.ex} ${v.ey}`}
            stroke="#15803d"
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      ))}

      {/* 잎자루 — 잎몸 아래에서 점점 좁아져 줄기로 */}
      <path
        d="M 94 160 Q 96 175 95 195 L 105 195 Q 104 175 106 160 Z"
        fill="#22c55e"
        stroke="#15803d"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ───────────────────── 뿌리 ─────────────────────
// region: stem-top(42-58, 2-26), main(46-54, 28-78), lateral(20-42, 50-76), hair(42-58, 82-98)
// - 지표선 추가 (땅 표시), 줄기는 지표 위
// - 원뿌리: top thick → bottom thin (path)
// - 곁뿌리: 곡선 + 끝 가늘어짐
// - 뿌리털: 짧은 가닥 + 끝 다양화
function RootSvg() {
  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label="뿌리 구조 도식"
      className="h-full w-full"
    >
      {/* 지표선 — 줄기 / 뿌리 경계 */}
      <line
        x1="10"
        y1="52"
        x2="190"
        y2="52"
        stroke="#a16207"
        strokeWidth="1"
        strokeDasharray="3 4"
      />

      {/* 줄기 — 지표 위 */}
      <path
        d="M 92 8 Q 90 26 92 50 L 108 50 Q 110 26 108 8 Z"
        fill="#22c55e"
        stroke="#15803d"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* 줄기 잎 한쪽 — 시각 보조 */}
      <path
        d="M 108 22 Q 124 18 130 28 Q 120 32 108 28 Z"
        fill="#bbf7d0"
        stroke="#16a34a"
        strokeWidth="1.4"
      />

      {/* 원뿌리 — top thick → bottom thin */}
      <path
        d="M 92 52 Q 90 100 95 158 L 105 158 Q 110 100 108 52 Z"
        fill="#a16207"
        stroke="#78350f"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      {/* 곁뿌리 — 곡선 path (좌·우 2쌍) */}
      <path
        d="M 96 76 Q 76 86 56 102 Q 50 108 46 116"
        stroke="#92400e"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 104 76 Q 124 86 144 102 Q 150 108 154 116"
        stroke="#92400e"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 96 120 Q 70 132 52 150"
        stroke="#92400e"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 104 120 Q 130 132 148 150"
        stroke="#92400e"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />

      {/* 뿌리털 — 원뿌리 끝 + 곁뿌리 끝에 짧은 가닥 */}
      {[
        { x: 100, y: 162, dx: -3, dy: 10 },
        { x: 100, y: 162, dx: 3, dy: 10 },
        { x: 100, y: 162, dx: 0, dy: 12 },
        { x: 95, y: 168, dx: -4, dy: 8 },
        { x: 105, y: 168, dx: 4, dy: 8 },
        { x: 46, y: 116, dx: -3, dy: 6 },
        { x: 154, y: 116, dx: 3, dy: 6 },
        { x: 52, y: 150, dx: -3, dy: 6 },
        { x: 148, y: 150, dx: 3, dy: 6 },
      ].map((h, i) => (
        <line
          key={i}
          x1={h.x}
          y1={h.y}
          x2={h.x + h.dx}
          y2={h.y + h.dy}
          stroke="#78350f"
          strokeWidth="1"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

// ───────────────────── 줄기 단면 ─────────────────────
// region: outer(5-17, 42-58), cambium(22-32, 42-58), xylem(34-42, 42-58), phloem(43-57, 43-57)
// - 동심원 4개 유지 (region bbox 좌측 가로 배치 기준)
// - 외피: 거친 dash 텍스처
// - 물관/체관: 작은 점/방사선 (관다발)
function StemSvg() {
  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label="줄기 단면 도식"
      className="h-full w-full"
    >
      {/* 외피 (가장 바깥 ring) */}
      <circle cx="100" cy="100" r="80" fill="#fef3c7" stroke="#a16207" strokeWidth="3" />
      {/* 외피 dash 텍스처 */}
      <circle
        cx="100"
        cy="100"
        r="76"
        fill="none"
        stroke="#92400e"
        strokeWidth="1"
        strokeDasharray="4 6"
      />

      {/* 형성층 ring */}
      <circle cx="100" cy="100" r="55" fill="#fde68a" stroke="#92400e" strokeWidth="2" />

      {/* 물관 ring */}
      <circle cx="100" cy="100" r="32" fill="#bae6fd" stroke="#0369a1" strokeWidth="2" />

      {/* 물관 관다발 점 — 방사선 배치 */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const cx = r2(100 + 22 * Math.cos(rad));
        const cy = r2(100 + 22 * Math.sin(rad));
        return <circle key={deg} cx={cx} cy={cy} r="2" fill="#0369a1" />;
      })}

      {/* 체관 (중앙 가장 안쪽) */}
      <circle cx="100" cy="100" r="14" fill="#bbf7d0" stroke="#15803d" strokeWidth="2" />
      {/* 체관 중심 점 */}
      <circle cx="100" cy="100" r="3" fill="#15803d" />
    </svg>
  );
}

// ───────────────────── 씨앗 ─────────────────────
// region: coat(4-18, 46-60), cotyledon(24-42, 45-61), embryo(43-57, 43-57)
// - 종피: 타원 + 점 텍스처
// - 떡잎: 좌/우 음영 차이로 두 쪽 명확
// - 배: 중앙 원 + 작은 뿌리/싹 표시
function SeedSvg() {
  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label="씨앗 구조 도식"
      className="h-full w-full"
    >
      {/* 종피 (껍질) */}
      <ellipse cx="100" cy="100" rx="80" ry="60" fill="#fde68a" stroke="#92400e" strokeWidth="3" />
      {/* 종피 점 텍스처 — 외곽 둘레 */}
      {[20, 60, 100, 140, 200, 240, 280, 320].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const cx = r2(100 + 72 * Math.cos(rad));
        const cy = r2(100 + 54 * Math.sin(rad));
        return <circle key={deg} cx={cx} cy={cy} r="1.4" fill="#a16207" />;
      })}

      {/* 떡잎 (좌·우 반원, 음영 차이) */}
      <path
        d="M 100 50 A 50 50 0 0 0 100 150 L 100 50 Z"
        fill="#fef9c3"
        stroke="#a16207"
        strokeWidth="2"
      />
      <path
        d="M 100 50 A 50 50 0 0 1 100 150 L 100 50 Z"
        fill="#fde047"
        stroke="#a16207"
        strokeWidth="2"
      />
      {/* 떡잎 중심선 강조 */}
      <line x1="100" y1="55" x2="100" y2="145" stroke="#78350f" strokeWidth="1.2" />

      {/* 배 (중앙) + 어린 뿌리/싹 표시 */}
      <circle cx="100" cy="100" r="10" fill="#bbf7d0" stroke="#15803d" strokeWidth="2" />
      <path
        d="M 100 100 L 100 92 M 100 100 L 96 108 M 100 100 L 104 108"
        stroke="#15803d"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
