

import { Type, GenerateContentParameters, GenerateContentResponse } from "@google/genai";
import { 
    DetailedLocationInfo, 
    GeminiLocationResponse, 
    CatchablePokemonInfo, 
    TeamMember, 
    GameLocationNode, 
    BattleStrategyDetails, 
    GeminiBattleStrategyResponse,
    PokemonGenerationInsights,
    GeminiPokemonInsightsResponse,
    ChatMessage,
    GeminiComplexGoalResponseItem
} from '../types';
import { GEMINI_MODEL_NAME, SCARLET_VIOLET_PROGRESSION } from '../constants';

const CACHE_PREFIX_GEMINI = "gemini_cache_sv_";
const CACHE_PREFIX_NAVIGATOR = "gemini_navigator_cache_sv_";
const CACHE_PREFIX_BATTLE = "gemini_battle_cache_sv_";
const CACHE_PREFIX_INSIGHTS = "gemini_insights_sv_";

// --- Asynchronous loading for preloaded data ---
let preloadedDataMap: Record<string, DetailedLocationInfo> = {};
let preloadedDataPromise: Promise<void> | null = null;

const loadPreloadedData = (): Promise<void> => {
    if (!preloadedDataPromise) {
        preloadedDataPromise = (async () => {
            try {
                // Use fetch to load the JSON file from the public assets
                const response = await fetch('/data/preloaded_location_data.json');
                if (!response.ok) {
                    throw new Error(`Failed to fetch preloaded data: ${response.statusText}`);
                }
                preloadedDataMap = await response.json();
                console.log("Preloaded location data loaded successfully.");
            } catch (error) {
                console.error("Could not load preloaded_location_data.json:", error);
                // The app will gracefully continue without preloaded data, falling back to API calls.
                preloadedDataMap = {};
            }
        })();
    }
    return preloadedDataPromise;
};

// Start loading the data in the background as soon as the app starts.
loadPreloadedData();
// --- End of preloaded data loading ---

// This is a representation of the serializable response from our proxy.
interface GeminiProxyResponse {
    text: string;
    candidates?: {
        finishReason?: string;
        finishMessage?: string;
    }[];
    promptFeedback?: {
        blockReason?: string;
        blockReasonMessage?: string;
    };
}

export async function callGeminiProxy(params: GenerateContentParameters): Promise<GeminiProxyResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout

    try {
        const proxyResponse = await fetch('/.netlify/functions/gemini-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ params }),
            signal: controller.signal // Pass the AbortSignal to fetch
        });

        clearTimeout(timeoutId); // Clear the timeout if the request completes in time

        const responseData = await proxyResponse.json();

        if (!proxyResponse.ok) {
            throw new Error(responseData.error || `Proxy request failed with status ${proxyResponse.status}`);
        }

        return responseData;
    } catch (error) {
        clearTimeout(timeoutId); // Also clear timeout on other errors
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('The request to the AI took too long and has timed out. Please try again later.');
        }
        // Re-throw other errors
        throw error;
    }
}


export const fetchLocationDetailsFromGemini = async (locationName: string): Promise<DetailedLocationInfo> => {
  // Ensure preloaded data has been attempted to load before proceeding
  await loadPreloadedData();

  // Check for preloaded data first
  const locationNode = SCARLET_VIOLET_PROGRESSION.find(loc => loc.name === locationName);
  if (locationNode && preloadedDataMap[locationNode.id]) {
      console.log(`Serving preloaded data for "${locationName}".`);
      // Return a deep copy to prevent mutation of the original data object
      return JSON.parse(JSON.stringify(preloadedDataMap[locationNode.id]));
  }
  
  const cacheKey = `${CACHE_PREFIX_GEMINI}${locationName.toLowerCase().replace(/\s+/g, '_')}`;

  try {
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      console.log(`Serving Gemini data for "Pokémon Scarlet & Violet - ${locationName}" from cache.`);
      return JSON.parse(cachedData) as DetailedLocationInfo;
    }
  } catch (error) {
    console.warn(`Error reading Gemini cache for "Pokémon Scarlet & Violet - ${locationName}":`, error);
  }

  const prompt = `Provide detailed information about the game location "${locationName}" from the game "Pokémon Scarlet and Violet" for a Nuzlocke challenge application.`;
  
  const schema = {
      type: Type.OBJECT,
      properties: {
        locationName: { type: Type.STRING, description: "The confirmed name of the location in Pokémon Scarlet and Violet." },
        summary: { type: Type.STRING, description: "A brief 1-2 sentence Nuzlocke-relevant summary of the location in Pokémon Scarlet and Violet. Mention key events or purpose if applicable." },
        catchablePokemon: {
          type: Type.ARRAY,
          description: "List of catchable Pokémon in the location. Do not include Pokémon obtained via trade or as gifts here; they belong in keyEvents.",
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Name of the Pokemon species found in Pokémon Scarlet and Violet." },
              pokemonId: { type: Type.NUMBER, description: "The official National Pokédex ID for the Pokémon." },
              conditions: { type: Type.STRING, description: "Specific encounter conditions in Pokémon Scarlet and Violet, e.g., 'Day only', 'Outbreaks', 'Tera Pokémon'. If standard, use 'Standard encounter'." }
            },
            required: ["name", "pokemonId", "conditions"]
          }
        },
        trainers: {
          type: Type.ARRAY,
          description: "List of notable trainers in the location. This includes rivals and other important non-generic trainers.",
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Trainer's class and name, e.g., 'Student Gema', 'Rival Nemona'." },
              strongestPokemonName: { type: Type.STRING, description: "The name of their highest level or most threatening Pokemon." },
              strongestPokemonLevel: { type: Type.NUMBER, description: "The level of that Pokemon." },
              notes: { type: Type.STRING, description: "Optional: Brief notes like 'Key Rival Battle', 'May use a Potion'." }
            },
            required: ["name", "strongestPokemonName", "strongestPokemonLevel", "notes"]
          }
        },
        items: {
          type: Type.ARRAY,
          description: "List of items found in the location as sparkling items on the ground. Do not include items given by NPCs; they belong in keyEvents.",
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Item name, e.g., 'Potion', 'TM Name'." },
              locationDescription: { type: Type.STRING, description: "How/where to find it, e.g., 'On the ground near the great tree'." }
            },
            required: ["name", "locationDescription"]
          }
        },
        keyEvents: {
          type: Type.ARRAY,
          description: "List of key one-time events, special NPC interactions, or area-wide rewards. This does NOT include standard trainer battles. Examples include choosing a starter, receiving a gift from an NPC, or rewards from the Pokémon League representative.",
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "A short title for the event, e.g., 'League Rep Reward', 'Choose Your Starter', 'Snom Trade'." },
              description: { type: Type.STRING, description: "A brief description of the event, e.g., 'Defeat 5 trainers in this area to get a Shell Bell.', 'Choose between Sprigatito, Fuecoco, and Quaxly.', 'Trade a Flabébé for a Snom with an NPC.'" },
              type: {
                type: Type.STRING,
                description: "The type of event. Must be one of: 'Reward', 'Event', or 'Interaction'.",
                enum: ['Reward', 'Event', 'Interaction']
              }
            },
            required: ["name", "description", "type"]
          }
        }
      },
      required: ["locationName", "summary", "catchablePokemon", "trainers", "items", "keyEvents"]
    };

  try {
    const response = await callGeminiProxy({
        model: GEMINI_MODEL_NAME,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: schema,
            temperature: 0.1,
            maxOutputTokens: 8192,
            thinkingConfig: { thinkingBudget: 4096 }
        }
    });

    const textOutput = response.text;

    if (typeof textOutput !== 'string') {
        let detailedErrorMsg = `AI response did not contain any text output for location "${locationName}" (Pokémon Scarlet & Violet).`;
        if (response.promptFeedback?.blockReason) {
            detailedErrorMsg = `AI request for "${locationName}" (Pokémon Scarlet & Violet) was blocked. Reason: ${response.promptFeedback.blockReason}. ${response.promptFeedback.blockReasonMessage || 'No additional message provided.'}`;
        } else if (response.candidates && response.candidates.length > 0) {
            const candidate = response.candidates[0];
            if (candidate.finishReason && candidate.finishReason !== 'STOP') {
                detailedErrorMsg = `AI generation for "${locationName}" (Pokémon Scarlet & Violet) stopped prematurely. Reason: ${candidate.finishReason}.`;
            }
        }
        throw new Error(detailedErrorMsg);
    }
    
    let jsonStr = textOutput.trim();
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[1]) {
      jsonStr = match[1].trim();
    }
    
    const parsedData = JSON.parse(jsonStr) as GeminiLocationResponse;
    
    if (typeof parsedData.locationName !== 'string' || 
        !Array.isArray(parsedData.catchablePokemon) || 
        !Array.isArray(parsedData.trainers) || 
        !Array.isArray(parsedData.items) || 
        !Array.isArray(parsedData.keyEvents)) {
        console.warn("Gemini response for location " + locationName + " (Pokémon Scarlet & Violet) is missing some expected top-level fields or they are of incorrect type.", parsedData);
    }
    
    const catchablePokemonProcessed: CatchablePokemonInfo[] = (parsedData.catchablePokemon || []).map(p => ({
      name: p.name || "Unknown Pokemon",
      pokemonId: p.pokemonId || 0,
      conditions: p.conditions || ""
    }));

    const processedDetails: DetailedLocationInfo = {
      locationId: `sv-${locationName.toLowerCase().replace(/\s+/g, '-').replace(/[()',.]/g, '')}`,
      locationName: parsedData.locationName || locationName, 
      summary: parsedData.summary || "",
      catchablePokemon: catchablePokemonProcessed,
      trainers: parsedData.trainers || [],
      items: parsedData.items || [],
      keyEvents: parsedData.keyEvents || [],
    };

    try {
      localStorage.setItem(cacheKey, JSON.stringify(processedDetails));
      console.log(`Gemini data for "Pokémon Scarlet & Violet - ${locationName}" cached.`);
    } catch (error) {
      console.warn(`Error saving Gemini cache for "Pokémon Scarlet & Violet - ${locationName}":`, error);
    }

    return processedDetails;

  } catch (error) {
    console.error(`Error processing Gemini API response for location "${locationName}" (Pokémon Scarlet & Violet):`, error);
    
    const errorMessage = error instanceof Error ? error.message : `An unknown error occurred.`;
    throw new Error(errorMessage);
  }
};

export const fetchNavigatorGuidanceFromGemini = async (userPrompt: string): Promise<string> => {
  const cacheKey = `${CACHE_PREFIX_NAVIGATOR}${userPrompt.toLowerCase().replace(/\s+/g, '_').substring(0, 100)}`;

  try {
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      console.log(`Serving Navigator guidance (Pokémon Scarlet & Violet) for prompt starting with "${userPrompt.substring(0, 50)}..." from cache.`);
      return JSON.parse(cachedData) as string;
    }
  } catch (error) {
    console.warn(`Error reading Navigator cache (Pokémon Scarlet & Violet) for prompt "${userPrompt.substring(0, 50)}...":`, error);
  }
  
  const systemInstruction = `
    You are an AI assistant for a Pokemon Nuzlocke challenge application, specifically for the game "Pokémon Scarlet and Violet".
    The user will ask a question related to their Nuzlocke run in "Pokémon Scarlet and Violet".
    Your goal is to provide helpful, concise, and informative answers that aid the player in their Nuzlocke challenge.
    
    Key Guidelines:
    1.  **Nuzlocke Focus:** Tailor your advice to the Nuzlocke ruleset (first encounter per area, permadeath).
    2.  **"Pokémon Scarlet and Violet" Specifics:** Ensure your information is accurate for "Pokémon Scarlet and Violet".
    3.  **Avoid Excessive Spoilers (if possible):** 
        *   When asked about a trainer's team (e.g., a Gym Leader, Rival), you can mention the primary Pokemon's type(s), its level, and perhaps one or two of its notable Pokemon or a key strategy.
        *   Do NOT list full teams with all movesets, abilities, and items unless the user explicitly asks for that extreme level of detail. Err on the side of less detailed spoilers if you have info.
        *   For general locations, focus on common encounters, important items, or general strategies rather than exhaustive lists.
    4.  **Conciseness:** Provide the necessary information without being overly verbose. Get to the point.
    5.  **Formatting:** Use clear language. You can use paragraphs. If listing items or Pokémon, you can use simple markdown lists like:
        *   Item 1
        *   Pokemon A
    6.  **Handling Off-Topic/Broad Questions:** If the question is too broad, or unrelated to Pokémon Nuzlockes, politely state that you can only assist with Nuzlocke-related queries for "Pokémon Scarlet and Violet".
    7.  **Output:** Respond with plain text. Do not wrap your response in JSON or markdown code fences.
    8.  **Output Formatting for Links:**
        *   When you mention a specific Pokémon name (e.g., Pikachu, Snorlax, Rowlet), please wrap it in double curly braces: \`{{PokemonName}}\`. For example, \`{{Pikachu}}\` or \`{{Rowlet}}\`.
        *   When you mention a specific game location from "Pokémon Scarlet and Violet" that players visit (e.g., Cortondo, Mesagoza, South Province (Area One)), please wrap it in double square brackets: \`[[LocationName]]\`. For example, \`[[Cortondo]]\` or \`[[South Province (Area One)]]\`.
  `;

  try {
    const response = await callGeminiProxy({
        model: GEMINI_MODEL_NAME,
        contents: userPrompt, // User's question is the main content
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.3, 
            topK: 40,
            topP: 0.95,
        }
    });
    
    const textOutput = response.text;

    if (typeof textOutput !== 'string' || textOutput.trim() === "") {
        let detailedErrorMsg = `AI response did not contain any text output for your query regarding Pokémon Scarlet & Violet.`;
         if (response.promptFeedback?.blockReason) {
            detailedErrorMsg = `Your query regarding Pokémon Scarlet & Violet was blocked. Reason: ${response.promptFeedback.blockReason}. ${response.promptFeedback.blockReasonMessage || 'No additional message provided.'}`;
        } else if (response.candidates && response.candidates.length > 0) {
            const candidate = response.candidates[0];
            if (candidate.finishReason && candidate.finishReason !== 'STOP') {
                detailedErrorMsg = `AI generation for your Pokémon Scarlet & Violet query stopped prematurely. Reason: ${candidate.finishReason}.`;
            }
        }
        throw new Error(detailedErrorMsg);
    }

    try {
      localStorage.setItem(cacheKey, JSON.stringify(textOutput));
      console.log(`Navigator guidance (Pokémon Scarlet & Violet) for prompt "${userPrompt.substring(0,50)}..." cached.`);
    } catch (error) {
      console.warn(`Error saving Navigator cache (Pokémon Scarlet & Violet) for prompt "${userPrompt.substring(0,50)}...":`, error);
    }

    return textOutput;

  } catch (error) {
    console.error(`Error processing Gemini API response for navigator prompt "${userPrompt.substring(0,50)}..." (Pokémon Scarlet & Violet):`, error);
    const errorMessage = error instanceof Error ? error.message : `An unknown error occurred.`;
    throw new Error(errorMessage);
  }
};

export const parseComplexGoalFromGemini = async (prompt: string): Promise<GeminiComplexGoalResponseItem[]> => {
    const systemInstruction = `
      You are an AI expert for Pokémon Scarlet and Violet. The user will provide a high-level goal.
      Your task is to break it down into a checklist of specific, actionable sub-goals.
      For each sub-goal that involves a specific Pokémon, you MUST provide its official English name and National Pokédex ID.
      Return the result as a JSON array of objects.
      - If a goal is about a specific Pokémon (e.g., 'Catch Eevee'), the object MUST contain 'goalText', 'pokemonName', and 'pokemonId'.
      - If a goal is a general task (e.g., 'Finish the main story'), the object should only contain 'goalText'.
      Examples:
      - User prompt: "catch all eeveelutions" -> Return JSON for Vaporeon, Jolteon, Flareon, etc., each with name and ID.
      - User prompt: "get all legendary pokemon" -> Return JSON for Koraidon, Miraidon, the treasures of ruin, etc., each with name and ID.
      If no specific Pokémon or tasks can be identified, return an empty array. Do not add any text outside the JSON.
    `;
    
    const schema = {
        type: Type.ARRAY,
        description: "A list of specific sub-goals derived from the user's high-level goal.",
        items: {
            type: Type.OBJECT,
            properties: {
                goalText: {
                    type: Type.STRING,
                    description: "The specific, actionable text for the sub-goal. E.g., 'Catch Zapdos' or 'Complete the Indigo Disk DLC'."
                },
                pokemonName: {
                    type: Type.STRING,
                    description: "The official English name of the Pokémon involved in the goal, if any. E.g., 'Zapdos'."
                },
                pokemonId: {
                    type: Type.NUMBER,
                    description: "The official National Pokédex ID of the Pokémon, if any. E.g., 145."
                }
            },
            required: ["goalText"]
        }
    };

    try {
        const response = await callGeminiProxy({
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
            throw new Error("The AI did not provide any details for your goal.");
        }

        const jsonStr = textOutput.trim();
        const parsedData = JSON.parse(jsonStr) as GeminiComplexGoalResponseItem[];
        return parsedData;

    } catch (error) {
        console.error(`Error processing Gemini API response for complex goal "${prompt}":`, error);
        let errorMessage = `Failed to get details from AI for your goal.`;
        if (error instanceof SyntaxError) {
             errorMessage = `The AI returned invalid data for your goal. Please try a different wording.`;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        throw new Error(errorMessage);
    }
};


export const fetchPokemonGenerationInsights = async (pokemonName: string): Promise<PokemonGenerationInsights> => {
    const cacheKey = `${CACHE_PREFIX_INSIGHTS}${pokemonName.toLowerCase().replace(/\s+/g, '_')}`;

    try {
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
            console.log(`Serving Generation 9 insights for "${pokemonName}" from cache.`);
            return JSON.parse(cachedData) as PokemonGenerationInsights;
        }
    } catch (error) {
        console.warn(`Error reading insights cache for "${pokemonName}":`, error);
    }
    
    const prompt = `Provide detailed insights about "${pokemonName}" in Pokémon Scarlet and Violet.`;
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            scarletVioletSummary: { 
                type: Type.STRING, 
                description: "A concise summary (2-3 sentences) of what's new or significant for this Pokémon in Scarlet and Violet. Mention any new evolutions (e.g., Dudunsparce), new forms (e.g., Paldean Tauros, Wiglett), or Paradox forms related to it. If there are no major changes, briefly state its role or a key characteristic in the Paldea region."
            },
            notableNewMoves: {
                type: Type.ARRAY,
                description: "An array of new or significant moves this Pokémon gained access to in Gen 9 (Scarlet/Violet), either by level-up, TM, or egg move.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: "The official name of the move." },
                        description: { type: Type.STRING, description: "A brief, one-sentence description of what the move does." }
                    },
                    required: ["name", "description"]
                }
            },
            availability: {
                type: Type.ARRAY,
                description: "An array detailing where to find this Pokémon in the Paldea region.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        area: { type: Type.STRING, description: "The name of the specific Province, Area, or notable location (e.g., 'South Province (Area One)', 'Glaseado Mountain'). Use 'Not available in Paldea' if it must be transferred." },
                        notes: { type: Type.STRING, description: "Brief notes on the encounter (e.g., 'Common in grassy areas', 'Rare spawn near ruins', 'Requires Pokémon HOME')." }
                    },
                    required: ["area", "notes"]
                }
            }
        },
        required: ["scarletVioletSummary", "notableNewMoves", "availability"]
    };

    try {
        const response = await callGeminiProxy({
            model: GEMINI_MODEL_NAME,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.1,
            }
        });

        const textOutput = response.text;
        if (typeof textOutput !== 'string' || textOutput.trim() === "") {
            throw new Error(`AI response did not contain text for Pokémon insights "${pokemonName}".`);
        }
        
        const parsedData = JSON.parse(textOutput) as GeminiPokemonInsightsResponse;

        const processedInsights: PokemonGenerationInsights = {
            pokemonName: pokemonName,
            ...parsedData
        };

        try {
            localStorage.setItem(cacheKey, JSON.stringify(processedInsights));
            console.log(`Generation 9 insights for "${pokemonName}" cached.`);
        } catch (error) {
            console.warn(`Error saving insights cache for "${pokemonName}":`, error);
        }

        return processedInsights;

    } catch (error) {
        console.error(`Error processing Gemini API response for Pokémon insights "${pokemonName}":`, error);
        const errorMessage = error instanceof Error ? error.message : `An unknown error occurred.`;
        throw new Error(errorMessage);
    }
};


export const fetchBattleStrategyFromGemini = async (battleNode: GameLocationNode): Promise<BattleStrategyDetails> => {
    const battleName = battleNode.significantBattleName;
    const locationName = battleNode.name;
    if (!battleName) throw new Error("Battle node is missing a significant battle name.");

    const cacheKey = `${CACHE_PREFIX_BATTLE}${battleNode.id}`;

    try {
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
            console.log(`Serving battle strategy for "${battleName}" from cache.`);
            return JSON.parse(cachedData) as BattleStrategyDetails;
        }
    } catch (error) {
        console.warn(`Error reading battle strategy cache for "${battleName}":`, error);
    }

    const prompt = `Provide a detailed battle strategy for the significant battle: "${battleName}" at location "${locationName}" in "Pokémon Scarlet and Violet" for a Nuzlocke run.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
          puzzleInformation: { type: Type.STRING, description: "The gym test, team star base challenge, or any required task before the main battle. If none, state that." },
          keyOpponentPokemon: {
              type: Type.ARRAY,
              description: "An array of 1-3 of the most important Pokémon the opponent uses.",
              items: {
                  type: Type.OBJECT,
                  properties: {
                      name: { type: Type.STRING, description: "The Pokémon's species name." },
                      typeInfo: { type: Type.STRING, description: "A string with the Pokémon's type(s) and, if applicable, its Tera Type (e.g., 'Bug/Flying', 'Normal, Tera Type: Bug')." },
                      notes: { type: Type.STRING, description: "A brief, critical note for a Nuzlocke player (e.g., 'This is their ace.', 'Has a powerful move like Hyper Voice.')." }
                  },
                  required: ["name", "typeInfo", "notes"]
              }
          },
          recommendedPokemonTypes: {
              type: Type.ARRAY,
              description: "An array of Pokémon types that are super-effective or strategically valuable for this fight.",
              items: { type: Type.STRING }
          },
          nuzlockeTips: {
              type: Type.STRING,
              description: "A string containing a few concise, bullet-point-style tips for this battle from a Nuzlocke perspective. Use markdown-style lists (e.g., '* Tip 1\\n* Tip 2'). You MUST wrap any Pokémon names in double curly braces like {{PokemonName}} and any location names in double square brackets like [[LocationName]]."
          }
      },
      required: ["puzzleInformation", "keyOpponentPokemon", "recommendedPokemonTypes", "nuzlockeTips"]
    };


  try {
        const response = await callGeminiProxy({
            model: GEMINI_MODEL_NAME,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.1,
                maxOutputTokens: 8192,
                thinkingConfig: { thinkingBudget: 4096 }
            }
        });

        const textOutput = response.text;

        if (typeof textOutput !== 'string') {
            throw new Error(`AI response did not contain text for battle "${battleName}".`);
        }

        let jsonStr = textOutput.trim();
        const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[1]) {
            jsonStr = match[1].trim();
        }

        const parsedData = JSON.parse(jsonStr) as GeminiBattleStrategyResponse;

        const processedDetails: BattleStrategyDetails = {
            battleId: battleNode.id,
            puzzleInformation: parsedData.puzzleInformation,
            keyOpponentPokemon: parsedData.keyOpponentPokemon,
            recommendedPokemonTypes: parsedData.recommendedPokemonTypes,
            nuzlockeTips: parsedData.nuzlockeTips,
        };

        try {
            localStorage.setItem(cacheKey, JSON.stringify(processedDetails));
            console.log(`Battle strategy for "${battleName}" cached.`);
        } catch (error) {
            console.warn(`Error saving battle strategy cache for "${battleName}":`, error);
        }

        return processedDetails;
    } catch (error) {
        console.error(`Error processing Gemini API response for battle "${battleName}":`, error);
        const errorMessage = error instanceof Error ? error.message : `An unknown error occurred.`;
        throw new Error(errorMessage);
    }
};

export const fetchChatContinuation = async (
  history: ChatMessage[],
  systemInstruction: string
): Promise<string> => {
  const contents = history.map(m => ({
    role: m.role,
    parts: [{ text: m.text }]
  }));

  try {
    const response = await callGeminiProxy({
      model: GEMINI_MODEL_NAME,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      }
    });
    
    const textOutput = response.text;
    if (typeof textOutput !== 'string' || textOutput.trim() === "") {
        throw new Error("The AI returned an empty response.");
    }
    return textOutput;
  } catch(error) {
      console.error('Error fetching chat continuation from proxy:', error);
      throw error;
  }
};

export const parseHuntIntentFromGemini = async (prompt: string): Promise<{ name: string; id: number }[]> => {
    const systemInstruction = `
        You are an expert Pokémon data extractor. The user will provide a sentence expressing their desire to hunt for certain Pokémon.
        Your task is to identify all Pokémon mentioned in the sentence and return them as a JSON array of objects.
        Each object must have a "name" (official English name) and an "id" (official National Pokédex number).
        For example, if the prompt is "I want to hunt for Pikachu and the Gen 1 starters", you should return:
        [{"name": "Bulbasaur", "id": 1}, {"name": "Charmander", "id": 4}, {"name": "Squirtle", "id": 7}, {"name": "Pikachu", "id": 25}]
        If you cannot identify any Pokémon, return an empty array. Do not add any text outside the JSON array.
    `;

    const schema = {
        type: Type.ARRAY,
        description: "A list of Pokémon objects identified from the user's prompt.",
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

    try {
        const response = await callGeminiProxy({
            model: GEMINI_MODEL_NAME,
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.0,
            }
        });

        const textOutput = response.text;
        
        if (typeof textOutput !== 'string' || textOutput.trim() === "") {
            console.warn("AI returned an empty response for hunt intent, returning empty array.");
            return [];
        }

        let jsonStr = textOutput.trim();
        const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[1]) {
            jsonStr = match[1].trim();
        }
        
        const pokemonList = JSON.parse(jsonStr) as { name: string; id: number }[];
        return pokemonList;

    } catch (error) {
        console.error("Error parsing hunt intent from Gemini:", error);
        let errorMessage = "Failed to parse hunt intent from AI.";
        if (error instanceof SyntaxError) {
             errorMessage = `The AI returned invalid data. Please try rephrasing your hunt request.`;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        throw new Error(errorMessage);
    }
};