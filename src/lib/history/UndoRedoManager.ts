import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OrderItem } from '@/types';

export interface HistoryState {
  past: OrderItem[][];
  present: OrderItem[];
  future: OrderItem[][];
  maxHistorySize: number;
}

export interface HistoryActions {
  pushState: (items: OrderItem[]) => void;
  undo: () => OrderItem[] | null;
  redo: () => OrderItem[] | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
  setPresent: (items: OrderItem[]) => void;
}

export type HistoryStore = HistoryState & HistoryActions;

const initialState: HistoryState = {
  past: [],
  present: [],
  future: [],
  maxHistorySize: 50,
};

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      pushState: (items: OrderItem[]) => {
        const { past, present, maxHistorySize } = get();

        // Don't push if identical to current state
        if (JSON.stringify(items) === JSON.stringify(present)) {
          return;
        }

        const newPast = [...past, present].slice(-maxHistorySize);

        set({
          past: newPast,
          present: items,
          future: [], // Clear future on new action
        });
      },

      undo: () => {
        const { past, present, future } = get();

        if (past.length === 0) return null;

        const previous = past[past.length - 1];
        const newPast = past.slice(0, -1);
        const newFuture = [present, ...future];

        set({
          past: newPast,
          present: previous,
          future: newFuture,
        });

        return previous;
      },

      redo: () => {
        const { past, present, future } = get();

        if (future.length === 0) return null;

        const next = future[0];
        const newFuture = future.slice(1);
        const newPast = [...past, present];

        set({
          past: newPast,
          present: next,
          future: newFuture,
        });

        return next;
      },

      canUndo: () => get().past.length > 0,

      canRedo: () => get().future.length > 0,

      clear: () => {
        set({
          past: [],
          present: get().present,
          future: [],
        });
      },

      setPresent: (items: OrderItem[]) => {
        set({ present: items });
      },
    }),
    {
      name: 'lab-history',
      partialize: (state) => ({
        past: state.past,
        present: state.present,
        future: state.future,
      }),
    }
  )
);

/**
 * Hook for using undo/redo in components
 */
export function useUndoRedo(initialItems: OrderItem[] = []) {
  const {
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
    clear,
    present,
    setPresent,
  } = useHistoryStore();

  // Initialize with provided items if store is empty
  if (present.length === 0 && initialItems.length > 0) {
    setPresent(initialItems);
  }

  const handleUndo = () => {
    const items = undo();
    return items;
  };

  const handleRedo = () => {
    const items = redo();
    return items;
  };

  const commitState = (items: OrderItem[]) => {
    pushState(items);
  };

  return {
    items: present,
    canUndo: canUndo(),
    canRedo: canRedo(),
    undo: handleUndo,
    redo: handleRedo,
    commitState,
    clear,
  };
}
