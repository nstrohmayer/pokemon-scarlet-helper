
import { useState, useEffect, useCallback } from 'react';
import { LikedPokemonMap, HuntingListMap } from '../types';
import { LIKED_POKEMON_STORAGE_KEY, HUNTING_LIST_STORAGE_KEY } from '../constants';

export const usePokemonCollections = () => {
  // Liked Pokémon state (using a map for O(1) lookups)
  const [likedPokemonMap, setLikedPokemonMap] = useState<LikedPokemonMap>(() => {
    try {
      const stored = localStorage.getItem(LIKED_POKEMON_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.error("Failed to load liked Pokémon from localStorage", e);
      return {};
    }
  });

  // Hunting List state
  const [huntingList, setHuntingList] = useState<HuntingListMap>(() => {
    try {
      const stored = localStorage.getItem(HUNTING_LIST_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.error("Failed to load hunting list from localStorage", e);
      return {};
    }
  });

  // --- Persistence Effects ---
  useEffect(() => {
    try {
      localStorage.setItem(LIKED_POKEMON_STORAGE_KEY, JSON.stringify(likedPokemonMap));
    } catch (e) {
      console.error("Failed to save liked Pokémon to localStorage", e);
    }
  }, [likedPokemonMap]);

  useEffect(() => {
    try {
      localStorage.setItem(HUNTING_LIST_STORAGE_KEY, JSON.stringify(huntingList));
    } catch (e) {
      console.error("Failed to save hunting list to localStorage", e);
    }
  }, [huntingList]);


  // --- Handler Functions ---

  const toggleLikedPokemon = useCallback((pokemonId: number) => {
    setLikedPokemonMap(prev => {
      const newMap = { ...prev };
      const idStr = pokemonId.toString();
      if (newMap[idStr]) {
        delete newMap[idStr];
      } else {
        newMap[idStr] = true;
      }
      return newMap;
    });
  }, []);

  const addToHuntingList = useCallback((pokemonId: number, pokemonName: string, area: string) => {
    setHuntingList(prev => {
      const newHuntingList = { ...prev };
      const areaHunts = [...(newHuntingList[area] || [])];
      
      // Prevent duplicates in the same area
      if (areaHunts.some(p => p.pokemonId === pokemonId)) {
        return prev; 
      }
      
      areaHunts.push({ pokemonId, pokemonName });
      newHuntingList[area] = areaHunts;
      return newHuntingList;
    });
  }, []);
  
  const removeFromHuntingList = useCallback((pokemonId: number, area: string) => {
    setHuntingList(prev => {
        const newHuntingList = { ...prev };
        if (!newHuntingList[area]) {
            return prev; // Nothing to remove
        }

        newHuntingList[area] = newHuntingList[area].filter(p => p.pokemonId !== pokemonId);

        // If the area is now empty, remove it from the list
        if (newHuntingList[area].length === 0) {
            delete newHuntingList[area];
        }

        return newHuntingList;
    });
  }, []);

  return {
    likedPokemonMap,
    huntingList,
    toggleLikedPokemon,
    addToHuntingList,
    removeFromHuntingList,
  };
};
