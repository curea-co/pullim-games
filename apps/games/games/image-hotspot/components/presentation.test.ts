import { test, expect } from "vitest";
import { getCardSequence } from "../content";
import { diagramCallout, correctedDiagramHint } from "./presentation";
test("도해 힌트는 이차 생장 조건과 떡잎을 포함하는 배의 범위를 명시한다", () => {
  expect(correctedDiagramHint("card-004", "stem", "legacy")).toContain("이차 생장");
  for (const id of ["card-005", "image-hotspot-luna-batch-005"]) {
    const hint = correctedDiagramHint(id, "seed", "배는 중앙 작은 점");
    expect(hint).toContain("떡잎도 배의 일부");
    expect(hint).not.toContain("중앙 작은 점");
  }
  expect(correctedDiagramHint("unknown", "seed", "original")).toBe("original");
});
test("현재 카드 풀 ID/정답 보존과 표시 좌표의44px 비중첩", () => {
  const cards = getCardSequence(),
    before = structuredClone(cards);
  for (const card of cards) {
    const boxes = card.problem.regions.map((r) => {
      const c = diagramCallout(card.id, card.problem.diagramId, r.id);
      if (c) for (const p of c.point) expect(p).toBeGreaterThanOrEqual(0);
      const b = c?.bbox ?? r.bbox;
      return {
        x: b.x * 2.2,
        y: b.y * 2.2,
        w: Math.max(44, b.width * 2.2),
        h: Math.max(44, b.height * 2.2),
      };
    });
    for (let a = 0; a < boxes.length; a++)
      for (let b = a + 1; b < boxes.length; b++) {
        const x =
          Math.min(boxes[a].x + boxes[a].w, boxes[b].x + boxes[b].w) -
          Math.max(boxes[a].x, boxes[b].x);
        const y =
          Math.min(boxes[a].y + boxes[a].h, boxes[b].y + boxes[b].h) -
          Math.max(boxes[a].y, boxes[b].y);
        expect(x > 1 && y > 1).toBe(false);
      }
  }
  expect(cards).toEqual(before);
  expect(diagramCallout("unregistered", "stem", "r1")).toBeUndefined();
  expect(correctedDiagramHint("card-003", "root", "legacy")).toContain(
    "끝보다 위",
  );
  expect(correctedDiagramHint("card-004", "stem", "legacy")).toContain(
    "체관은 형성층 바깥",
  );
});
