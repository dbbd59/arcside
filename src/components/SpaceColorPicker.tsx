import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { HexColorInput, HexColorPicker } from "react-colorful";
import { cn } from "@/lib/utils";
import { SPACE_COLORS, SPACE_GRADIENTS, spaceFill } from "@/lib/palette";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export interface SpaceColors { color: string; color2?: string }

interface Props {
  value: SpaceColors;
  onChange: (value: SpaceColors) => void;
}

const SAME = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export function SpaceColorPicker({ value, onChange }: Props) {
  const [stop, setStop] = useState<"color" | "color2">("color");
  const gradient = value.color2 !== undefined;
  const editing = gradient ? stop : "color";
  const current = (editing === "color2" ? value.color2 : value.color) ?? value.color;
  const set = (hex: string) => onChange({ ...value, [editing]: hex.toLowerCase() });

  const chooseMode = (mode: string) => {
    if (mode === "solid") { setStop("color"); onChange({ color: value.color }); }
    if (mode === "gradient" && !gradient) {
      onChange({ color: value.color, color2: SPACE_GRADIENTS.find(item => SAME(item.from, value.color))?.to ?? "#7c4dff" });
    }
  };

  return <div className="flex flex-col gap-2.5">
    <ToggleGroup type="single" variant="outline" size="sm" value={gradient ? "gradient" : "solid"} aria-label="Color type"
      onValueChange={chooseMode}>
      <ToggleGroupItem value="solid">Solid</ToggleGroupItem>
      <ToggleGroupItem value="gradient">Gradient</ToggleGroupItem>
    </ToggleGroup>

    {gradient
      ? <>
        <div className="h-10 rounded-lg ring-1 ring-white/15" style={{ background: spaceFill(value.color, value.color2) }} aria-hidden />
        <div className="flex flex-wrap gap-1.5">{SPACE_GRADIENTS.map(preset => <button type="button" key={preset.name} title={preset.name} aria-label={`${preset.name} gradient`}
          className={cn("h-7 w-10 rounded-md border-2 border-popover outline outline-1 outline-transparent",
            SAME(preset.from, value.color) && SAME(preset.to, value.color2 ?? "") && "outline-white")}
          style={{ background: spaceFill(preset.from, preset.to) }} onClick={() => onChange({ color: preset.from, color2: preset.to })} />)}</div>
        <div className="flex items-center gap-1.5">
          {(["color", "color2"] as const).map(key => <Button key={key} type="button" size="sm" variant={editing === key ? "secondary" : "ghost"} onClick={() => setStop(key)}>
            <span className="size-3.5 rounded-full ring-1 ring-white/30" style={{ background: key === "color" ? value.color : value.color2 }} />{key === "color" ? "From" : "To"}
          </Button>)}
          <Button type="button" size="icon-sm" variant="ghost" aria-label="Swap colors" onClick={() => onChange({ color: value.color2!, color2: value.color })}><ArrowLeftRight size={14} /></Button>
        </div>
      </>
      : <div className="flex flex-wrap gap-1.5">{SPACE_COLORS.map(preset => <button type="button" key={preset}
        className={cn("size-[26px] rounded-full border-[3px] border-popover outline outline-1 outline-transparent", SAME(value.color, preset) && "outline-white")}
        style={{ background: preset }} aria-label={`Color ${preset}`} onClick={() => onChange({ color: preset })} />)}</div>}

    <HexColorPicker color={current} onChange={set} />
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>Hex</span>
      <HexColorInput color={current} onChange={set} prefixed aria-label="Hex color"
        className="h-8 w-24 rounded-md border border-input bg-transparent px-2 font-mono text-xs text-foreground uppercase" />
    </div>
  </div>;
}
