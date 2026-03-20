import React, { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import { Stopwatch, DEFAULT_STOPWATCH_COLOR } from '../types/stopwatch';
import { loadStopwatches, saveStopwatches } from '../utils/stopwatch-storage';

// ─── State & Actions ──────────────────────────────────────────────────────────

interface State {
  stopwatches: Stopwatch[];
  isLoaded: boolean;
}

type Action =
  | { type: 'LOAD'; payload: Stopwatch[] }
  | { type: 'ADD'; name: string; color: string; category?: string }
  | { type: 'START'; id: string }
  | { type: 'PAUSE'; id: string }
  | { type: 'RESET'; id: string }
  | { type: 'DELETE'; id: string }
  | { type: 'RENAME'; id: string; name: string; color: string; category?: string }
  | { type: 'MOVE_UP'; id: string }
  | { type: 'MOVE_DOWN'; id: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD':
      return { stopwatches: action.payload, isLoaded: true };

    case 'ADD': {
      const newItem: Stopwatch = {
        id: Math.random().toString(36).slice(2),
        name: action.name,
        accumulatedMs: 0,
        startedAt: null,
        isRunning: false,
        order: state.stopwatches.length,
        createdAt: Date.now(),
        color: action.color,
        category: action.category,
      };
      return { ...state, stopwatches: [...state.stopwatches, newItem] };
    }

    case 'START': {
      const stopwatches = state.stopwatches.map(sw =>
        sw.id === action.id
          ? { ...sw, isRunning: true, startedAt: Date.now() }
          : sw
      );
      return { ...state, stopwatches };
    }

    case 'PAUSE': {
      const stopwatches = state.stopwatches.map(sw => {
        if (sw.id !== action.id) return sw;
        const elapsed = sw.startedAt !== null ? Date.now() - sw.startedAt : 0;
        return { ...sw, isRunning: false, accumulatedMs: sw.accumulatedMs + elapsed, startedAt: null };
      });
      return { ...state, stopwatches };
    }

    case 'RESET': {
      const stopwatches = state.stopwatches.map(sw =>
        sw.id === action.id
          ? { ...sw, isRunning: false, accumulatedMs: 0, startedAt: null }
          : sw
      );
      return { ...state, stopwatches };
    }

    case 'DELETE': {
      const filtered = state.stopwatches.filter(sw => sw.id !== action.id);
      const stopwatches = filtered.map((sw, i) => ({ ...sw, order: i }));
      return { ...state, stopwatches };
    }

    case 'RENAME': {
      const stopwatches = state.stopwatches.map(sw =>
        sw.id === action.id
          ? { ...sw, name: action.name, color: action.color, category: action.category }
          : sw
      );
      return { ...state, stopwatches };
    }

    case 'MOVE_UP': {
      const sorted = [...state.stopwatches].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex(sw => sw.id === action.id);
      if (idx <= 0) return state;
      const stopwatches = sorted.map(sw => {
        if (sw.id === sorted[idx].id) return { ...sw, order: sorted[idx - 1].order };
        if (sw.id === sorted[idx - 1].id) return { ...sw, order: sorted[idx].order };
        return sw;
      });
      return { ...state, stopwatches };
    }

    case 'MOVE_DOWN': {
      const sorted = [...state.stopwatches].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex(sw => sw.id === action.id);
      if (idx < 0 || idx >= sorted.length - 1) return state;
      const stopwatches = sorted.map(sw => {
        if (sw.id === sorted[idx].id) return { ...sw, order: sorted[idx + 1].order };
        if (sw.id === sorted[idx + 1].id) return { ...sw, order: sorted[idx].order };
        return sw;
      });
      return { ...state, stopwatches };
    }

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface StopwatchContextValue {
  stopwatches: Stopwatch[];
  isLoaded: boolean;
  addStopwatch: (name: string, color: string, category?: string) => void;
  startStopwatch: (id: string) => void;
  pauseStopwatch: (id: string) => void;
  resetStopwatch: (id: string) => void;
  deleteStopwatch: (id: string) => void;
  renameStopwatch: (id: string, name: string, color: string, category?: string) => void;
  moveUp: (id: string) => void;
  moveDown: (id: string) => void;
}

const StopwatchContext = createContext<StopwatchContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function StopwatchProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { stopwatches: [], isLoaded: false });

  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    console.log('[StopwatchContext] Loading stopwatches from storage');
    loadStopwatches().then(items => {
      console.log(`[StopwatchContext] Loaded ${items.length} stopwatch(es)`);
      dispatch({ type: 'LOAD', payload: items });
    });
  }, []);

  function dispatchAndSave(action: Action) {
    const nextState = reducer(stateRef.current, action);
    dispatch(action);
    saveStopwatches(nextState.stopwatches);
  }

  const sorted = [...state.stopwatches].sort((a, b) => a.order - b.order);

  const value: StopwatchContextValue = {
    stopwatches: sorted,
    isLoaded: state.isLoaded,
    addStopwatch: (name, color, category) => {
      console.log(`[StopwatchContext] ADD name="${name}" color="${color}" category="${category}"`);
      dispatchAndSave({ type: 'ADD', name, color, category });
    },
    startStopwatch: (id) => {
      console.log(`[StopwatchContext] START id=${id}`);
      dispatchAndSave({ type: 'START', id });
    },
    pauseStopwatch: (id) => {
      console.log(`[StopwatchContext] PAUSE id=${id}`);
      dispatchAndSave({ type: 'PAUSE', id });
    },
    resetStopwatch: (id) => {
      console.log(`[StopwatchContext] RESET id=${id}`);
      dispatchAndSave({ type: 'RESET', id });
    },
    deleteStopwatch: (id) => {
      console.log(`[StopwatchContext] DELETE id=${id}`);
      dispatchAndSave({ type: 'DELETE', id });
    },
    renameStopwatch: (id, name, color, category) => {
      console.log(`[StopwatchContext] RENAME id=${id} name="${name}" color="${color}" category="${category}"`);
      dispatchAndSave({ type: 'RENAME', id, name, color, category });
    },
    moveUp: (id) => {
      console.log(`[StopwatchContext] MOVE_UP id=${id}`);
      dispatchAndSave({ type: 'MOVE_UP', id });
    },
    moveDown: (id) => {
      console.log(`[StopwatchContext] MOVE_DOWN id=${id}`);
      dispatchAndSave({ type: 'MOVE_DOWN', id });
    },
  };

  return (
    <StopwatchContext.Provider value={value}>
      {children}
    </StopwatchContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStopwatch(): StopwatchContextValue {
  const ctx = useContext(StopwatchContext);
  if (!ctx) throw new Error('useStopwatch must be used within StopwatchProvider');
  return ctx;
}
