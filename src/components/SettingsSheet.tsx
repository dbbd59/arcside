import { useRef } from "react";
import { Download, FolderOpen, Upload } from "lucide-react";
import { FONTS, isFontId } from "@/lib/fonts";
import { backupNow, showLatestBackup } from "@/backup-job";
import type { BackupScope } from "@/lib/backup";
import { AMBIENT_MODES, isAmbientMode, type Settings } from "@/lib/models";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SheetShell } from "./SheetShell";

const ARCHIVE_OPTIONS = [{ hours: "0", label: "Off" }, { hours: "12", label: "12h" }, { hours: "24", label: "24h" }, { hours: "168", label: "7d" }];

interface Props {
  settings: Settings & { lastBackupAt: number };
  spaceName: string;
  onChange: (patch: Partial<Settings>) => void;
  onExportBackup: (scope: BackupScope) => void;
  onImportBackup: (file: File) => void;
  onFailure: (error: unknown) => void;
  onClose: () => void;
}

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-2 border-b px-[18px] py-3.5">
    <div className="min-w-0">
      <div className="text-[13px] font-medium">{title}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
    {children}
  </div>;
}

export default function SettingsSheet({ settings, spaceName, onChange, onExportBackup, onImportBackup, onFailure, onClose }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  return <SheetShell title="Settings" description="Appearance, gestures and data" visibleDescription closeLabel="Close settings" onClose={onClose}>
      <div className="min-h-0 flex-1 overflow-auto [scrollbar-width:thin]">
        <Row title="Font" hint="Bundled with Arcside, works offline">
          <ToggleGroup type="single" variant="outline" size="sm" className="flex-wrap" value={settings.font} aria-label="Font"
            onValueChange={value => { if (isFontId(value)) onChange({ font: value }); }}>
            {FONTS.map(font => <ToggleGroupItem key={font.id} value={font.id} style={{ fontFamily: font.stack }}>{font.label}</ToggleGroupItem>)}
          </ToggleGroup>
        </Row>
        <Row title="Ambient color" hint="Tints the sidebar with the left edge of the page (captures the tab image locally)">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{settings.ambient ? "On" : "Off"}</span>
            <Switch checked={settings.ambient} aria-label="Ambient color" onCheckedChange={ambient => onChange({ ambient })} />
          </div>
          <ToggleGroup type="single" variant="outline" size="sm" value={settings.ambientMode} aria-label="Ambient style"
            disabled={!settings.ambient} onValueChange={value => { if (isAmbientMode(value)) onChange({ ambientMode: value }); }}>
            {AMBIENT_MODES.map(mode => <ToggleGroupItem key={mode} value={mode} className="capitalize">{mode}</ToggleGroupItem>)}
          </ToggleGroup>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Mix in the Space color</span>
            <Switch checked={settings.ambientSpaceColor} disabled={!settings.ambient} aria-label="Mix in the Space color"
              onCheckedChange={ambientSpaceColor => onChange({ ambientSpaceColor })} />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-16 text-xs text-muted-foreground">Intensity</span>
            <Slider min={0} max={100} step={5} value={[settings.ambientIntensity]} disabled={!settings.ambient}
              aria-label="Ambient intensity" onValueChange={([ambientIntensity]) => onChange({ ambientIntensity })} />
            <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{settings.ambientIntensity}%</span>
          </div>
        </Row>
        <Row title="Fetch missing favicons" hint="For saved links Chrome has no icon for, asks the site for /favicon.ico once and keeps it locally">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{settings.fetchFavicons ? "On" : "Off"}</span>
            <Switch checked={settings.fetchFavicons} aria-label="Fetch missing favicons" onCheckedChange={fetchFavicons => onChange({ fetchFavicons })} />
          </div>
        </Row>
        <Row title="Swipe between Spaces" hint="Distance to trigger the switch (lower is more sensitive)">
          <div className="flex items-center gap-3">
            <Slider min={40} max={200} step={10} value={[settings.swipeThreshold]} aria-label="Swipe distance"
              onValueChange={([swipeThreshold]) => onChange({ swipeThreshold })} />
            <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">{settings.swipeThreshold}px</span>
          </div>
        </Row>
        <Row title="Auto-archive tabs" hint="Closes unsaved tabs after this much inactivity (they stay in History)">
          <ToggleGroup type="single" variant="outline" size="sm" value={String(settings.archiveAfterHours)}
            aria-label="Archive after" onValueChange={value => { if (value) onChange({ archiveAfterHours: Number(value) }); }}>
            {ARCHIVE_OPTIONS.map(option => <ToggleGroupItem key={option.hours} value={option.hours}>{option.label}</ToggleGroupItem>)}
          </ToggleGroup>
        </Row>
        <Row title="Daily backup" hint="Saves a JSON copy to Downloads/Arcside backups (one file per weekday, overwritten weekly). Skipped while there is nothing saved.">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{!settings.dailyBackup ? "Off" : settings.lastBackupAt ? `Last: ${new Date(settings.lastBackupAt).toLocaleString()}` : "No backup yet"}</span>
            <Switch checked={settings.dailyBackup} aria-label="Daily backup" onCheckedChange={dailyBackup => onChange({ dailyBackup })} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => backupNow().catch(onFailure)}>Back up now</Button>
            <Button size="sm" variant="ghost" disabled={!settings.lastBackupAt} onClick={() => showLatestBackup().catch(onFailure)}><FolderOpen size={14} /> Show in folder</Button>
          </div>
        </Row>
        <Row title="Backup" hint="Export everything or just the current Space. Import merges into what you have or replaces it, after a preview.">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => onExportBackup("all")}><Download size={14} /> Export all</Button>
            <Button size="sm" variant="secondary" onClick={() => onExportBackup("space")}><Download size={14} /> Export {spaceName}</Button>
            <Button size="sm" variant="secondary" onClick={() => fileInput.current?.click()}><Upload size={14} /> Import…</Button>
            <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={event => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) onImportBackup(file);
            }} />
          </div>
        </Row>
      </div>
  </SheetShell>;
}
