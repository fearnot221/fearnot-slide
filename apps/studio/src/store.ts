import { createStore } from "zustand/vanilla";
import {
  history,
  commit,
  undo,
  redo,
  type History,
  type Command,
} from "@packet/editor-core";
import type { Presentation } from "@packet/document-model";
export type EditorStore = {
  history: History;
  selected: string[];
  dispatch: (command: Command) => void;
  undo: () => void;
  redo: () => void;
  select: (ids: string[]) => void;
};
export function createEditorStore(document: Presentation) {
  return createStore<EditorStore>()((set) => ({
    history: history(document),
    selected: [],
    dispatch: (command) =>
      set((s) => ({ history: commit(s.history, command) })),
    undo: () => set((s) => ({ history: undo(s.history) })),
    redo: () => set((s) => ({ history: redo(s.history) })),
    select: (selected) => set({ selected }),
  }));
}
