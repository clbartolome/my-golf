import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppStore {
  activeRoundId: string | null;
  setActiveRoundId: (id: string | null) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      activeRoundId: null,
      setActiveRoundId: (id) => set({ activeRoundId: id }),
    }),
    { name: "mygolf-capture" },
  ),
);
