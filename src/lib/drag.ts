import type { DragEvent } from "react";

const DRAG_KINDS = ["tab", "favorite", "bookmark", "saved", "space", "folder"] as const;
type DragKind = (typeof DRAG_KINDS)[number];
export interface Dragged { kind: DragKind; id: string }

const KIND_TYPE_PREFIX = "application/x-arcside-";

function startDrag(event: DragEvent, kind: DragKind, id: string) {
  event.dataTransfer.setData("text/plain", `${kind}:${id}`);
  event.dataTransfer.setData(`${KIND_TYPE_PREFIX}${kind}`, id);
  event.dataTransfer.effectAllowed = kind === "bookmark" ? "copy" : "move";
  event.currentTarget.setAttribute("data-dragging", "");
}

export function dragSource(kind: DragKind, id: string) {
  return {
    draggable: true,
    onDragStart: (event: DragEvent) => startDrag(event, kind, id),
    onDragEnd: (event: DragEvent) => event.currentTarget.removeAttribute("data-dragging")
  };
}

export function readDrag(event: DragEvent): Dragged | null {
  const raw = event.dataTransfer.getData("text/plain");
  const colon = raw.indexOf(":");
  const kind = raw.slice(0, colon);
  const known = DRAG_KINDS.find(item => item === kind);
  return known ? { kind: known, id: raw.slice(colon + 1) } : null;
}

export const isDraggingKind = (event: DragEvent, kind: DragKind) => event.dataTransfer.types.includes(`${KIND_TYPE_PREFIX}${kind}`);
