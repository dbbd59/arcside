import { useLayoutEffect, useRef, useState } from "react";
import { Plus, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { dragSource, readDrag } from "@/lib/drag";
import type { Space } from "@/lib/models";
import { IconButton } from "./IconButton";

interface Props {
  spaces: Space[];
  activeId: string;
  onChoose: (spaceId: string) => void;
  onNew: () => void;
  onEdit: () => void;
  onDropTab: (tabId: number, spaceId: string) => void;
  onReorder: (sourceId: string, targetId: string) => void;
}

export function SpaceBar({ spaces, activeId, onChoose, onNew, onEdit, onDropTab, onReorder }: Props) {
  const [over, setOver] = useState<string | null>(null);
  const [indicator, setIndicator] = useState<{ left: number; top: number; width: number } | null>(null);
  const buttons = useRef<Record<string, HTMLElement | null>>({});
  const container = useRef<HTMLDivElement>(null);
  const active = spaces.find(space => space.id === activeId);

  useLayoutEffect(() => {
    const button = buttons.current[activeId];
    let alive = true;
    const measure = () => { if (alive && button) setIndicator({ left: button.offsetLeft, top: button.offsetTop, width: button.offsetWidth }); };
    measure();
    const observer = new ResizeObserver(measure);
    if (container.current) observer.observe(container.current);
    if (button) observer.observe(button, { box: "border-box" });
    button?.addEventListener("transitionend", measure);
    void document.fonts.ready.then(measure);
    return () => { alive = false; observer.disconnect(); button?.removeEventListener("transitionend", measure); };
  }, [activeId, active?.name, spaces.length]);

  const drop = (event: React.DragEvent, spaceId: string) => {
    event.preventDefault();
    setOver(null);
    const dragged = readDrag(event);
    if (dragged?.kind === "tab") onDropTab(Number(dragged.id), spaceId);
    if (dragged?.kind === "space") onReorder(dragged.id, spaceId);
  };

  return <footer aria-label="Spaces" className="flex items-center gap-1 border-t border-ink/12 bg-black/15 px-1.5 py-2">
    <div ref={container} className="relative flex min-w-0 flex-1 flex-wrap items-center gap-1">
      {indicator && <span aria-hidden="true" className="pointer-events-none absolute h-8 rounded-[10px] bg-ink/25 transition-[left,top,width] duration-300 ease-spring"
        style={{ left: indicator.left, top: indicator.top, width: indicator.width }} />}
      {spaces.map(space => {
        const selected = space.id === activeId;
        return <IconButton key={space.id} label={space.name} size="icon" aria-current={selected || undefined}
          ref={element => { buttons.current[space.id] = element; }}
          {...dragSource("space", space.id)}
          className={cn("relative h-8 w-8 rounded-[10px] text-base text-ink/75 hover:bg-ink/15",
            selected && "w-auto gap-2 bg-transparent px-1.5 text-ink hover:bg-transparent", over === space.id && "ring-2 ring-ink/70")}
          onClick={() => onChoose(space.id)}
          onDragOver={event => { event.preventDefault(); setOver(space.id); }}
          onDragLeave={() => setOver(null)}
          onDrop={event => drop(event, space.id)}>
          {space.emoji}{selected && <span className="max-w-24 truncate text-xs font-medium">{space.name}</span>}</IconButton>;
      })}
      <IconButton label="New Space" onClick={onNew}><Plus size={16} /></IconButton>
    </div>
    {active && <IconButton label={`Edit ${active.name}`} onClick={onEdit}><Settings2 size={15} /></IconButton>}
  </footer>;
}
