

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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout

    try {
        const response = await fetch(`${POKEAPI_BASE_URL}/${endpoint}`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
            throw new Error(`PokeAPI request failed for ${endpoint}: ${response.status} ${response.statusText} - ${errorData.detail || errorData.message}`);
        }
        return response.json() as T;

    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`The request to the Pokémon API for "${endpoint}" timed out. Please try again.`);
        }
        // Re-throw other errors to be handled by the calling function
        throw error;
    }
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


// This new implementation uses a robust recursive search which is cleaner for tree traversal and more resilient to API edge cases.
function processEvolutionChain(chain: PokeApiEvolutionChainLink, targetPokemonId: number): PokemonDetailData['evolutions'] | null {
    // Recursive function to find the target node and its direct relatives (parent and children)
    const findNode = (
        currentLink: PokeApiEvolutionChainLink,
        parentLink: PokeApiEvolutionChainLink | null
    ): {
        previous?: PokeApiEvolutionChainLink,
        current: PokeApiEvolutionChainLink,
        next: PokeApiEvolutionChainLink[]
    } | null => {
        try {
            const currentId = parseInt(extractIdFromUrl(currentLink.species.url), 10);

            // If this node is the one we're looking for, return its relatives.
            if (currentId === targetPokemonId) {
                return {
                    previous: parentLink || undefined,
                    current: currentLink,
                    next: currentLink.evolves_to,
                };
            }

            // If not, search in the children nodes.
            for (const nextLink of currentLink.evolves_to) {
                const found = findNode(nextLink, currentLink);
                if (found) {
                    return found; // Propagate the result up the recursion stack.
                }
            }
        } catch (e) {
            console.warn(`Skipping malformed evolution link: ${currentLink?.species?.url}`, e);
        }
        
        return null; // Not found in this branch
    };

    const relatives = findNode(chain, null);

    // If the target Pokémon wasn't found in the chain, it's an error state.
    if (!relatives) {
        console.error(`Could not find Pokémon with ID ${targetPokemonId} in its evolution chain data. The chain may be malformed or the ID is incorrect.`);
        return null;
    }
    
    const { previous, current, next } = relatives;

    const capitalize = (s: string) => s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    
    // Helper function to safely parse the details for a "next evolution" step.
    const parseNextStage = (evoLink: PokeApiEvolutionChainLink): PokemonEvolutionStep | null => {
        try {
            const nextStageId = parseInt(extractIdFromUrl(evoLink.species.url), 10);
            let trigger = "Unknown";
            const conditions: string[] = [];

            if (evoLink.evolution_details && evoLink.evolution_details.length > 0) {
                const detail = evoLink.evolution_details[0];
                
                trigger = detail.trigger?.name?.replace(/-/g, ' ') || "Unknown";

                if (detail.min_level) {
                    trigger = `Level ${detail.min_level}`;
                } else if (detail.item) {
                    trigger = `Use ${capitalize(detail.item.name.replace(/-/g, ' '))}`;
                }

                if (detail.gender === 1) conditions.push("Female");
                if (detail.gender === 2) conditions.push("Male");
                if (detail.held_item) conditions.push(`Hold ${capitalize(detail.held_item.name.replace(/-/g, ' '))}`);
                if (detail.known_move) conditions.push(`Knows ${capitalize(detail.known_move.name.replace(/-/g, ' '))}`);
                if (detail.min_affection) conditions.push(`Affection ${detail.min_affection}+`);
                if (detail.min_beauty) conditions.push(`Beauty ${detail.min_beauty}+`);
                if (detail.min_happiness) conditions.push(`Happiness ${detail.min_happiness}+`);
                if (detail.time_of_day && detail.time_of_day !== "") conditions.push(capitalize(detail.time_of_day));
                if (detail.location) conditions.push(`at ${capitalize(detail.location.name.replace(/-/g, ' '))}`);
                if (detail.needs_overworld_rain) conditions.push("in Rain");
                if (detail.party_species) conditions.push(`with ${capitalize(detail.party_species.name.replace(/-/g, ' '))} in party`);
                if (detail.trade_species) conditions.push(`for ${capitalize(detail.trade_species.name.replace(/-/g, ' '))}`);
                if (detail.turn_upside_down) conditions.push("Upside Down");
            }

            return {
                name: evoLink.species.name,
                id: nextStageId,
                spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${nextStageId}.png`,
                trigger: capitalize(trigger),
                conditions: conditions.map(capitalize),
            };
        } catch (e) {
            console.warn(`Failed to parse next evolution stage from ${evoLink?.species?.url}`, e);
            return null;
        }
    };

    let previousStageData: { name: string; id: number; spriteUrl: string | null; } | undefined = undefined;
    if (previous) {
        try {
            const prevId = parseInt(extractIdFromUrl(previous.species.url), 10);
            previousStageData = {
                name: previous.species.name,
                id: prevId,
                spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${prevId}.png`,
            };
        } catch (e) {
             console.warn(`Failed to parse previous evolution stage from ${previous?.species?.url}`, e);
        }
    }

    const currentStageData = {
        name: current.species.name,
        id: targetPokemonId,
        spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${targetPokemonId}.png`,
    };

    const nextStagesData = next.map(parseNextStage).filter((s): s is PokemonEvolutionStep => s !== null);

    return {
        currentStage: currentStageData,
        previousStage: previousStageData,
        nextStages: nextStagesData,
    };
}


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
  
  const pokemonData = await fetchPokeApi<PokeApiPokemon>(`pokemon/${apiCompatibleNameOrId}`);
  const speciesData = await fetchPokeApi<PokeApiSpecies>(pokemonData.species.url.replace(POKEAPI_BASE_URL + '/', ''));
  
  let evolutionDataProcessed: PokemonDetailData['evolutions'] = null;
  if (speciesData.evolution_chain?.url) {
    try {
        const evolutionChainData = await fetchPokeApi<PokeApiEvolutionChain>(speciesData.evolution_chain.url.replace(POKEAPI_BASE_URL + '/', ''));
        evolutionDataProcessed = processEvolutionChain(evolutionChainData.chain, pokemonData.id);
    } catch (evoError) {
        console.warn(`Failed to fetch or process evolution chain for ${pokemonData.name}:`, evoError);
    }
  }

  const flavorTextEntry = speciesData.flavor_text_entries.find(entry => entry.language.name === 'en' && (entry.version.name === 'scarlet' || entry.version.name === 'violet'));
  const flavorText = flavorTextEntry ? flavorTextEntry.flavor_text.replace(/[\n\f\r]/g, ' ') : "No flavor text available for Scarlet/Violet.";

  const genusEntry = speciesData.genera.find(g => g.language.name === 'en');
  const genus = genusEntry ? genusEntry.genus : "Unknown Pokémon";

  const baseStats: PokemonBaseStat[] = pokemonData.stats.map(s => ({
    name: s.stat.name.replace(/-/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
    value: s.base_stat,
  }));

  const structuredAbilities = pokemonData.abilities.map(a => ({
    displayName: a.ability.name.replace(/-/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
    rawName: a.ability.name,
    isHidden: a.is_hidden,
  })).sort((a,b) => {
    if (a.isHidden !== b.isHidden) return a.isHidden ? 1 : -1;
    return a.displayName.localeCompare(b.displayName);
  });


  const levelUpMoves = pokemonData.moves
    .map(moveData => {
      const scarletVioletDetail = moveData.version_group_details.find(
        detail => detail.version_group.name === 'scarlet-violet' && detail.move_learn_method.name === 'level-up'
      );
      if (scarletVioletDetail && scarletVioletDetail.level_learned_at > 0) {
        return {
          rawName: moveData.move.name,
          name: moveData.move.name.replace(/-/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          levelLearnedAt: scarletVioletDetail.level_learned_at,
          learnMethod: 'Level Up',
        };
      }
      return null;
    })
    .filter((move): move is { rawName: string; name: string; levelLearnedAt: number; learnMethod: string; } => move !== null)
    .sort((a, b) => (a.levelLearnedAt || 0) - (b.levelLearnedAt || 0));

  const detailedMovesPromises = levelUpMoves.slice(0, 20).map(async (basicMoveInfo) => { 
    try {
      const moveDetails = await fetchPokeApi<PokeApiMoveData>(`move/${basicMoveInfo.rawName}`);
      const effectEntry = moveDetails.effect_entries.find(e => e.language.name === 'en');
      return {
        rawName: basicMoveInfo.rawName,
        name: basicMoveInfo.name,
        levelLearnedAt: basicMoveInfo.levelLearnedAt,
        learnMethod: basicMoveInfo.learnMethod,
        power: moveDetails.power,
        accuracy: moveDetails.accuracy,
        pp: moveDetails.pp,
        moveType: moveDetails.type.name.charAt(0).toUpperCase() + moveDetails.type.name.slice(1),
        damageClass: moveDetails.damage_class.name.charAt(0).toUpperCase() + moveDetails.damage_class.name.slice(1),
        shortEffect: effectEntry ? effectEntry.short_effect.replace(/\$effect_chance/g, `${moveDetails.effect_chance || ''}`) : 'No effect description.',
      } as PokemonMoveInfo;
    } catch (moveError) {
      console.warn(`Failed to fetch details for move ${basicMoveInfo.name}:`, moveError);
      return { 
        rawName: basicMoveInfo.rawName,
        name: basicMoveInfo.name,
        levelLearnedAt: basicMoveInfo.levelLearnedAt,
        learnMethod: basicMoveInfo.learnMethod,
        power: null, accuracy: null, pp: undefined, moveType: undefined, damageClass: undefined, shortEffect: 'Error fetching details.',
      } as PokemonMoveInfo;
    }
  });

  const resolvedDetailedMoves = await Promise.all(detailedMovesPromises);

  const processedPokemonDetails: PokemonDetailData = {
    id: pokemonData.id,
    name: pokemonData.name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-'),
    spriteUrl: pokemonData.sprites.other?.['official-artwork']?.front_default || pokemonData.sprites.front_default,
    shinySpriteUrl: pokemonData.sprites.other?.['official-artwork']?.front_shiny || pokemonData.sprites.front_shiny,
    genus,
    types: pokemonData.types.map(t => t.type.name.charAt(0).toUpperCase() + t.type.name.slice(1)),
    abilities: structuredAbilities,
    baseStats,
    evolutions: evolutionDataProcessed,
    flavorText,
    moves: resolvedDetailedMoves,
    generationInsights: undefined, // Initially undefined, will be fetched separately
  };
  
  setCachedData(cacheKey, processedPokemonDetails);
  console.log(`Pokémon data for "${apiCompatibleNameOrId}" cached (new format).`);

  return processedPokemonDetails;
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