// @vitest-environment jsdom
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test, expect } from "vitest";
import { PlantDiagram } from "./PlantDiagram";
test("줄기 체관은 형성층 바깥·물관은 안쪽에 있다", () => {
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(<PlantDiagram diagramId="stem" />);
  const phloem = host.querySelector('circle[fill="#bbf7d0"]')!;
  const xylem = host.querySelector('circle[fill="#bae6fd"]')!;
  const cambium = host.querySelector('circle[fill="#fde68a"]')!;
  expect(Number(phloem.getAttribute("r"))).toBeGreaterThan(
    Number(cambium.getAttribute("r")),
  );
  expect(Number(cambium.getAttribute("r"))).toBeGreaterThan(
    Number(xylem.getAttribute("r")),
  );
});
test("뿌리털은 뿌리 끝에 붙은 가닥이 아니다", () => {
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(<PlantDiagram diagramId="root" />);
  const hairs = [...host.querySelectorAll('line[stroke="#78350f"]')];
  expect(hairs.length).toBeGreaterThan(0);
  for (const hair of hairs)
    expect(Number(hair.getAttribute("y1"))).toBeLessThan(150);
});
