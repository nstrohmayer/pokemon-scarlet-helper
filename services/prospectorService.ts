import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { ProspectorFilters, TeamMember } from '../types';
import { GEMINI_MODEL_NAME } from '../constants';

// --- Gemini AI and Caching Setup ---
let ai: GoogleGenAI | null = null;
const getGoogleGenAI = (): GoogleGenAI => {
  if (!ai) {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API Key (process.env.API_KEY) is not configured.");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
};

const CACHE_PREFIX_PROSPECTOR_LIST = "prospector_list_cache_sv_";
const CACHE_PREFIX_SUGGESTIONS = "prospector_suggestions_cache_sv_";
const CACHE_EXPIRATION_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Fetches a list of Pokémon from the Gemini API based on specified filters.
 * @param filters The active filters for generation, type, and evolution status.
 * @returns A promise that resolves to an array of Pokémon objects with name and id.
 * @throws An error if the API call fails or returns an empty/invalid response.
 */
export const fetchProspectsFromAI = async (filters: ProspectorFilters): Promise<{ name: string; id: number }[]> => {
    const genAI = getGoogleGenAI();
    const cacheKey = `${CACHE_PREFIX_PROSPECTOR_LIST}gen_${filters.generation || 'any'}_type_${filters.type || 'any'}_evolved_${filters.isFullyEvolvedOnly}_v2`; // Versioned cache key

    // Check cache first
    try {
        const cachedItem = localStorage.getItem(cacheKey);
        if (cachedItem) {
            const cacheEntry = JSON.parse(cachedItem);
            if (Date.now() - cacheEntry.timestamp < CACHE_EXPIRATION_MS) {
                console.log(`Serving prospector list for filters ${JSON.stringify(filters)} from cache.`);
                return cacheEntry.data;
            }
        }
    } catch (e) {
        console.warn("Error reading prospector cache", e);
    }
    
    const prompt = `
        List all Pokémon that meet these criteria for games up to and including Pokémon Scarlet and Violet.
        - Generation: ${filters.generation ? `Gen ${filters.generation}` : 'Any'}
        - Primary or Secondary Type: ${filters.type || 'Any'}
        - Evolution Status: ${filters.isFullyEvolvedOnly ? 'Must be fully evolved (cannot evolve further)' : 'Any'}

        Return the list as a JSON array of objects, where each object has a "name" (official Pokémon name) and an "id" (National Pokédex number). Order them by their National Pokédex number. For example: [{"name": "Bulbasaur", "id": 1}, {"name": "Ivysaur", "id": 2}].
        If no Pokémon match, return an empty array.
    `;

    const schema = {
        type: Type.ARRAY,
        description: "A list of Pokémon objects that match the user's criteria, sorted by National Pokédex number.",
        items: {
            type: Type.OBJECT,
            properties: {
                name: {
                    type: Type.STRING,
                    description: "The official English name of the Pokémon."
                },
                id: {
                    type: Type.NUMBER,
                    description: "The official National Pokédex ID for the Pokémon."
                }
            },
            required: ["name", "id"]
        }
    };
    
    const systemInstruction = "You are a Pokémon expert assistant for a Nuzlocke application. Your task is to provide a list of Pokémon based on specific criteria from the user. You must only return a JSON array of objects, where each object contains the Pokémon's 'name' and 'id'. The list should be in National Pokédex order.";

    try {
        const response: GenerateContentResponse = await genAI.models.generateContent({
            model: GEMINI_MODEL_NAME,
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.0
            }
        });

        const textOutput = response.text;
        
        if (typeof textOutput !== 'string' || textOutput.trim() === "") {
            throw new Error("The AI returned an empty response for the prospector list.");
        }

        let jsonStr = textOutput.trim();
        const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[1]) {
            jsonStr = match[1].trim();
        }

        const pokemonData = JSON.parse(jsonStr) as { name: string; id: number }[];

        // Cache the result
        const cacheEntry = { timestamp: Date.now(), data: pokemonData };
        localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));

        return pokemonData;

    } catch (error) {
        console.error("Error fetching prospect list from Gemini:", error);
        let errorMessage = "Failed to fetch Pokémon list from AI.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        throw new Error(errorMessage);
    }
};

export const fetchTeamSuggestionsFromAI = async (team: TeamMember[]): Promise<{ name: string; id: number }[]> => {
    if (team.length === 0) {
        throw new Error("Cannot suggest teammates for an empty team. Please add Pokémon to your team first.");
    }

    const genAI = getGoogleGenAI();
    // Create a stable cache key from the team's species, sorted alphabetically
    const teamCompositionKey = team.map(m => m.species).sort().join(',');
    const cacheKey = `${CACHE_PREFIX_SUGGESTIONS}${teamCompositionKey}_v1`;

    // Check cache
    try {
        const cachedItem = localStorage.getItem(cacheKey);
        if (cachedItem) {
            const cacheEntry = JSON.parse(cachedItem);
            if (Date.now() - cacheEntry.timestamp < CACHE_EXPIRATION_MS) {
                console.log(`Serving team suggestions for team [${teamCompositionKey}] from cache.`);
                return cacheEntry.data;
            }
        }
    } catch (e) {
        console.warn("Error reading suggestions cache", e);
    }
    
    const teamSummary = team.map(m => `- ${m.species} (Types: ${m.types.join('/')})`).join('\n');

    const prompt = `
        My current Pokémon team for a Nuzlocke run in Pokémon Scarlet and Violet consists of:\n
        ${teamSummary}\n\n
        Please suggest a list of 10-15 good Pokémon to add to this team to improve its balance.
        Focus on suggestions that cover my team's defensive weaknesses and add good offensive type coverage against common threats in the game.
        Prioritize Pokémon that are reasonably available to catch during a playthrough.
        Do not suggest Pokémon already on my team.

        Return the list as a JSON array of objects, where each object has a "name" (official Pokémon name) and an "id" (National Pokédex number). Order them by their National Pokédex number. For example: [{"name": "Magnemite", "id": 81}, {"name": "Gengar", "id": 94}].
        If my team is already perfectly balanced, you can return an empty array, but it's very unlikely.
    `;

    const schema = {
        type: Type.ARRAY,
        description: "A list of Pokémon objects suggested to complement the user's team, sorted by National Pokédex number.",
        items: {
            type: Type.OBJECT,
            properties: {
                name: {
                    type: Type.STRING,
                    description: "The official English name of the Pokémon."
                },
                id: {
                    type: Type.NUMBER,
                    description: "The official National Pokédex ID for the Pokémon."
                }
            },
            required: ["name", "id"]
        }
    };
    
    const systemInstruction = "You are a Pokémon expert assistant for a Nuzlocke application. Your task is to provide a list of Pokémon suggestions to complement a user's existing team for Pokémon Scarlet and Violet. You must only return a JSON array of objects, where each object contains the Pokémon's 'name' and 'id'. The list should be in National Pokédex order.";

    try {
        const response: GenerateContentResponse = await genAI.models.generateContent({
            model: GEMINI_MODEL_NAME,
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.1
            }
        });

        const textOutput = response.text;
        
        if (typeof textOutput !== 'string' || textOutput.trim() === "") {
            throw new Error("The AI returned an empty response for team suggestions.");
        }

        let jsonStr = textOutput.trim();
        const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[1]) {
            jsonStr = match[1].trim();
        }

        const pokemonData = JSON.parse(jsonStr) as { name: string; id: number }[];

        // Cache the result
        const cacheEntry = { timestamp: Date.now(), data: pokemonData };
        localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));

        return pokemonData;

    } catch (error) {
        console.error("Error fetching team suggestions from Gemini:", error);
        let errorMessage = "Failed to fetch team suggestions from AI.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        throw new Error(errorMessage);
    }
};
