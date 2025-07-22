
import { PokemonDetailData, ProspectorFilters } from '../types';
import { fetchPokemonDetails } from './pokeApiService';
import { GEN_9_START_ID, POKEMON_MAX_ID } from '../constants';

const MAX_FETCH_ATTEMPTS = 50;

/**
 * Checks if a given Pokémon matches the filter criteria.
 * @param pokemon The Pokémon data to check.
 * @param filters The active filters.
 * @returns True if the Pokémon is a match, false otherwise.
 */
const checkFilters = (pokemon: PokemonDetailData, filters: ProspectorFilters): boolean => {
    if (filters.isNewOnly && pokemon.id < GEN_9_START_ID) {
        return false;
    }
    if (filters.isFullyEvolvedOnly && pokemon.evolutions?.nextStages && pokemon.evolutions.nextStages.length > 0) {
        return false;
    }
    return true;
};

/**
 * Fetches a random Pokémon that matches the given filters.
 * @param filters The active filters.
 * @returns A promise that resolves to the found Pokémon data.
 * @throws An error if no matching Pokémon can be found.
 */
const fetchRandomProspect = async (filters: ProspectorFilters): Promise<PokemonDetailData> => {
    let attempts = 0;
    while (attempts < MAX_FETCH_ATTEMPTS) {
        attempts++;
        const minId = filters.isNewOnly ? GEN_9_START_ID : 1;
        const maxId = POKEMON_MAX_ID;
        const randomId = Math.floor(Math.random() * (maxId - minId + 1)) + minId;

        try {
            const pokemon = await fetchPokemonDetails(randomId);
            if (checkFilters(pokemon, filters)) {
                return pokemon;
            }
        } catch (err) {
            console.warn(`Random prospect fetch failed for ID ${randomId}:`, err);
        }
    }
    throw new Error("Could not find a random Pokémon matching your criteria. Please try again or adjust filters.");
};

/**
 * Fetches the next sequential Pokémon that matches the given filters.
 * @param filters The active filters.
 * @param currentId The ID of the current Pokémon to start searching from.
 * @returns A promise that resolves to the found Pokémon data.
 * @throws An error if no matching Pokémon can be found.
 */
const fetchNumericalProspect = async (filters: ProspectorFilters, currentId: number): Promise<PokemonDetailData> => {
    let attempts = 0;
    let nextId = currentId;
    const minId = 1;
    const maxId = POKEMON_MAX_ID;
    const totalRange = (maxId - minId + 1);

    while (attempts < totalRange) {
        attempts++;
        nextId++;
        
        if (nextId > maxId) {
            nextId = minId;
        }

        // If 'New Only' is on and we're below the Gen 9 start, jump ahead.
        if (filters.isNewOnly && nextId < GEN_9_START_ID) {
            nextId = GEN_9_START_ID;
        }

        try {
            const pokemon = await fetchPokemonDetails(nextId);
            if (checkFilters(pokemon, filters)) {
                return pokemon;
            }
        } catch (err) {
            // This can happen for non-existent IDs (e.g., missing forms in a sequence).
            // We just ignore it and continue to the next ID.
            console.warn(`Numerical prospect fetch failed for ID ${nextId}, continuing...`, err);
        }
    }
    throw new Error("Could not find a sequential Pokémon matching your criteria. Please try again or adjust filters.");
};

/**
 * Main service function to fetch a Pokémon prospect based on filters.
 * @param filters The active filters.
 * @param currentPokemonId The ID of the current Pokémon, used for numerical mode.
 * @returns A promise that resolves to the found Pokémon data.
 */
export const fetchProspect = async (filters: ProspectorFilters, currentPokemonId?: number): Promise<PokemonDetailData> => {
    if (filters.orderMode === 'numerical') {
        const startId = currentPokemonId ?? 0;
        return fetchNumericalProspect(filters, startId);
    } else {
        return fetchRandomProspect(filters);
    }
};
