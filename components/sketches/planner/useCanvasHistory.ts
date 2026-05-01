"use client";

import { useCallback, useState } from "react";

type HistoryState<T> = {
  past: T[];
  present: T;
};

export function useCanvasHistory<T>(initial: T) {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initial
  });

  const update = useCallback((next: T | ((prev: T) => T)) => {
    setState((prev) => {
      const resolved = typeof next === "function" ? (next as (x: T) => T)(prev.present) : next;
      return {
        past: [...prev.past, prev.present],
        present: resolved
      };
    });
  }, []);

  const undo = useCallback(() => {
    setState((prev) => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      return {
        past: prev.past.slice(0, -1),
        present: previous
      };
    });
  }, []);

  const reset = useCallback((value: T) => {
    setState({
      past: [],
      present: value
    });
  }, []);

  return {
    present: state.present,
    update,
    undo,
    reset,
    canUndo: state.past.length > 0
  };
}

