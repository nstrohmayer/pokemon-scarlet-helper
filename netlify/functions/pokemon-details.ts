
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import type { 
  PokeApiPokemon, 
  PokeApiSpecies, 
  PokeApiEvolutionChain,
  PokeApiEvolutionChainLink,
  PokemonDetailData,
  PokemonBaseStat,
  PokemonEvolutionStep,
  PokemonMoveInfo,
  PokeApiMoveData,
  PokeApiEvolutionDetail
} from '../../types';

const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2';

async function fetchPokeApi<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${POKEAPI_BASE_URL}/${endpoint}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(`PokeAPI request failed for ${endpoint}: ${response.status} ${response.statusText} - ${errorData.detail || errorData.message}`);
  }
  return response.json() as T;
}

const extractIdFromUrl = (url: string): string => {
  const parts = url.split('/');
  return parts[parts.length - 2];
};

function processEvolutionChain(chain: PokeApiEvolutionChainLink, targetPokemonId: number): PokemonDetailData['evolutions'] | null {
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
            if (currentId === targetPokemonId) {
                return {
                    previous: parentLink || undefined,
                    current: currentLink,
                    next: currentLink.evolves_to,
                };
            }
            for (const nextLink of currentLink.evolves_to) {
                const found = findNode(nextLink, currentLink);
                if (found) return found;
            }
        } catch (e) {
            console.warn(`Skipping malformed evolution link: ${currentLink?.species?.url}`, e);
        }
        return null;
    };

    const relatives = findNode(chain, null);
    if (!relatives) {
        console.error(`Could not find Pokémon with ID ${targetPokemonId} in its evolution chain data.`);
        return null;
    }
    
    const { previous, current, next } = relatives;
    const capitalize = (s: string) => s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    
    const parseNextStage = (evoLink: PokeApiEvolutionChainLink): PokemonEvolutionStep | null => {
        try {
            const nextStageId = parseInt(extractIdFromUrl(evoLink.species.url), 10);
            let trigger = "Unknown";
            const conditions: string[] = [];
            if (evoLink.evolution_details && evoLink.evolution_details.length > 0) {
                const detail = evoLink.evolution_details[0];
                trigger = detail.trigger?.name?.replace(/-/g, ' ') || "Unknown";
                if (detail.min_level) trigger = `Level ${detail.min_level}`;
                else if (detail.item) trigger = `Use ${capitalize(detail.item.name.replace(/-/g, ' '))}`;
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


const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    const pokemonNameOrId = event.queryStringParameters?.id;

    if (!pokemonNameOrId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing "id" query parameter.' }),
        };
    }

    try {
        const pokemonData = await fetchPokeApi<PokeApiPokemon>(`pokemon/${pokemonNameOrId}`);
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
        })).sort((a, b) => {
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
            generationInsights: undefined,
        };

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(processedPokemonDetails),
        };

    } catch (e) {
        const error = e as Error;
        console.error(`Error in pokemon-details proxy for id [${pokemonNameOrId}]:`, error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};

export { handler };
