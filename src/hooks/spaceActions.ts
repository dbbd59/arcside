import { reorderBy, withoutSpace } from "@/lib/prefs-ops";
import { DEFAULT_SPACE_ID, preferencesStore, sessionStore, windowKey, sessionWithoutSpace, type Settings, type SpaceFields } from "@/lib/models";
import { isBlankTab } from "@/lib/tabs";
import type { ArcsideContext } from "./arcside-context";

const SELECT_LOCK = "arcside-select-space";

export function spaceActions(ctx: ArcsideContext) {
  const { windowId, boundSpace, assignTab, setActiveSpace } = ctx;

  const selectSpace = (spaceId: string) => navigator.locks.request(SELECT_LOCK, async () => {
    await setActiveSpace(spaceId);

    const session = await sessionStore.read();
    const tabs = await chrome.tabs.query({ windowId });
    const spaceOf = (tab: chrome.tabs.Tab) => boundSpace(tab.id!) ?? session.tabSpaces[tab.id!] ?? DEFAULT_SPACE_ID;
    const pool = tabs.filter(tab => spaceOf(tab) === spaceId);

    let target = pool.find(tab => tab.id === session.lastTabBySpace[windowKey(windowId, spaceId)]) ?? pool.find(tab => tab.active) ?? pool.at(-1);
    if (!target) {
      const blank = tabs.find(tab => isBlankTab(tab, chrome.runtime.getURL("newtab.html")));
      target = blank ?? await chrome.tabs.create({ active: true, windowId });
      await assignTab(target.id!, spaceId);
    }
    if (!target.active) await chrome.tabs.update(target.id!, { active: true });
  });

  return {
    selectSpace,

    async addSpace(fields: SpaceFields) {
      const space = { id: crypto.randomUUID(), ...fields };
      await preferencesStore.update(current => ({ ...current, spaces: [...current.spaces, space] }));
      await selectSpace(space.id);
    },

    editSpace: (id: string, fields: SpaceFields) =>
      preferencesStore.update(current => ({
        ...current, spaces: current.spaces.map(space => space.id === id ? { ...space, ...fields } : space)
      })),

    async removeSpace(id: string) {
      if (id === DEFAULT_SPACE_ID) return;
      await preferencesStore.update(current => withoutSpace(current, id));
      await sessionStore.update(current => sessionWithoutSpace(current, id));
    },

    reorderSpace: (sourceId: string, targetId: string) =>
      preferencesStore.update(current => ({ ...current, spaces: reorderBy(current.spaces, space => space.id, sourceId, targetId) })),

    setSettings: (patch: Partial<Settings>) => preferencesStore.update(current => ({ ...current, ...patch }))
  };
}
