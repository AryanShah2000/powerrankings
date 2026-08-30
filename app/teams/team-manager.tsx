"use client";

import { useState, useTransition } from "react";
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
import { archiveTeam, renameTeam, reorderTeams } from "@/lib/actions";

type Team = { id: string; name: string; shortName: string; color: string };

function EditableRow({ team }: { team: Team }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: team.id,
  });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.name);
  const [shortName, setShortName] = useState(team.shortName);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await renameTeam(team.id, name, shortName);
      setEditing(false);
    });
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-xl border border-border-hairline bg-bg-surface px-3 py-2.5 ${
        isDragging ? "z-10 shadow-2xl shadow-black/40" : ""
      }`}
    >
      <span
        className="h-8 w-8 shrink-0 rounded-full text-center text-xs font-semibold leading-8 text-white"
        style={{ backgroundColor: team.color }}
      >
        {team.shortName.slice(0, 2)}
      </span>

      {editing ? (
        <div className="flex flex-1 items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-border-hairline bg-bg-surface-2 px-2 py-1 text-sm outline-none focus:border-accent"
          />
          <input
            value={shortName}
            onChange={(e) => setShortName(e.target.value.toUpperCase().slice(0, 4))}
            className="w-16 rounded-md border border-border-hairline bg-bg-surface-2 px-2 py-1 text-sm uppercase outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-white hover:bg-accent-strong disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setName(team.name);
              setShortName(team.shortName);
            }}
            className="rounded-md px-2 py-1 text-xs text-text-muted hover:text-text-secondary"
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          <span className="flex-1 truncate text-sm font-medium text-text-primary">{team.name}</span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md px-2 py-1 text-xs text-text-secondary hover:bg-bg-surface-hover"
          >
            Rename
          </button>
          <form
            action={async () => {
              await archiveTeam(team.id);
            }}
          >
            <button
              type="submit"
              className="rounded-md px-2 py-1 text-xs text-status-critical hover:bg-status-critical/10"
            >
              Archive
            </button>
          </form>
        </>
      )}

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
    </li>
  );
}

export function TeamManager({ teams }: { teams: Team[] }) {
  const [order, setOrder] = useState(teams.map((t) => t.id));
  const teamById = new Map(teams.map((t) => [t.id, t]));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const next = arrayMove(
      order,
      order.indexOf(String(active.id)),
      order.indexOf(String(over.id))
    );
    setOrder(next);
    reorderTeams(next);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2">
          {order.map((id) => {
            const team = teamById.get(id);
            if (!team) return null;
            return <EditableRow key={id} team={team} />;
          })}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
