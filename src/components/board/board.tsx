"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { generateKeyBetween } from "fractional-indexing";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { BoardColumn } from "@/components/board/board-column";
import { TaskCard } from "@/components/board/task-card";
import { useTaskNavigation } from "@/components/task/use-task-navigation";
import { moveTaskAction } from "@/lib/actions/tasks";
import { createSectionAction } from "@/lib/actions/sections";
import type { BoardSection, BoardTask } from "@/lib/board-data";

interface BoardProps {
  projectId: string;
  initialSections: BoardSection[];
}

/**
 * Optimistic Kanban board.
 *
 * The component owns a local mirror of `sections`. DnD updates it
 * synchronously (sub-frame latency), then `moveTaskAction` is fired in the
 * background. On error we revert to the pre-move snapshot.
 */
export function Board({ projectId, initialSections }: BoardProps) {
  const [sections, setSections] = useState<BoardSection[]>(initialSections);
  const { openTask } = useTaskNavigation();

  // Reset local state when the server-provided sections change identity
  // (e.g. after creating a new task on the server and revalidating).
  useEffect(() => {
    setSections(initialSections);
  }, [initialSections]);

  const onDragEnd = useCallback(
    async (result: DropResult) => {
      const { destination, source, draggableId } = result;
      if (!destination) return;
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      ) {
        return;
      }

      const snapshot = sections;

      // Build the new state.
      const next = sections.map((s) => ({ ...s, tasks: s.tasks.slice() }));
      const from = next.find((s) => s.id === source.droppableId);
      const to = next.find((s) => s.id === destination.droppableId);
      if (!from || !to) return;

      const taskIdx = from.tasks.findIndex((t) => t.id === draggableId);
      if (taskIdx === -1) return;
      const [moved] = from.tasks.splice(taskIdx, 1);
      if (!moved) return;

      const insertAt = destination.index;
      const prev = to.tasks[insertAt - 1]?.position ?? null;
      const after = to.tasks[insertAt]?.position ?? null;

      let position: string;
      try {
        position = generateKeyBetween(prev, after);
      } catch {
        // Extremely unlikely (duplicate neighbours) — bail out cleanly.
        setSections(snapshot);
        return;
      }

      const newTask: BoardTask = { ...moved, sectionId: to.id, position };
      to.tasks.splice(insertAt, 0, newTask);

      setSections(next);

      const res = await moveTaskAction({
        taskId: moved.id,
        projectId,
        toSectionId: to.id,
        position,
      });
      if (res.error) {
        // Revert; in a fuller UI we'd raise a toast here.
        setSections(snapshot);
        console.error("moveTask failed", res.error);
      }
    },
    [sections, projectId]
  );

  const handleAddSection = useCallback(async () => {
    const name = window.prompt("New section name?", "New section");
    if (!name) return;
    await createSectionAction({ projectId, name });
  }, [projectId]);

  const totalTasks = useMemo(
    () => sections.reduce((acc, s) => acc + s.tasks.length, 0),
    [sections]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-8 py-2 text-xs text-muted-foreground">
        <span>
          {sections.length} {sections.length === 1 ? "section" : "sections"}
          {" · "}
          {totalTasks} {totalTasks === 1 ? "task" : "tasks"}
        </span>
        <button
          onClick={handleAddSection}
          className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-accent hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
          Add section
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto p-6">
          {sections.map((section) => (
            <BoardColumn
              key={section.id}
              section={section}
              projectId={projectId}
              onTasksMutated={() => {
                // Local state already in sync via optimistic insert in the
                // column's create form. No-op here — kept as an extension
                // point.
              }}
            >
              <Droppable droppableId={section.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex min-h-[40px] flex-col gap-2 rounded-md p-1 transition-colors",
                      snapshot.isDraggingOver && "bg-accent/40"
                    )}
                  >
                    {section.tasks.map((task, idx) => (
                      <Draggable
                        key={task.id}
                        draggableId={task.id}
                        index={idx}
                      >
                        {(p, s) => (
                          <div
                            ref={p.innerRef}
                            {...p.draggableProps}
                            {...p.dragHandleProps}
                            className={cn(s.isDragging && "rotate-[1deg]")}
                          >
                            <TaskCard
                              task={task}
                              onClick={() => openTask(task.id)}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </BoardColumn>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
