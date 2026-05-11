"use client";

// /manage/subjects — 과목 CRUD. shadcn 컴포넌트.

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  deleteSubject,
  loadSubjects,
  newId,
  saveSubject,
  type CustomSubject,
} from "@/lib/core";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={startNew}
          className="gap-1.5 rounded-button border-type-primary bg-bg-block text-helper font-medium text-type-primary hover:bg-accent-positive/10 hover:text-type-primary"
        >
          <Plus className="h-3.5 w-3.5" />
          과목 추가
        </Button>
      </header>

      {editing && (
        <Card
          aria-label="과목 편집"
          className="rounded-block border-type-primary bg-bg-block p-4 shadow-none"
        >
          <h2 className="text-label font-bold text-type-primary">
            {subjects.some((s) => s.id === editing.id)
              ? "과목 수정"
              : "과목 추가"}
          </h2>
          <div className="mt-3 flex flex-col gap-2">
            <Label
              htmlFor="subject-name"
              className="text-helper text-type-secondary"
            >
              이름
            </Label>
            <Input
              id="subject-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 수능 수학, 내 영어 단어장"
              autoFocus
              autoComplete="off"
              className="rounded-button border-border-hairline bg-bg-block text-body text-type-primary"
            />
          </div>
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

      {subjects.length === 0 ? (
        <p className="rounded-block border border-dashed border-border-hairline bg-bg-block p-5 text-center text-helper text-type-secondary">
          아직 만든 과목이 없어요. "과목 추가" 로 첫 과목을 만들어 보세요.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {subjects.map((s) => (
            <li key={s.id}>
              <Card
                className={cn(
                  "flex items-center justify-between rounded-block bg-bg-block px-4 py-3 shadow-none",
                  editing?.id === s.id
                    ? "border-type-primary"
                    : "border-border-hairline",
                )}
              >
                <div>
                  <p className="text-label font-bold text-type-primary">
                    {s.name}
                  </p>
                  <p className="text-helper text-type-secondary">
                    {new Date(s.updatedAt).toLocaleDateString("ko-KR")}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => startEdit(s)}
                    aria-label="수정"
                    className="h-8 w-8 rounded-button text-type-secondary hover:bg-pullim-slate-100 hover:text-type-primary"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(s.id)}
                    aria-label="삭제"
                    className="h-8 w-8 rounded-button text-type-secondary hover:bg-accent-negative/10 hover:text-accent-negative"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
