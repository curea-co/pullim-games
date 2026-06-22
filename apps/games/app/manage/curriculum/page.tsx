"use client";

// /manage/curriculum — 교육과정 트리 CRUD. shadcn 컴포넌트.

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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ConfirmDeleteDialog } from "@/components/manage/ConfirmDeleteDialog";
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
    item: CustomCurriculum | null;
  } | null>(null);
  const [name, setName] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    label: string;
  } | null>(null);

  // mount 1회만 로드. 이전엔 deps 에 activeSubjectId 있어 활성 과목 변경 때마다
  // 불필요한 localStorage 재읽기·setState 폭. (Plan A C9)
  useEffect(() => {
    const subs = loadSubjects();
    setSubjects(subs);
    if (subs.length > 0) setActiveSubjectId(subs[0]!.id);
    setItems(loadCurriculum());
  }, []);

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

  function askRemove(id: string, label: string) {
    setConfirmDelete({ id, label });
  }

  function performRemove() {
    if (!confirmDelete) return;
    deleteCurriculum(confirmDelete.id);
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
      <ToggleGroup
        type="single"
        value={activeSubjectId ?? ""}
        onValueChange={(v) => v && setActiveSubjectId(v)}
        aria-label="과목"
        className="flex-wrap justify-start gap-1.5"
      >
        {subjects.map((s) => (
          <ToggleGroupItem
            key={s.id}
            value={s.id}
            className="h-8 min-w-0 rounded-button border border-border-hairline bg-bg-block px-3 text-helper font-normal text-type-secondary hover:bg-accent-positive/5 hover:text-type-primary data-[state=on]:border-type-primary data-[state=on]:bg-accent-positive/10 data-[state=on]:font-medium data-[state=on]:text-type-primary"
          >
            {s.name}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <header className="flex items-center justify-between">
        <p className="text-helper text-type-secondary">
          {subjectItems.length}개 단원
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => startNew(undefined)}
          className="gap-1.5 rounded-button border-type-primary bg-bg-block text-helper font-medium text-type-primary hover:bg-accent-positive/10 hover:text-type-primary"
        >
          <Plus className="h-3.5 w-3.5" />
          최상위 단원 추가
        </Button>
      </header>

      {editing && (
        <Card className="rounded-block border-type-primary bg-bg-block p-4 shadow-none">
          <h2 className="text-label font-bold text-type-primary">
            {editing.item ? "단원 수정" : "단원 추가"}
            {editing.parentId && (
              <span className="ml-2 text-helper text-type-secondary">
                (하위 단원)
              </span>
            )}
          </h2>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 1단원, 1차시, 어법"
            autoFocus
            autoComplete="off"
            className="mt-3 rounded-button border-border-hairline bg-bg-block text-body text-type-primary"
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={cancel}
              className="rounded-button border-border-hairline bg-bg-block text-helper text-type-secondary hover:text-type-primary"
            >
              취소
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={commit}
              disabled={!name.trim()}
              className="rounded-button border-type-primary bg-bg-block text-helper font-medium text-type-primary hover:bg-accent-positive/10 hover:text-type-primary"
            >
              저장
            </Button>
          </div>
        </Card>
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
          onDelete={askRemove}
        />
      )}

      <ConfirmDeleteDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title={`${confirmDelete?.label ?? ""} 단원을 삭제할까요?`}
        description="하위 단원·카드도 함께 삭제됩니다. 되돌릴 수 없어요."
        onConfirm={performRemove}
      />
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
  onDelete: (id: string, label: string) => void;
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
            <Card className="flex items-center gap-2 rounded-block border-border-hairline bg-bg-block px-3 py-2 shadow-none">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onToggle(node.id)}
                aria-label={isOpen ? "접기" : "펼치기"}
                disabled={!hasChildren}
                className={cn(
                  "h-6 w-6 rounded-button text-type-secondary",
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
              </Button>
              <span className="flex-1 text-label text-type-primary">
                {node.name}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onAddChild(node.id)}
                aria-label="하위 단원 추가"
                className="h-7 w-7 rounded-button text-type-secondary hover:bg-pullim-slate-100 hover:text-type-primary"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onEdit(node)}
                aria-label="수정"
                className="h-7 w-7 rounded-button text-type-secondary hover:bg-pullim-slate-100 hover:text-type-primary"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onDelete(node.id, node.name)}
                aria-label="삭제"
                className="h-7 w-7 rounded-button text-type-secondary hover:bg-accent-negative/10 hover:text-accent-negative"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </Card>
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
