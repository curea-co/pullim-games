// 감사 엔진. HTML 대조군 테스트와 실제 앱 CLI가 같은 측정 코드를 사용한다.
import { devices, expect } from "@playwright/test";

export function viewportOptions(vp) {
  return {
    ...(vp.device ? devices[vp.device] : {}),
    viewport: { width: vp.width, height: vp.height },
    reducedMotion: "reduce",
  };
}

export async function assertTarget(page, target) {
  await expect(page).toHaveURL(target.href);
  if (target.pathname === "/games") {
    await expect(page.getByRole("heading", { level: 1, name: "오늘은 어떤 게임으로 시작할까요?" })).toBeVisible();
    await expect(page.locator('main a[href^="/games/"]').first()).toBeVisible();
  } else if (/^\/games\/[^/]+$/.test(target.pathname)) {
    await expect(page.getByRole("link", { name: "게임 허브로 돌아가기", exact: true })).toBeVisible();
    // 게임 본문의 조작 요소 표시를 확인한다. 정답/완료 흐름은 별도 E2E 범위다.
    await expect(page.locator("main button").first()).toBeVisible();
  } else {
    await expect(page.locator("main, form").first()).toBeVisible();
  }
}

export async function scanControls(page) {
  return page.evaluate(async () => {
    const vw = innerWidth;
    const vh = innerHeight;
    const found = [];
    let checked = 0;
    let hidden = 0;
    let scrolled = 0;
    const saved = [...document.querySelectorAll("*")]
      .filter((el) => el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth)
      .map((el) => [el, el.scrollLeft, el.scrollTop]);
    const controlSelector = "button, a, input, select, textarea, summary, [role='button'], [role='radio'], [draggable='true']";
    const candidates = new Set(document.querySelectorAll(controlSelector + ", main img, main svg[role='img'], main canvas, main math, main [role='math']"));
    // 문제·힌트는 p뿐 아니라 span/div에도 렌더된다. 실제 텍스트를 가진
    // 요소를 포함한다. 버튼/링크의 중첩 span도 별도의 글자 경계가 있다.
    const walker = document.createTreeWalker(document.querySelector("main") ?? document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const parent = node.parentElement;
      if (node.textContent.trim() && parent && !parent.closest("script, style, noscript, svg")) candidates.add(parent);
    }
    function visibleBounds(ancestor) {
      let left = 0, top = 0, right = vw, bottom = vh;
      for (; ancestor; ancestor = ancestor.parentElement) {
        if (ancestor === document.body || ancestor === document.documentElement) continue;
        const style = getComputedStyle(ancestor);
        const box = ancestor.getBoundingClientRect();
        if (/auto|scroll|hidden|clip/.test(style.overflowX)) {
          left = Math.max(left, box.left + ancestor.clientLeft);
          right = Math.min(right, box.left + ancestor.clientLeft + ancestor.clientWidth);
        }
        if (/auto|scroll|hidden|clip/.test(style.overflowY)) {
          top = Math.max(top, box.top + ancestor.clientTop);
          bottom = Math.min(bottom, box.top + ancestor.clientTop + ancestor.clientHeight);
        }
      }
      return { left, top, right, bottom };
    }
    const exceedsX = (r, bounds) => r.left < bounds.left - 1 || r.right > bounds.right + 1;
    const exceedsY = (r, bounds) => r.top < bounds.top - 1 || r.bottom > bounds.bottom + 1;
    try {
      for (const el of candidates) {
        // 화면 낭독용 1px/clip 텍스트는 시각 콘텐츠가 아니다.
        // 클래스 이름만으로 제외하면 반응형 not-sr-only까지 누락되므로
        // 실제 적용된 크기와 clip 스타일을 확인한다. 조작 요소는 제외하지 않는다.
        let screenReaderOnly = false;
        if (!el.matches(controlSelector)) {
          for (let ancestor = el; ancestor; ancestor = ancestor.parentElement) {
            const style = getComputedStyle(ancestor);
            const rect = ancestor.getBoundingClientRect();
            if (rect.width <= 1 && rect.height <= 1 && style.overflow === "hidden" &&
              (style.clip === "rect(0px, 0px, 0px, 0px)" || style.clipPath === "inset(50%)")) {
              screenReaderOnly = true;
              break;
            }
          }
        }
        if (screenReaderOnly) { hidden++; continue; }
        if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) {
          hidden++;
          continue;
        }
        const before = el.getBoundingClientRect();
        // 사용자 스크롤이 막힌 hidden/clip 영역을 프로그램으로 움직여 통과시키지 않는다.
        const locked = [];
        for (let ancestor = el.parentElement; ancestor; ancestor = ancestor.parentElement) {
          const style = getComputedStyle(ancestor);
          locked.push({
            el: ancestor, x: ancestor.scrollLeft, y: ancestor.scrollTop,
            lockX: /hidden|clip/.test(style.overflowX) || ancestor === document.scrollingElement,
            lockY: /hidden|clip/.test(style.overflowY),
          });
        }
        el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
        for (const item of locked) {
          if (item.lockX || item.lockY) item.el.scrollTo({
            left: item.lockX ? item.x : item.el.scrollLeft,
            top: item.lockY ? item.y : item.el.scrollTop,
            behavior: "instant",
          });
        }
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const box = el.getBoundingClientRect();
        const textRects = [];
        // border box 안에 있어도 nowrap/hidden으로 글자가 잘릴 수 있다.
        for (const node of el.childNodes) {
          if (node.nodeType !== Node.TEXT_NODE || !node.textContent.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          textRects.push(...range.getClientRects());
        }
        const rects = [box, ...textRects];
        const r = {
          left: Math.min(...rects.map(r => r.left)), top: Math.min(...rects.map(r => r.top)),
          right: Math.max(...rects.map(r => r.right)), bottom: Math.max(...rects.map(r => r.bottom)),
        };
        r.x = r.left; r.y = r.top; r.width = r.right - r.left; r.height = r.bottom - r.top;
        checked++;
        if (Math.abs(before.top - r.top) > 1 || Math.abs(before.left - r.left) > 1) scrolled++;
        // 요소의 테두리는 부모의 clipping에만 영향을 받는다.
        // 내부 글자는 자기 요소의 clipping까지 적용해 별도로 검사한다.
        const elementBounds = visibleBounds(el.parentElement);
        const textBounds = visibleBounds(el);
        const textOverflowX = textRects.some(rect => exceedsX(rect, textBounds));
        const textOverflowY = textRects.some(rect => exceedsY(rect, textBounds));
        const overflowX = exceedsX(box, elementBounds) || textOverflowX;
        const overflowY = exceedsY(box, elementBounds) || textOverflowY;
        if (overflowX || overflowY) {
          let informational = Boolean(el.closest("form"));
          for (let ancestor = el; ancestor; ancestor = ancestor.parentElement) {
            if (["sticky", "fixed"].includes(getComputedStyle(ancestor).position)) informational = true;
          }
          found.push({
            tag: el.tagName,
            text: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 60),
            priority: informational ? "informational" : "critical",
            box: { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom },
            visibleBounds: textOverflowX || textOverflowY ? textBounds : elementBounds,
            overflowX,
            overflowY,
          });
        }
      }
    } finally {
      for (const [el, x, y] of saved) el.scrollTo({ left: x, top: y, behavior: "instant" });
    }
    return { vw, vh, checked, hidden, scrolled, overflows: found };
  });
}
