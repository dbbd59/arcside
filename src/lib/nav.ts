import type { KeyboardEvent } from "react";

export const NAV = { "data-nav": "" } as const;

const rowsIn = (container: ParentNode) => [...container.querySelectorAll<HTMLElement>("[data-nav]")].filter(row => !row.closest("[inert]"));

export function focusNextRow(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  const current = (event.target as HTMLElement).closest<HTMLElement>("[data-nav]");
  if (!current) return;
  const rows = rowsIn(event.currentTarget);
  const next = rows[rows.indexOf(current) + (event.key === "ArrowDown" ? 1 : -1)];
  if (next) { event.preventDefault(); next.focus(); }
}

export const focusFirstRow = (container: ParentNode) => rowsIn(container)[0]?.focus();
