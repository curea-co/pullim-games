// 사용자 커스텀 콘텐츠 localStorage 영속화.
// `2026-05-08_management.md` §4.6 따름.
//
// 키:
//   pullim-games:custom:subjects
//   pullim-games:custom:curriculum
//   pullim-games:custom:cards

import type {
  CustomCard,
  CustomCardKind,
  CustomCurriculum,
  CustomDataExport,
  CustomSubject,
} from "./types";

const KEY_SUBJECTS = "pullim-games:custom:subjects";
const KEY_CURRICULUM = "pullim-games:custom:curriculum";
const KEY_CARDS = "pullim-games:custom:cards";

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function loadArray<T>(key: string): T[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function saveArray<T>(key: string, value: T[]): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage 가득 차거나 거부 — silent
  }
}

// ── Subjects ─────────────────────────────────────────────

export function loadSubjects(): CustomSubject[] {
  return loadArray<CustomSubject>(KEY_SUBJECTS);
}

export function saveSubject(s: CustomSubject): void {
  const list = loadSubjects();
  const idx = list.findIndex((x) => x.id === s.id);
  if (idx >= 0) list[idx] = s;
  else list.push(s);
  saveArray(KEY_SUBJECTS, list);
}

export function deleteSubject(id: string): void {
  const subjects = loadSubjects().filter((s) => s.id !== id);
  saveArray(KEY_SUBJECTS, subjects);
  // cascade: 해당 과목의 단원·카드 삭제
  const curriculum = loadCurriculum().filter((c) => c.subjectId !== id);
  saveArray(KEY_CURRICULUM, curriculum);
  const cards = loadCards().filter((c) => c.subjectId !== id);
  saveArray(KEY_CARDS, cards);
}

// ── Curriculum ───────────────────────────────────────────

export function loadCurriculum(): CustomCurriculum[] {
  return loadArray<CustomCurriculum>(KEY_CURRICULUM);
}

export function saveCurriculum(c: CustomCurriculum): void {
  const list = loadCurriculum();
  const idx = list.findIndex((x) => x.id === c.id);
  if (idx >= 0) list[idx] = c;
  else list.push(c);
  saveArray(KEY_CURRICULUM, list);
}

export function deleteCurriculum(id: string): void {
  // cascade: 자식 노드도 재귀 삭제
  const all = loadCurriculum();
  const toDelete = new Set<string>([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of all) {
      if (c.parentId && toDelete.has(c.parentId) && !toDelete.has(c.id)) {
        toDelete.add(c.id);
        changed = true;
      }
    }
  }
  saveArray(
    KEY_CURRICULUM,
    all.filter((c) => !toDelete.has(c.id)),
  );
  // cascade: 카드 삭제
  const cards = loadCards().filter((card) => !toDelete.has(card.curriculumId));
  saveArray(KEY_CARDS, cards);
}

// ── Cards ────────────────────────────────────────────────

export function loadCards(): CustomCard[] {
  return loadArray<CustomCard>(KEY_CARDS);
}

export function loadCardsByKind(kind: CustomCardKind): CustomCard[] {
  return loadCards().filter((c) => c.kind === kind);
}

export function loadCardsByCurriculum(curriculumId: string): CustomCard[] {
  return loadCards().filter((c) => c.curriculumId === curriculumId);
}

export function saveCard(card: CustomCard): void {
  const list = loadCards();
  const idx = list.findIndex((x) => x.id === card.id);
  if (idx >= 0) list[idx] = card;
  else list.push(card);
  saveArray(KEY_CARDS, list);
}

export function deleteCard(id: string): void {
  saveArray(
    KEY_CARDS,
    loadCards().filter((c) => c.id !== id),
  );
}

// ── Counts ───────────────────────────────────────────────

export interface CustomCounts {
  subjects: number;
  curriculum: number;
  cards: number;
  cardsByKind: Record<CustomCardKind, number>;
}

export function loadCounts(): CustomCounts {
  const cards = loadCards();
  const byKind: Record<CustomCardKind, number> = {
    "multiple-choice": 0,
    blank: 0,
    typing: 0,
    "word-match": 0,
  };
  for (const c of cards) byKind[c.kind] += 1;
  return {
    subjects: loadSubjects().length,
    curriculum: loadCurriculum().length,
    cards: cards.length,
    cardsByKind: byKind,
  };
}

// ── Export / Import ──────────────────────────────────────

export function exportCustomData(): CustomDataExport {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    subjects: loadSubjects(),
    curriculum: loadCurriculum(),
    cards: loadCards(),
  };
}

/**
 * import 정책: append (기존 데이터 보존, id 충돌 시 import 측 우선).
 * version 1 만 지원. 미지원 시 throw.
 */
export function importCustomData(data: CustomDataExport): void {
  if (data.version !== 1) {
    throw new Error(`지원하지 않는 export version: ${data.version}`);
  }
  // subjects merge
  const subjects = loadSubjects();
  const subjMap = new Map(subjects.map((s) => [s.id, s]));
  for (const s of data.subjects) subjMap.set(s.id, s);
  saveArray(KEY_SUBJECTS, [...subjMap.values()]);
  // curriculum merge
  const curr = loadCurriculum();
  const currMap = new Map(curr.map((c) => [c.id, c]));
  for (const c of data.curriculum) currMap.set(c.id, c);
  saveArray(KEY_CURRICULUM, [...currMap.values()]);
  // cards merge
  const cards = loadCards();
  const cardsMap = new Map(cards.map((c) => [c.id, c]));
  for (const c of data.cards) cardsMap.set(c.id, c);
  saveArray(KEY_CARDS, [...cardsMap.values()]);
}

/** 전체 초기화 — 테스트 / 사용자 명시 reset 시. */
export function clearAllCustomData(): void {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(KEY_SUBJECTS);
  storage.removeItem(KEY_CURRICULUM);
  storage.removeItem(KEY_CARDS);
}

/** uuid v4 (간단한 fallback — crypto.randomUUID 미지원 시) */
export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
