"use client";

import { useMemo, useState, useTransition } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { saveWeekRankings } from "@/lib/actions";

type Team = { id: string; name: string; shortName: string; color: string };

function CommentBubbleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M2 3.5C2 2.67 2.67 2 3.5 2h9c.83 0 1.5.67 1.5 1.5v6c0 .83-.67 1.5-1.5 1.5H7.8L4.5 13.7c-.3.3-.8.1-.8-.3V11h-.2C2.67 11 2 10.33 2 9.5v-6Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Row({
  team,
  rank,
  isFirst,
  isLast,
  onMove,
  comment,
  isCommentOpen,
  onToggleComment,
  onCommentChange,
}: {
  team: Team;
  rank: number;
  isFirst: boolean;
  isLast: boolean;
  onMove: (id: string, direction: -1 | 1) => void;
  comment: string;
  isCommentOpen: boolean;
  onToggleComment: (id: string) => void;
  onCommentChange: (id: string, value: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: team.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-xl border border-border-hairline bg-bg-surface px-3 py-2.5 ${
        isDragging ? "z-10 shadow-2xl shadow-black/40" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="w-6 shrink-0 text-center text-sm font-semibold tabular-nums text-text-muted">
          {rank}
        </span>
        <span
          className="h-8 w-8 shrink-0 rounded-full text-center text-xs font-semibold leading-8 text-white"
          style={{ backgroundColor: team.color }}
        >
          {team.shortName.slice(0, 2)}
        </span>
        <span className="flex-1 truncate text-sm font-medium text-text-primary">{team.name}</span>

        <div className="flex shrink-0 flex-col">
          <button
            type="button"
            onClick={() => onMove(team.id, -1)}
            disabled={isFirst}
            aria-label={`Move ${team.name} up`}
            className="rounded p-0.5 text-text-muted hover:bg-bg-surface-hover hover:text-text-secondary disabled:opacity-25"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 3 L10 8 L2 8 Z" fill="currentColor" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onMove(team.id, 1)}
            disabled={isLast}
            aria-label={`Move ${team.name} down`}
            className="rounded p-0.5 text-text-muted hover:bg-bg-surface-hover hover:text-text-secondary disabled:opacity-25"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 9 L10 4 L2 4 Z" fill="currentColor" />
            </svg>
          </button>
        </div>

        <button
          type="button"
          onClick={() => onToggleComment(team.id)}
          aria-label={comment ? `Edit comment for ${team.name}` : `Add comment for ${team.name}`}
          aria-expanded={isCommentOpen}
          className={`relative shrink-0 rounded-md p-1.5 hover:bg-bg-surface-hover ${
            isCommentOpen || comment
              ? "text-accent-strong"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          <CommentBubbleIcon />
          {comment && (
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-accent-strong" />
          )}
        </button>

        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Drag ${team.name}`}
          className="cursor-grab touch-none rounded-md p-1.5 text-text-muted hover:bg-bg-surface-hover hover:text-text-secondary active:cursor-grabbing"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="5" cy="3" r="1.3" fill="currentColor" />
            <circle cx="11" cy="3" r="1.3" fill="currentColor" />
            <circle cx="5" cy="8" r="1.3" fill="currentColor" />
            <circle cx="11" cy="8" r="1.3" fill="currentColor" />
            <circle cx="5" cy="13" r="1.3" fill="currentColor" />
            <circle cx="11" cy="13" r="1.3" fill="currentColor" />
          </svg>
        </button>
      </div>

      {isCommentOpen && (
        <div className="mt-2 pl-9">
          <textarea
            value={comment}
            onChange={(e) => onCommentChange(team.id, e.target.value)}
            placeholder={`Why ${team.name} at #${rank}? (optional)`}
            rows={2}
            className="w-full resize-none rounded-lg border border-border-hairline bg-bg-page px-2.5 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
        </div>
      )}
    </li>
  );
}

export function RankingBoard({
  weekId,
  teams,
  initialOrder,
  initialComments = {},
}: {
  weekId: string;
  teams: Team[];
  initialOrder: string[];
  initialComments?: Record<string, string>;
}) {
  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const [order, setOrder] = useState(initialOrder);
  const [comments, setComments] = useState<Record<string, string>>(initialComments);
  const [openCommentId, setOpenCommentId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const oldIndex = prev.indexOf(String(active.id));
      const newIndex = prev.indexOf(String(over.id));
      return arrayMove(prev, oldIndex, newIndex);
    });
    setSaved(false);
  }

  function move(id: string, direction: -1 | 1) {
    setOrder((prev) => {
      const index = prev.indexOf(id);
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      return arrayMove(prev, index, target);
    });
    setSaved(false);
  }

  function toggleComment(id: string) {
    setOpenCommentId((prev) => (prev === id ? null : id));
  }

  function changeComment(id: string, value: string) {
    setComments((prev) => ({ ...prev, [id]: value }));
    setSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      await saveWeekRankings(weekId, order, comments);
      setSaved(true);
    });
  }

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {order.map((id, index) => {
              const team = teamById.get(id);
              if (!team) return null;
              return (
                <Row
                  key={id}
                  team={team}
                  rank={index + 1}
                  isFirst={index === 0}
                  isLast={index === order.length - 1}
                  onMove={move}
                  comment={comments[id] ?? ""}
                  isCommentOpen={openCommentId === id}
                  onToggleComment={toggleComment}
                  onCommentChange={changeComment}
                />
              );
            })}
          </ul>
        </SortableContext>
      </DndContext>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:bg-accent-strong disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save rankings"}
        </button>
        {saved && !isPending && (
          <span className="text-sm text-status-good">Saved ✓</span>
        )}
      </div>
    </div>
  );
}
