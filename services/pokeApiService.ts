

import { 
  PokeApiPokemon, 
  PokeApiSpecies, 
  PokeApiEvolutionChain,
  PokeApiEvolutionChainLink,
  PokemonDetailData,
  PokemonBaseStat,
  PokemonEvolutionStep,
  PokemonMoveInfo,
  PokeApiResource,
  PokeApiMoveData,
  PokeApiAbility, // Added
  AbilityDetailData, // Added
  FullPokeApiMoveData, // Added
  FullMoveDetailData, // Added
  PokeApiEvolutionDetail
} from '../types';

import { fetchPokemonGenerationInsights as fetchInsightsFromGemini } from './geminiService';

const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2';
const CACHE_PREFIX_POKEMON = "pokemon_cache_";
const CACHE_PREFIX_ABILITY = "ability_cache_";
const CACHE_PREFIX_MOVE = "move_cache_";
const ALL_POKEMON_NAMES_CACHE_KEY = 'pokeapi_all_names_list';
const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry<T> {
  timestamp: number;
  data: T;
}

async function fetchPokeApi<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${POKEAPI_BASE_URL}/${endpoint}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(`PokeAPI request failed for ${endpoint}: ${response.status} ${response.statusText} - ${errorData.detail || errorData.message}`);
  }
  return response.json() as T;
}

function getCachedData<T>(cacheKey: string): T | null {
  try {
    const item = localStorage.getItem(cacheKey);
    if (!item) return null;
    const entry = JSON.parse(item) as CacheEntry<T>;
    if (Date.now() - entry.timestamp > CACHE_EXPIRATION_MS) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    return entry.data;
  } catch (error) {
    console.warn(`Error reading cache for ${cacheKey}:`, error);
    return null;
  }
}

function setCachedData<T>(cacheKey: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { timestamp: Date.now(), data };
    localStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch (error) {
    console.warn(`Error setting cache for ${cacheKey}:`, error);
  }
}

const extractIdFromUrl = (url: string): string => {
  const parts = url.split('/');
  return parts[parts.length - 2];
};


export const fetchAllPokemonNames = async (): Promise<string[]> => {
  const cached = getCachedData<string[]>(ALL_POKEMON_NAMES_CACHE_KEY);
  if (cached) {
    return cached;
  }

  const response = await fetchPokeApi<{ results: PokeApiResource[] }>(`pokemon?limit=2000`);
  const names = response.results.map(p => p.name);
  
  setCachedData(ALL_POKEMON_NAMES_CACHE_KEY, names);
  console.log("All pokemon names fetched and cached.");
  return names;
};

export const fetchPokemonDetails = async (pokemonNameOrId: string | number): Promise<PokemonDetailData> => {
  let apiCompatibleNameOrId: string;

  if (typeof pokemonNameOrId === 'string') {
    let name = pokemonNameOrId.toLowerCase();
    // Handle special forms like alolan, galar, etc.
    const formMap: { [key: string]: string } = {
        'alolan ': '-alola',
        'galarian ': '-galar',
        'hisuian ': '-hisui',
        'paldean ': '-paldea',
    };

    let formSuffix = '';
    for (const prefix in formMap) {
        if (name.startsWith(prefix)) {
            name = name.substring(prefix.length);
            formSuffix = formMap[prefix];
            break;
        }
    }
    apiCompatibleNameOrId = name.replace(/\s+/g, '-').replace(/[.'"]/g, '') + formSuffix;

    const specialCases: { [key: string]: string } = {
      'squawkabilly': 'squawkabilly-green-plumage',
    };
    if (specialCases[apiCompatibleNameOrId]) {
      console.warn(`Mapping "${apiCompatibleNameOrId}" to default form "${specialCases[apiCompatibleNameOrId]}".`);
      apiCompatibleNameOrId = specialCases[apiCompatibleNameOrId];
    }

  } else {
    apiCompatibleNameOrId = pokemonNameOrId.toString();
  }
  
  const cacheKey = `${CACHE_PREFIX_POKEMON}${apiCompatibleNameOrId}`;
  let cached = getCachedData<PokemonDetailData>(cacheKey); 

  if (cached) {
    if (cached.abilities && cached.abilities.length > 0 && typeof (cached.abilities as any)[0] === 'string') {
        console.warn(`Old ability format (string[]) found in cache for ${apiCompatibleNameOrId}. Invalidating cache and refetching.`);
        localStorage.removeItem(cacheKey);
        cached = null; 
    } else {
        console.log(`Serving Pokémon data for "${apiCompatibleNameOrId}" from cache.`);
        return cached; 
    }
  }
  
  try {
    const response = await fetch(`/.netlify/functions/pokemon-details?id=${apiCompatibleNameOrId}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(errorData.error || `Failed to fetch details from proxy: ${response.statusText}`);
    }
    const processedPokemonDetails: PokemonDetailData = await response.json();
    
    setCachedData(cacheKey, processedPokemonDetails);
    console.log(`Pokémon data for "${apiCompatibleNameOrId}" fetched from proxy and cached.`);

    return processedPokemonDetails;
  } catch(error) {
     console.error(`Error fetching details from Netlify function for ${apiCompatibleNameOrId}:`, error);
     throw error;
  }
};


export const fetchAbilityDetails = async (abilityNameOrId: string | number): Promise<AbilityDetailData> => {
  const apiCompatibleName = abilityNameOrId.toString().toLowerCase().replace(/\s+/g, '-');
  const cacheKey = `${CACHE_PREFIX_ABILITY}${apiCompatibleName}`;
  
  const cached = getCachedData<AbilityDetailData>(cacheKey);
  if (cached) {
    if (cached.pokemonWithAbility && cached.pokemonWithAbility.length > 0 && cached.pokemonWithAbility[0].id === undefined) {
        console.warn(`Old AbilityDetailData format (missing id in pokemonWithAbility) found in cache for ${apiCompatibleName}. Invalidating.`);
        localStorage.removeItem(cacheKey);
    } else {
        console.log(`Serving Ability data for "${apiCompatibleName}" from cache.`);
        return cached;
    }
  }

  const abilityData = await fetchPokeApi<PokeApiAbility>(`ability/${apiCompatibleName}`);

  const effectEntry = abilityData.effect_entries.find(e => e.language.name === 'en');
  const shortEffectEntry = abilityData.effect_entries.find(e => e.language.name === 'en' && e.short_effect);
  
  const flavorTextEntry = abilityData.flavor_text_entries.find(
    ft => ft.language.name === 'en' && (ft.version_group.name === 'scarlet' || ft.version_group.name === 'violet')
  );

  const pokemonList = abilityData.pokemon.map(p => ({
    name: p.pokemon.name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-'),
    isHidden: p.is_hidden,
    id: extractIdFromUrl(p.pokemon.url) // Extract ID
  })).sort((a,b) => a.name.localeCompare(b.name));


  const processedData: AbilityDetailData = {
    id: abilityData.id,
    name: abilityData.names.find(n => n.language.name === 'en')?.name || abilityData.name.split('-').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' '),
    effect: effectEntry ? effectEntry.effect.replace(/\s+/g, ' ') : "No effect description available.",
    shortEffect: shortEffectEntry ? shortEffectEntry.short_effect.replace(/\s+/g, ' ') : "No short effect description.",
    flavorText: flavorTextEntry ? flavorTextEntry.flavor_text.replace(/\s+/g, ' ') : "No flavor text available for Scarlet/Violet.",
    pokemonWithAbility: pokemonList,
  };
  
  setCachedData(cacheKey, processedData);
  console.log(`Ability data for "${apiCompatibleName}" cached.`);
  return processedData;
};

export const fetchFullMoveDetails = async (moveNameOrId: string | number): Promise<FullMoveDetailData> => {
  const apiCompatibleName = typeof moveNameOrId === 'string' 
    ? moveNameOrId.toLowerCase().replace(/\s+/g, '-') 
    : moveNameOrId.toString();

  const cacheKey = `${CACHE_PREFIX_MOVE}${apiCompatibleName}`;

  const cached = getCachedData<FullMoveDetailData>(cacheKey);
  if (cached) {
    if (!cached.learnedByPokemon) { // Check if old cache format without learnedByPokemon
        console.warn(`Old FullMoveDetailData format (missing learnedByPokemon) found in cache for ${apiCompatibleName}. Invalidating.`);
        localStorage.removeItem(cacheKey);
    } else {
        console.log(`Serving Full Move data for "${apiCompatibleName}" from cache.`);
        return cached;
    }
  }

  const moveData = await fetchPokeApi<FullPokeApiMoveData>(`move/${apiCompatibleName}`);
  
  const effectEntry = moveData.effect_entries.find(e => e.language.name === 'en');
  const flavorTextEntry = moveData.flavor_text_entries.find(
    ft => ft.language.name === 'en' && (ft.version_group.name === 'scarlet' || ft.version_group.name === 'violet')
  );

  const learnedByPokemonProcessed = (moveData.learned_by_pokemon || []).map(p => ({
    name: p.name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-'),
    id: extractIdFromUrl(p.url) // Extract ID from URL
  })).sort((a,b) => a.name.localeCompare(b.name));

  const processedData: FullMoveDetailData = {
    id: moveData.id,
    name: moveData.name.split('-').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' '),
    accuracy: moveData.accuracy,
    power: moveData.power,
    pp: moveData.pp,
    type: moveData.type.name.charAt(0).toUpperCase() + moveData.type.name.slice(1),
    damageClass: moveData.damage_class.name.charAt(0).toUpperCase() + moveData.damage_class.name.slice(1),
    effect: effectEntry ? effectEntry.effect.replace(/\$effect_chance/g, `${moveData.effect_chance || ''}`).replace(/\s+/g, ' ') : "No effect description.",
    effectChance: moveData.effect_chance,
    flavorText: flavorTextEntry ? flavorTextEntry.flavor_text.replace(/\s+/g, ' ') : "No flavor text available for Scarlet/Violet.",
    target: moveData.target.name.replace(/-/g, ' ').split(' ').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' '),
    learnedByPokemon: learnedByPokemonProcessed,
  };

  setCachedData(cacheKey, processedData);
  console.log(`Full Move data for "${apiCompatibleName}" cached.`);
  return processedData;
};


// Re-export the Gemini service function from here to keep API calls centralized
export const fetchPokemonGenerationInsights = fetchInsightsFromGemini;