

import { useState, useCallback } from 'react';
import {
  PokemonDetailData, AbilityDetailData, FullMoveDetailData,
  PokemonMoveInfo
} from '../types';
import { fetchPokemonDetails, fetchAbilityDetails, fetchFullMoveDetails, fetchPokemonGenerationInsights } from '../services/pokeApiService';

export const useDetailBar = (apiKeyMissing: boolean) => {
  const [activeBottomBarView, setActiveBottomBarView] = useState<'pokemon' | 'ability' | 'move' | null>(null);
  const [selectedPokemonDetailData, setSelectedPokemonDetailData] = useState<PokemonDetailData | null>(null);
  const [selectedAbilityDetailData, setSelectedAbilityDetailData] = useState<AbilityDetailData | null>(null);
  const [selectedMoveDetailData, setSelectedMoveDetailData] = useState<FullMoveDetailData | null>(null);
  const [pokemonContextForDetailView, setPokemonContextForDetailView] = useState<PokemonDetailData | null>(null);

  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [selectedMoveForAssignment, setSelectedMoveForAssignment] = useState<{ pokemonId: number; moveName: string; moveDetails: PokemonMoveInfo } | null>(null);

  const handleOpenPokemonDetail = useCallback(async (pokemonNameOrId: string | number) => {
    setIsLoadingDetail(true);
    setDetailError(null);
    setSelectedPokemonDetailData(null);
    setSelectedAbilityDetailData(null);
    setSelectedMoveDetailData(null);
    setPokemonContextForDetailView(null);
    setSelectedMoveForAssignment(null);
    
    try {
      // Fetch base details first
      const details = await fetchPokemonDetails(pokemonNameOrId);
      setSelectedPokemonDetailData(details);
      setActiveBottomBarView('pokemon');
      setIsLoadingDetail(false); // Stop loading after base details are shown

      // Then, fetch generation insights without blocking the UI
      if (!apiKeyMissing) {
        try {
            const insights = await fetchPokemonGenerationInsights(details.name);
            setSelectedPokemonDetailData(prevDetails => 
                prevDetails ? { ...prevDetails, generationInsights: insights } : null
            );
        } catch (insightsErr) {
            console.warn(`Could not fetch Gen 9 insights for ${details.name}:`, insightsErr);
            // Optionally set an error state for insights specifically
            setSelectedPokemonDetailData(prevDetails => 
                prevDetails ? { ...prevDetails, generationInsights: null } : null // Indicate that fetching failed
            );
        }
      }
    } catch (err) {
      console.error(`Error fetching Pokémon details for ${pokemonNameOrId}:`, err);
      setDetailError(err instanceof Error ? err.message : `An unknown error occurred while fetching details for ${pokemonNameOrId}.`);
      setActiveBottomBarView(null);
      setIsLoadingDetail(false);
    }
  }, [apiKeyMissing]);

  const handleAbilityNameClick = useCallback(async (abilityName: string) => {
    setIsLoadingDetail(true);
    setDetailError(null);
    setPokemonContextForDetailView(selectedPokemonDetailData);
    setSelectedAbilityDetailData(null);
    try {
      const details = await fetchAbilityDetails(abilityName);
      setSelectedAbilityDetailData(details);
      setActiveBottomBarView('ability');
    } catch (err) {
      console.error(`Error fetching ability details for ${abilityName}:`, err);
      setDetailError(err instanceof Error ? err.message : `An unknown error occurred.`);
      setActiveBottomBarView(pokemonContextForDetailView ? 'pokemon' : null);
    } finally {
      setIsLoadingDetail(false);
    }
  }, [selectedPokemonDetailData, pokemonContextForDetailView]);

  const handleMoveNameClick = useCallback(async (moveDisplayName: string, rawMoveName: string) => {
    setIsLoadingDetail(true);
    setDetailError(null);
    setPokemonContextForDetailView(selectedPokemonDetailData);
    setSelectedMoveDetailData(null);
    try {
      const details = await fetchFullMoveDetails(rawMoveName);
      setSelectedMoveDetailData(details);
      setActiveBottomBarView('move');
    } catch (err) {
      console.error(`Error fetching move details for ${rawMoveName}:`, err);
      setDetailError(err instanceof Error ? err.message : `An unknown error occurred.`);
      setActiveBottomBarView(pokemonContextForDetailView ? 'pokemon' : null);
    } finally {
      setIsLoadingDetail(false);
    }
  }, [selectedPokemonDetailData, pokemonContextForDetailView]);

  const handleBackToPokemonDetail = useCallback(() => {
    if (pokemonContextForDetailView) {
      setSelectedPokemonDetailData(pokemonContextForDetailView);
      setSelectedAbilityDetailData(null);
      setSelectedMoveDetailData(null);
      setActiveBottomBarView('pokemon');
      setPokemonContextForDetailView(null);
      setDetailError(null);
    }
  }, [pokemonContextForDetailView]);

  const handleCloseBottomBar = useCallback(() => {
    setActiveBottomBarView(null);
    setSelectedPokemonDetailData(null);
    setSelectedAbilityDetailData(null);
    setSelectedMoveDetailData(null);
    setPokemonContextForDetailView(null);
    setSelectedMoveForAssignment(null);
    setDetailError(null);
  }, []);

  const handleStageMove = useCallback((pokemonId: number, moveName: string, moveDetails: PokemonMoveInfo) => {
    setSelectedMoveForAssignment(prev => {
        if (prev && prev.pokemonId === pokemonId && prev.moveName === moveName) return null;
        return { pokemonId, moveName, moveDetails };
    });
  }, []);

  return {
    activeBottomBarView,
    selectedPokemonDetailData,
    selectedAbilityDetailData,
    selectedMoveDetailData,
    pokemonContextForDetailView,
    isLoadingDetail,
    detailError,
    selectedMoveForAssignment,
    setSelectedMoveForAssignment, // Expose setter for App.tsx to clear
    handleOpenPokemonDetail,
    handleAbilityNameClick,
    handleMoveNameClick,
    handleBackToPokemonDetail,
    handleCloseBottomBar,
    handleStageMove,
  };
};