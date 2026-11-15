import { backupFilename, buildBackup, isBackupDue } from "./lib/backup";
import { preferencesStore } from "./lib/models";

export const BACKUP_ALARM = "daily-backup";
export const BACKUP_CHECK_MINUTES = 60;

export async function backupNow() {
  const preferences = await preferencesStore.read();
  const now = Date.now();
  const json = JSON.stringify(buildBackup(preferences, { now }), null, 2);
  await chrome.downloads.download({
    url: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
    filename: backupFilename(new Date(now)),
    conflictAction: "overwrite",
    saveAs: false
  });
  await preferencesStore.update(current => ({ ...current, lastBackupAt: now }));
}

export async function backupIfDue() {
  if (isBackupDue(await preferencesStore.read(), Date.now())) await backupNow();
}

export async function showLatestBackup() {
  const [latest] = await chrome.downloads.search({ filenameRegex: "Arcside backups[\\\\/]arcside-backup-", orderBy: ["-startTime"], limit: 1 });
  if (!latest) throw new Error("No automatic backup found in Downloads yet.");
  chrome.downloads.show(latest.id);
}
