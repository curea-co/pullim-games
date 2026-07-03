"use client";

// 앱 스위처 — pullim-web src/components/os/ServiceSwitcher.tsx 구조 이식 + games 어댑트.
// 상단 바에서 다른 풀림 앱(플래너·문제큐·게임즈 등)으로 하드 내비게이션하는 드롭다운.
// games 어댑트: entitlement 잠금(serviceGate)·useSession 제거 — 잠금 없이 live 서비스 전부 노출.
// current='games' 고정(자기 앱). href 는 os-services 가 절대 URL 로 제공(@/lib/os/urls).
//
// KNOWN-TRADE-OFF (codex #138 R4 · 근거: proc/plan/2026-07-02_os-shell-port.md §0 + [[project_pullim_web_integration]]):
//   games 회원 세션(`pullim_games_session`)은 host-only 쿠키(Domain 미지정 — lib/server/auth/session.ts)라
//   sibling 앱으로 하드 내비게이션해도 세션이 동반되지 않는다(회원은 대상 앱에서 재인증). games 는 자체
//   standalone auth 이고, cross-서브도메인 세션 연속성(Domain=.pullim.ai)은 **공유 auth(pullim-api)
//   SSO 트랙**(Q 의 NEXT_PUBLIC_DOMAIN_API_URL 모델) 이라 본 셸 PR scope 밖. 게스트(games 1차 사용자)는
//   보존할 세션이 없어 무영향, 회원은 대상 앱 로그인으로 graceful. SSO 채택 시 연속성 확보(별 작업).
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { OS_SERVICES_NAV } from "@/lib/os-services";

interface ServiceSwitcherProps {
  current: string; // slug or 'home'
}

export function ServiceSwitcher({ current }: ServiceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const currentService = OS_SERVICES_NAV.find((s) => s.slug === current);
  const triggerName = current === "home" ? "OS 홈" : (currentService?.name ?? "OS");
  const triggerIcon = current === "home" ? null : currentService?.icon;

  return (
    <div className={`switcher${open ? " open" : ""}`} ref={ref} style={{ marginLeft: "8px" }}>
      <button
        className="switcher-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`서비스 전환 — 현재 ${triggerName}`}
      >
        <span className="sg">
          {triggerIcon ? (
            <Image src={triggerIcon} alt={triggerName} width={24} height={24} style={{ width: "100%", height: "100%" }} />
          ) : (
            <span
              style={{
                width: "100%",
                height: "100%",
                background: "var(--pullim-blue)",
                color: "#fff",
                display: "grid",
                placeItems: "center",
                fontSize: "15px",
                borderRadius: "var(--r-sm)",
              }}
            >
              ⌂
            </span>
          )}
        </span>
        <span className="sn">{triggerName}</span>
        <svg
          className="chev"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* 네비게이션(다른 앱으로 이동) — listbox/option(값 선택) 의미론 아님(codex #138 R8). 링크 목록. */}
      <nav className="switcher-menu" aria-label="다른 풀림 서비스로 전환">
        <div className="sm-head">서비스 전환</div>

        {OS_SERVICES_NAV.map((svc) => {
          const isCurrent = current === svc.slug;
          const inner = (
            <>
              <span className="sg">
                <Image src={svc.icon} alt={svc.name} width={34} height={34} style={{ width: "100%", height: "100%" }} />
              </span>
              <div>
                <div className="sm-name">
                  {svc.name}
                  {isCurrent && (
                    <span className="badge soft" style={{ marginLeft: "6px" }}>
                      현재
                    </span>
                  )}
                  {!isCurrent && svc.status === "soon" && (
                    <span className="badge soft" style={{ marginLeft: "6px" }}>
                      준비중
                    </span>
                  )}
                  {!isCurrent && svc.status === "beta" && (
                    <span className="badge soft" style={{ marginLeft: "6px" }}>
                      베타
                    </span>
                  )}
                </div>
                <div className="sm-desc">{svc.desc}</div>
              </div>
            </>
          );
          // 현재 서비스(games)는 링크가 아닌 비활성 표시 — svc.href 는 gamesUrl() 이라 클릭 시
          // preview/localhost 에서 다른 환경(dev-games/prod)으로 새는 것을 차단(codex #138 R3).
          if (isCurrent) {
            // 현재 앱 — 링크 아님(비활성 표시). aria-current 로 "현재 위치" 전달.
            return (
              <span key={svc.slug} className="sm-item" aria-current="page" style={{ cursor: "default" }}>
                {inner}
              </span>
            );
          }
          return (
            <a
              key={svc.slug}
              className={`sm-item${svc.status === "soon" ? " is-soon" : ""}`}
              href={svc.href}
              aria-disabled={svc.status === "soon" || undefined}
            >
              {inner}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
