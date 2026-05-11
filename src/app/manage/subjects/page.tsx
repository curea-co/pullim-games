"use client";

// /manage/subjects — 과목 CRUD.

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import {
  deleteSubject,
  loadSubjects,
  newId,
  saveSubject,
  type CustomSubject,
} from "@/lib/core";
import { cn } from "@/lib/utils";

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<CustomSubject[]>([]);
  const [editing, setEditing] = useState<CustomSubject | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    setSubjects(loadSubjects());
  }, []);

  function refresh() {
    setSubjects(loadSubjects());
  }

  function startNew() {
    setEditing({
      id: newId(),
      name: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setName("");
  }

  function startEdit(s: CustomSubject) {
    setEditing(s);
    setName(s.name);
  }

  function cancel() {
    setEditing(null);
    setName("");
  }

  function commit() {
    if (!editing) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    saveSubject({
      ...editing,
      name: trimmed,
      updatedAt: new Date().toISOString(),
    });
    refresh();
    cancel();
  }

  function remove(id: string) {
    if (
      !window.confirm(
        "이 과목을 삭제하면 단원·카드도 모두 함께 삭제돼요. 진행할까요?",
      )
    )
      return;
    deleteSubject(id);
    refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <p className="text-helper text-type-secondary">
          내 과목 {subjects.length}개
        </p>
        <button
          type="button"
          onClick={startNew}
          className="inline-flex items-center gap-1.5 rounded-button border border-type-primary bg-bg-block px-3 py-2 text-helper font-medium text-type-primary hover:bg-accent-positive/10"
        >
          <Plus className="h-3.5 w-3.5" />
          과목 추가
        </button>
      </header>

      {/* 편집 form */}
      {editing && (
        <section
          aria-label="과목 편집"
          className="rounded-block border border-type-primary bg-bg-block p-4"
        >
          <h2 className="text-label font-bold text-type-primary">
            {subjects.some((s) => s.id === editing.id) ? "과목 수정" : "과목 추가"}
          </h2>
          <div className="mt-3 flex flex-col gap-2">
            <label className="text-helper text-type-secondary">이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 수능 수학, 내 영어 단어장"
              autoFocus
              autoComplete="off"
              className="rounded-button border border-border-hairline bg-bg-block px-3 py-2 text-body text-type-primary placeholder:text-type-secondary/60 focus:border-type-primary focus:outline-none"
            />
          </div>
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

      {/* 리스트 */}
      {subjects.length === 0 ? (
        <p className="rounded-block border border-dashed border-border-hairline bg-bg-block p-5 text-center text-helper text-type-secondary">
          아직 만든 과목이 없어요. "과목 추가" 로 첫 과목을 만들어 보세요.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {subjects.map((s) => (
            <li
              key={s.id}
              className={cn(
                "flex items-center justify-between rounded-block border bg-bg-block px-4 py-3",
                editing?.id === s.id
                  ? "border-type-primary"
                  : "border-border-hairline",
              )}
            >
              <div>
                <p className="text-label font-bold text-type-primary">{s.name}</p>
                <p className="text-helper text-type-secondary">
                  {new Date(s.updatedAt).toLocaleDateString("ko-KR")}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(s)}
                  aria-label="수정"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-button text-type-secondary hover:bg-pullim-slate-100 hover:text-type-primary"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(s.id)}
                  aria-label="삭제"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-button text-type-secondary hover:bg-accent-negative/10 hover:text-accent-negative"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// X 아이콘 unused 회피 — close 버튼에 쓸 수 있어 import 유지하지만 현재 미사용
void X;
