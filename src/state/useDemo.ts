import { useEffect, useReducer } from 'react';
import { loadSaved, save } from '../lib/storage';
import { demoReducer, initialState, isDemoState } from './demo';

export function useDemo() {
  const [state, dispatch] = useReducer(demoReducer, undefined, () => {
    const saved = loadSaved();
    return isDemoState(saved) ? saved : initialState;
  });
  useEffect(() => {
    save(state);
  }, [state]);
  return [state, dispatch] as const;
}
