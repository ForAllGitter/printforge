import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DESIGNS, getDesign } from "./catalog";
import { defaultsOf, type Values } from "./types";

export type SavedDesign = {
  id: string;
  name: string;
  designId: string;
  values: Values;
  savedAt: number;
};

type StudioState = {
  designId: string;
  values: Values;
  filamentId: string;
  library: SavedDesign[];
  setDesign: (id: string) => void;
  setValue: (key: string, value: Values[string]) => void;
  apply: (designId: string, values: Values) => void;
  setFilament: (id: string) => void;
  saveCurrent: (name: string) => void;
  loadSaved: (id: string) => void;
  removeSaved: (id: string) => void;
};

const start = getDesign("cup-lid") ?? DESIGNS[0]!;

const memoryStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const useStudio = create<StudioState>()(
  persist(
    (set, get) => ({
      designId: start.id,
      values: defaultsOf(start),
      filamentId: "true-white",
      library: [],
      setDesign: (id) => {
        const design = getDesign(id);
        set({ designId: design.id, values: defaultsOf(design) });
      },
      setValue: (key, value) =>
        set({ values: { ...get().values, [key]: value } }),
      apply: (designId, values) => {
        const design = getDesign(designId);
        set({ designId: design.id, values: { ...defaultsOf(design), ...values } });
      },
      setFilament: (id) => set({ filamentId: id }),
      saveCurrent: (name) => {
        const { designId, values, library } = get();
        const entry: SavedDesign = {
          id: crypto.randomUUID(),
          name: name.trim() || getDesign(designId).name,
          designId,
          values: { ...values },
          savedAt: Date.now(),
        };
        set({ library: [entry, ...library].slice(0, 40) });
      },
      loadSaved: (id) => {
        const entry = get().library.find((s) => s.id === id);
        if (!entry) return;
        get().apply(entry.designId, entry.values);
      },
      removeSaved: (id) =>
        set({ library: get().library.filter((s) => s.id !== id) }),
    }),
    {
      name: "printforge-studio-v4",
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? memoryStorage : localStorage,
      ),
      partialize: (s) => ({
        designId: s.designId,
        values: s.values,
        filamentId: s.filamentId,
        library: s.library,
      }),
    },
  ),
);
