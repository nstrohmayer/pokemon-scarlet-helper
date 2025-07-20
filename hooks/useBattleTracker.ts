
import { useState, useEffect, useCallback } from 'react';
import { COMPLETED_BATTLES_STORAGE_KEY } from '../constants';

export const useBattleTracker = () => {
  const [completedBattles, setCompletedBattles] = useState<Set<string>>(() => {
    try {
      const storedBattles = localStorage.getItem(COMPLETED_BATTLES_STORAGE_KEY);
      if (storedBattles) {
        return new Set(JSON.parse(storedBattles));
      }
      return new Set();
    } catch (e) {
      console.error("Failed to load completed battles from localStorage", e);
      return new Set();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(COMPLETED_BATTLES_STORAGE_KEY, JSON.stringify(Array.from(completedBattles)));
    } catch (e) {
      console.error("Failed to save completed battles to localStorage", e);
    }
  }, [completedBattles]);

  const toggleBattleCompletion = useCallback((locationId: string) => {
    setCompletedBattles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(locationId)) {
        newSet.delete(locationId);
      } else {
        newSet.add(locationId);
      }
      return newSet;
    });
  }, []);

  return {
    completedBattles,
    toggleBattleCompletion,
  };
};
