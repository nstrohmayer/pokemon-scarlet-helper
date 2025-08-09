


import { useState, useEffect, useCallback } from 'react';
import { LikedPokemonMap, HuntingListMap } from '../types';
import { LIKED_POKEMON_STORAGE_KEY } from '../constants';
import { huntingListService } from '../services/huntingListService';

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

  // Hunting List state now comes from the service
  const [huntingList, setHuntingList] = useState<HuntingListMap>(huntingListService.getHuntingList());

  // --- Persistence Effects ---
  useEffect(() => {
    try {
      localStorage.setItem(LIKED_POKEMON_STORAGE_KEY, JSON.stringify(likedPokemonMap));
    } catch (e) {
      console.error("Failed to save liked Pokémon to localStorage", e);
    }
  }, [likedPokemonMap]);
  
  // Subscribe to huntingListService for updates
  useEffect(() => {
    const unsubscribe = huntingListService.subscribe(setHuntingList);
    return () => unsubscribe();
  }, []);


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
    huntingListService.addToHuntingList(pokemonId, pokemonName, area);
  }, []);
  
  const removeFromHuntingList = useCallback((pokemonId: number, area: string) => {
    huntingListService.removeFromHuntingList(pokemonId, area);
  }, []);

  return {
    likedPokemonMap,
    huntingList,
    toggleLikedPokemon,
    addToHuntingList,
    removeFromHuntingList,
  };
};