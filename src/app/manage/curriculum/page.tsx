"use client";

// /manage/curriculum — 교육과정 트리 CRUD.
// 단순화: 과목 선택 후 단원·차시 트리 (depth 무제한) — drag 정렬은 V0.6+, 위/아래 화살표.

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  deleteCurriculum,
  loadCurriculum,
  loadSubjects,
  newId,
  saveCurriculum,
  type CustomCurriculum,
  type CustomSubject,
} from "@/lib/core";
import { cn } from "@/lib/utils";

interface CurriculumNode extends CustomCurriculum {
  children: CurriculumNode[];
}

function buildTree(items: CustomCurriculum[]): CurriculumNode[] {
  const byId = new Map<string, CurriculumNode>();
  for (const it of items) byId.set(it.id, { ...it, children: [] });
  const roots: CurriculumNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  // sort by order
  function sortRec(arr: CurriculumNode[]) {
    arr.sort((a, b) => a.order - b.order);
    for (const a of arr) sortRec(a.children);
  }
  sortRec(roots);
  return roots;
}

export default function CurriculumPage() {
  const [subjects, setSubjects] = useState<CustomSubject[]>([]);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [items, setItems] = useState<CustomCurriculum[]>([]);
  const [editing, setEditing] = useState<{
    parentId?: string;
    item: CustomCurriculum | null; // null = new under parentId
  } | null>(null);
  const [name, setName] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const subs = loadSubjects();
    setSubjects(subs);
    if (subs.length > 0 && !activeSubjectId) setActiveSubjectId(subs[0]!.id);
    setItems(loadCurriculum());
  }, [activeSubjectId]);

  function refresh() {
    setItems(loadCurriculum());
  }

  function toggle(id: string) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  }

  function startNew(parentId?: string) {
    if (!activeSubjectId) return;
    setEditing({ parentId, item: null });
    setName("");
  }

  function startEdit(item: CustomCurriculum) {
    setEditing({ parentId: item.parentId, item });
    setName(item.name);
  }

  function cancel() {
    setEditing(null);
    setName("");
  }

  function commit() {
    if (!editing || !activeSubjectId) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    if (editing.item) {
      saveCurriculum({
        ...editing.item,
        name: trimmed,
        updatedAt: new Date().toISOString(),
      });
    } else {
      const siblings = items.filter(
        (c) =>
          c.subjectId === activeSubjectId &&
          (c.parentId ?? null) === (editing.parentId ?? null),
      );
      const order = siblings.length;
      saveCurriculum({
        id: newId(),
        subjectId: activeSubjectId,
        name: trimmed,
        parentId: editing.parentId,
        order,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    refresh();
    cancel();
  }

  function remove(id: string) {
    if (!window.confirm("이 단원과 하위 단원·카드를 모두 삭제할까요?")) return;
    deleteCurriculum(id);
    refresh();
  }

  if (subjects.length === 0) {
    return (
      <div className="rounded-block border border-dashed border-border-hairline bg-bg-block p-5 text-center text-helper text-type-secondary">
        먼저 과목을 만들어주세요.
      </div>
    );
  }

  const subjectItems = items.filter((it) => it.subjectId === activeSubjectId);
  const tree = buildTree(subjectItems);

  return (
    <div className="flex flex-col gap-4">
      {/* 과목 선택 */}
      <div className="flex flex-wrap gap-1.5">
        {subjects.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveSubjectId(s.id)}
            className={cn(
              "rounded-button border px-3 py-1.5 text-helper transition-colors",
              activeSubjectId === s.id
                ? "border-type-primary bg-accent-positive/10 font-medium text-type-primary"
                : "border-border-hairline bg-bg-block text-type-secondary hover:text-type-primary",
            )}
          >
            {s.name}
          </button>
        ))}
      </div>

      <header className="flex items-center justify-between">
        <p className="text-helper text-type-secondary">
          {subjectItems.length}개 단원
        </p>
        <button
          type="button"
          onClick={() => startNew(undefined)}
          className="inline-flex items-center gap-1.5 rounded-button border border-type-primary bg-bg-block px-3 py-2 text-helper font-medium text-type-primary hover:bg-accent-positive/10"
        >
          <Plus className="h-3.5 w-3.5" />
          최상위 단원 추가
        </button>
      </header>

      {editing && (
        <section className="rounded-block border border-type-primary bg-bg-block p-4">
          <h2 className="text-label font-bold text-type-primary">
            {editing.item ? "단원 수정" : "단원 추가"}
            {editing.parentId && (
              <span className="ml-2 text-helper text-type-secondary">
                (하위 단원)
              </span>
            )}
          </h2>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 1단원, 1차시, 어법"
            autoFocus
            autoComplete="off"
            className="mt-3 w-full rounded-button border border-border-hairline bg-bg-block px-3 py-2 text-body text-type-primary placeholder:text-type-secondary/60 focus:border-type-primary focus:outline-none"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={cancel}
              className="rounded-button border border-border-hairline bg-bg-block px-3 py-2 text-helper text-type-secondary hover:text-type-primary"
            >
              취소
            </button>
            <button
              type="button"
              onClick={commit}
              disabled={!name.trim()}
              className="rounded-button border border-type-primary bg-bg-block px-3 py-2 text-helper font-medium text-type-primary hover:bg-accent-positive/10 disabled:opacity-50"
            >
              저장
            </button>
          </div>
        </section>
      )}

      {tree.length === 0 ? (
        <p className="rounded-block border border-dashed border-border-hairline bg-bg-block p-5 text-center text-helper text-type-secondary">
          이 과목에 단원이 없어요. "최상위 단원 추가" 로 시작하세요.
        </p>
      ) : (
        <TreeNodes
          nodes={tree}
          depth={0}
          expanded={expanded}
          onToggle={toggle}
          onAddChild={(parentId) => startNew(parentId)}
          onEdit={startEdit}
          onDelete={remove}
        />
      )}
    </div>
  );
}

interface TreeNodesProps {
  nodes: CurriculumNode[];
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onEdit: (item: CustomCurriculum) => void;
  onDelete: (id: string) => void;
}

function TreeNodes({
  nodes,
  depth,
  expanded,
  onToggle,
  onAddChild,
  onEdit,
  onDelete,
}: TreeNodesProps) {
  return (
    <ul
      className={cn(
        "flex flex-col gap-1.5",
        depth > 0 && "ml-4 border-l border-border-hairline pl-3",
      )}
    >
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;
        const isOpen = expanded.has(node.id);
        return (
          <li key={node.id}>
            <div className="flex items-center gap-2 rounded-block border border-border-hairline bg-bg-block px-3 py-2">
              <button
                type="button"
                onClick={() => onToggle(node.id)}
                aria-label={isOpen ? "접기" : "펼치기"}
                disabled={!hasChildren}
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-button text-type-secondary",
                  hasChildren
                    ? "hover:bg-pullim-slate-100"
                    : "opacity-30",
                )}
              >
                {isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
              <span className="flex-1 text-label text-type-primary">
                {node.name}
              </span>
              <button
                type="button"
                onClick={() => onAddChild(node.id)}
                aria-label="하위 단원 추가"
                className="inline-flex h-7 w-7 items-center justify-center rounded-button text-type-secondary hover:bg-pullim-slate-100 hover:text-type-primary"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onEdit(node)}
                aria-label="수정"
                className="inline-flex h-7 w-7 items-center justify-center rounded-button text-type-secondary hover:bg-pullim-slate-100 hover:text-type-primary"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(node.id)}
                aria-label="삭제"
                className="inline-flex h-7 w-7 items-center justify-center rounded-button text-type-secondary hover:bg-accent-negative/10 hover:text-accent-negative"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {hasChildren && isOpen && (
              <div className="mt-1.5">
                <TreeNodes
                  nodes={node.children}
                  depth={depth + 1}
                  expanded={expanded}
                  onToggle={onToggle}
                  onAddChild={onAddChild}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
