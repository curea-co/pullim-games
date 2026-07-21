"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

import { RequireIdentity } from "@/components/auth/RequireIdentity";
import { PlayerLoadingState } from "@/components/game-shell";
import {
  createLearningEventQueueStore,
  createLibraryEventBatchSender,
  createLibraryLearningEventBridge,
  DEFAULT_LIBRARY_EVENT_QUEUE_KEY,
  fetchLibraryClientSession,
  installLibraryLearningEventBridge,
  LearningEventQueue,
  type KeyValueStorage,
} from "@/lib/library/runtime";

function createMemoryStorage(): KeyValueStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

function createQueue(launchId: string): LearningEventQueue {
  const key = `${DEFAULT_LIBRARY_EVENT_QUEUE_KEY}:${encodeURIComponent(launchId)}`;
  const sender = createLibraryEventBatchSender();
  try {
    return new LearningEventQueue(
      createLearningEventQueueStore(window.localStorage, key),
      sender,
    );
  } catch {
    // storage 거부/손상은 플레이를 막지 않는다. 현재 탭 메모리 queue로 축소.
    return new LearningEventQueue(
      createLearningEventQueueStore(createMemoryStorage(), key),
      sender,
    );
  }
}

export function LibraryLaunchGate({
  gameId,
  children,
}: {
  gameId: string;
  children: ReactNode;
}) {
  const searchParams = useSearchParams();
  const isLibraryLaunch = searchParams.get("library") === "1";
  const mode = searchParams.get("mode") ?? "default";
  const launchKey = `${gameId}\u0000${mode}`;
  const [state, setState] = useState<{
    status: "loading" | "ready" | "error";
    key?: string;
  }>({ status: "loading" });

  useEffect(() => {
    if (!isLibraryLaunch) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    setState({ status: "loading", key: launchKey });

    void fetchLibraryClientSession(gameId, mode)
      .then((session) => {
        if (cancelled) return;
        const queue = createQueue(session.launchId);
        const bridge = createLibraryLearningEventBridge(
          {
            payload: {
              anonymousUserId: session.anonymousUserId,
              sessionId: session.sessionId,
              activity: session.activity,
            },
          },
          queue,
        );
        cleanup = installLibraryLearningEventBridge(bridge);
        setState({ status: "ready", key: launchKey });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", key: launchKey });
      });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [gameId, isLibraryLaunch, launchKey, mode]);

  if (!isLibraryLaunch) {
    return <RequireIdentity>{children}</RequireIdentity>;
  }
  if (state.status === "error" && state.key === launchKey) {
    return (
      <PlayerLoadingState label="Library 실행 링크가 만료되었거나 유효하지 않아요" />
    );
  }
  if (state.status !== "ready" || state.key !== launchKey) {
    return <PlayerLoadingState label="Library 학습 활동을 준비하고 있어요" />;
  }
  return <>{children}</>;
}
