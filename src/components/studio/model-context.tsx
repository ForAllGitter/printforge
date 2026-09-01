import { createContext, useContext, type ReactNode } from "react";
import { useBuiltModel } from "@/lib/print/build";

type Built = ReturnType<typeof useBuiltModel>;

const ModelContext = createContext<Built | null>(null);

export function ModelProvider({ children }: { children: ReactNode }) {
  const built = useBuiltModel();
  return <ModelContext.Provider value={built}>{children}</ModelContext.Provider>;
}

export function useModel() {
  const ctx = useContext(ModelContext);
  if (!ctx) throw new Error("useModel must be used under ModelProvider");
  return ctx;
}
