// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { test, expect, vi } from "vitest";
import { TimeAttackTimer } from "./TimeAttackTimer";
test("피드백 숨김은 기한을 연장하지 않고 카드 키 변경만 새30초를 만든다", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers();
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const expire = vi.fn();
  const render = async (active: boolean, key: number) => {
    await act(async () =>
      root.render(
        <TimeAttackTimer active={active} resetKey={key} onExpire={expire} />,
      ),
    );
  };
  const advance = async (n: number) => {
    await act(async () => vi.advanceTimersByTimeAsync(n));
  };
  try {
    await render(true, 0);
    await advance(22000);
    await render(false, 0);
    await advance(2000);
    await render(true, 0);
    await advance(20);
    expect(parseInt(host.textContent!)).toBeLessThanOrEqual(6);
    await advance(8000);
    expect(expire).toHaveBeenCalledTimes(1);
    await render(false, 0);
    await render(true, 0);
    await advance(1000);
    expect(expire).toHaveBeenCalledTimes(1);
    await render(true, 1);
    expect(host.textContent).toContain("30s");
    await advance(31000);
    expect(expire).toHaveBeenCalledTimes(2);
  } finally {
    await act(async () => root.unmount());
    host.remove();
    vi.useRealTimers();
  }
});
