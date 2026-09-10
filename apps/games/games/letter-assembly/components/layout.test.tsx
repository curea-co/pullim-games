import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test, expect } from "vitest";
import { SlotRow } from "./SlotRow";
const slots = [
  { id: "s1", correctCardId: "c1" },
  { id: "s2", correctCardId: "c2" },
  { id: "s3", correctCardId: "c3" },
];
test("森은 위1개 아래2개의 실제 구성으로 배치한다", () => {
  const html = renderToStaticMarkup(
    <SlotRow
      target="森"
      slots={slots}
      placements={new Map()}
      disabled={false}
      onSlotTap={() => {}}
    />,
  );
  expect(html).toContain("grid-template-areas");
  expect(html).not.toContain(">+</span>");
});
test("休의 왼쪽 人은 亻로 표시하되 오답 木을 바꾸지 않는다", () => {
  const props = {
    target: "休",
    slots: slots.slice(0, 2),
    disabled: false,
    onSlotTap: () => {},
  };
  const html = renderToStaticMarkup(
    <SlotRow
      {...props}
      placements={new Map([["s1", { id: "c1", text: "人" }]])}
    />,
  );
  expect(html).toContain(">亻</button>");
  const wrong = renderToStaticMarkup(
    <SlotRow
      {...props}
      placements={new Map([["s1", { id: "c2", text: "木" }]])}
    />,
  );
  expect(wrong).not.toContain("亻</button>");
});
