
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { 
    DetailedLocationInfo, 
    GeminiLocationResponse, 
    CatchablePokemonInfo, 
    TeamMember, 
    StoryGoal, 
    GameLocationNode, 
    GeminiGoalResponse, 
    BattleStrategyDetails, 
    GeminiBattleStrategyResponse,
    PokemonGenerationInsights,
    GeminiPokemonInsightsResponse
} from '../types';
import { GEMINI_MODEL_NAME } from '../constants';

let ai: GoogleGenAI | null = null;
const CACHE_PREFIX_GEMINI = "gemini_cache_sv_";
const CACHE_PREFIX_NAVIGATOR = "gemini_navigator_cache_sv_";
const CACHE_PREFIX_BATTLE = "gemini_battle_cache_sv_";
const CACHE_PREFIX_INSIGHTS = "gemini_insights_sv_";

const getGoogleGenAI = (): GoogleGenAI => {
  if (!ai) {
    const apiKey = process.env.API_KEY;
    if (!apiKey) { // This will be true if API_KEY is an empty string (or null/undefined)
      throw new Error("Gemini API Key (process.env.API_KEY) is not configured. This is typically set via the VITE_GEMINI_API_KEY environment variable during the build process. Please ensure it's correctly set in your .env file or deployment environment variables.");
    }
    ai = new GoogleGenAI({ apiKey: apiKey });
  }
  return ai;
};

export const fetchLocationDetailsFromGemini = async (locationName: string): Promise<DetailedLocationInfo> => {
  const genAI = getGoogleGenAI();
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

  const prompt = `
    You are an AI assistant for a Pokemon Nuzlocke challenge application.
    Your task is to provide detailed information about the game location "${locationName}" from the game "Pokémon Scarlet and Violet".

    CRITICALLY IMPORTANT: Respond ONLY with a single, valid JSON object.
    - THE MOST IMPORTANT RULE: ALL property names (keys) in the JSON object MUST be enclosed in double quotes. For example, write {"myKey": "myValue"}, NOT {myKey: "myValue"}.
    - COMMA PLACEMENT IS ABSOLUTELY CRITICAL FOR VALID JSON:
        - A comma MUST separate each key-value pair within an object (e.g., {"key1": "value1", "key2": "value2"}).
        - A comma MUST separate each item in an array (e.g., ["item1", "item2"], or [{"objKey": "objVal1"}, {"objKey": "objVal2"}]).
        - DO NOT use a comma after the last key-value pair in an object, or after the last item in an array (no trailing commas).
    - Do NOT include any introductory text, explanations, apologies, or markdown formatting (like \`\`\`json) surrounding the JSON object itself.
    - The entire response MUST be parseable by JSON.parse().
    - All string values within the JSON must be properly escaped. For example, any double quotes (") within a string value must be escaped as \\". Newline characters (\\n) or other special characters within strings must also be correctly escaped to ensure JSON validity.

    The JSON object must conform to the following structure:
    {
      "locationName": "string",
      "summary": "string",
      "catchablePokemon": [
        {
          "name": "string",
          "conditions": "string" 
        }
      ],
      "trainers": [
        {
          "name": "string",
          "strongestPokemonName": "string",
          "strongestPokemonLevel": "number",
          "notes": "string"
        }
      ],
      "items": [
        {
          "name": "string",
          "locationDescription": "string"
        }
      ],
      "staticEncounters": [
        {
          "pokemonName": "string",
          "level": "number",
          "notes": "string"
        }
      ]
    }

    Detailed instructions for each field (relative to "Pokémon Scarlet and Violet"):
    - "locationName": string (The confirmed name of the location in Pokémon Scarlet and Violet, e.g., "South Province (Area One)")
    - "summary": string (A brief 1-2 sentence Nuzlocke-relevant summary of the location in Pokémon Scarlet and Violet. Mention key events or purpose if applicable.)
    - "catchablePokemon": Array of objects. Each object must have:
        - "name": string (Name of the Pokemon species found in Pokémon Scarlet and Violet)
        - "conditions": string (Specific encounter conditions in Pokémon Scarlet and Violet, e.g., "Day only", "Night only", "Outbreaks", "Tera Pokémon". If it's a standard encounter in the main area, use "Standard encounter" or an empty string.)
    - "trainers": Array of objects, where each object has (for trainers in Pokémon Scarlet and Violet):
        - "name": string (Trainer's class and name, e.g., "Student Gema", "Backpacker Adrian")
        - "strongestPokemonName": string (The name of their highest level or most threatening Pokemon)
        - "strongestPokemonLevel": number (The level of that Pokemon)
        - "notes": string (Optional: Brief notes like "Key Rival Battle", "May use a Potion")
    - "items": Array of objects, where each object has (for items in Pokémon Scarlet and Violet):
        - "name": string (Item name, e.g., "Potion", "TM Name")
        - "locationDescription": string (How/where to find it, e.g., "On the ground near the great tree", "Given by NPC after battle")
    - "staticEncounters": Array of objects, where each object has (for static encounters in Pokémon Scarlet and Violet):
        - "pokemonName": string (Name of the Pokemon in a static encounter, e.g., "Starter Pokemon Choice", "Gimmighoul (Chest Form)")
        - "level": number
        - "notes": string (Optional: e.g., "Blocks path", "Tera Type: Flying", "Must interact with the watchtower")

    If specific information for a field is not applicable or not available for "${locationName}" in "Pokémon Scarlet and Violet":
    - For string fields (like "summary", "notes", or "conditions" within "catchablePokemon"): use an empty string "".
    - For array fields (like "trainers", "items", "staticEncounters"): use an empty array [].
    - For the "catchablePokemon" array: if no Pokemon are catchable, use an empty array [].
    Do NOT omit any keys from the top-level JSON object or from the objects within the arrays. The full structure must always be present.

    Examples for Array Fields (ensure your output matches this structure and quoting, paying CLOSE attention to commas):
    - "catchablePokemon": [
        { "name": "Lechonk", "conditions": "Standard encounter" },
        { "name": "Fidough", "conditions": "Standard encounter" }
      ]
    - "trainers": [
        { "name": "Student Gema", "strongestPokemonName": "Lechonk", "strongestPokemonLevel": 4, "notes": "" }
      ]
    - "items": [
        { "name": "Potion", "locationDescription": "Found in the tall grass near the sign." },
        { "name": "Pokeball", "locationDescription": "Given by Nemona." }
      ]
    - "staticEncounters": [
        { "pokemonName": "Starter Pokemon Choice", "level": 5, "notes": "Choose between Sprigatito, Fuecoco, or Quaxly." }
      ]

    Before finalizing your response, please mentally double-check the comma placement in all arrays and objects to ensure perfect JSON syntax.

    Now, provide the JSON data for the location: "${locationName}" in the game "Pokémon Scarlet and Violet".
  `;

  try {
    const response: GenerateContentResponse = await genAI.models.generateContent({
        model: GEMINI_MODEL_NAME,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            temperature: 0.1,
            maxOutputTokens: 8192,
            thinkingConfig: { thinkingBudget: 4096 },
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
                if (candidate.finishReason === 'MAX_TOKENS' || candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
                    console.error("Full AI response when generation stopped prematurely:", JSON.stringify(response, null, 2));
                }
            } else if (candidate.safetyRatings && candidate.safetyRatings.some(r => r.blocked)) {
                detailedErrorMsg = `AI response for "${locationName}" (Pokémon Scarlet & Violet) might have been blocked by safety filters.`;
            }
        }
        if (!detailedErrorMsg.includes("Full AI response")) {
             console.error("Full AI response when text was missing or invalid:", JSON.stringify(response, null, 2));
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
        !Array.isArray(parsedData.staticEncounters)) {
        console.warn("Gemini response for location " + locationName + " (Pokémon Scarlet & Violet) is missing some expected top-level fields or they are of incorrect type.", parsedData);
    }
    
    const catchablePokemonProcessed: CatchablePokemonInfo[] = (parsedData.catchablePokemon || []).map(p => ({
      name: p.name || "Unknown Pokemon",
      conditions: p.conditions || ""
    }));

    const processedDetails: DetailedLocationInfo = {
      locationId: `sv-${locationName.toLowerCase().replace(/\s+/g, '-').replace(/[()',.]/g, '')}`,
      locationName: parsedData.locationName || locationName, 
      summary: parsedData.summary || "",
      catchablePokemon: catchablePokemonProcessed,
      trainers: parsedData.trainers || [],
      items: parsedData.items || [],
      staticEncounters: parsedData.staticEncounters || [],
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
    
    let errorMessage = `Failed to get details from AI for ${locationName} (Pokémon Scarlet & Violet).`;
    if (error instanceof SyntaxError) {
        errorMessage = `The AI returned malformed data for ${locationName} (Pokémon Scarlet & Violet) that could not be parsed as JSON. (Details: ${error.message})`;
    } else if (error instanceof Error) {
        let apiError;
        try {
          apiError = JSON.parse(error.message);
        } catch (e) {
          // Not a JSON error message, proceed.
        }

        if (apiError && apiError.error && apiError.error.message) {
          errorMessage = `API Error for ${locationName}: ${apiError.error.message} (Status: ${apiError.error.status || 'Unknown'})`;
          if (apiError.error.code === 404) {
            errorMessage += `. This might be due to an incorrect model name or API configuration.`
          }
        } else {
          errorMessage = error.message.startsWith("AI response") || error.message.startsWith("AI request") || error.message.startsWith("AI generation") || error.message.startsWith("Gemini API Key")
              ? error.message
              : `Error fetching details for ${locationName} (Pokémon Scarlet & Violet) from AI: ${error.message}`;
        }
    }
    throw new Error(errorMessage);
  }
};

export const fetchNavigatorGuidanceFromGemini = async (userPrompt: string): Promise<string> => {
  const genAI = getGoogleGenAI();
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
    const response: GenerateContentResponse = await genAI.models.generateContent({
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
            } else if (candidate.safetyRatings && candidate.safetyRatings.some(r => r.blocked)) {
                detailedErrorMsg = `AI response for your Pokémon Scarlet & Violet query might have been blocked by safety filters.`;
            }
        }
        console.error("Full AI response when text was missing for navigator (Pokémon Scarlet & Violet):", JSON.stringify(response, null, 2));
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
    
    let errorMessage = `Failed to get guidance from AI for Pokémon Scarlet & Violet.`;
    if (error instanceof Error) {
        let apiError;
        try {
          apiError = JSON.parse(error.message);
        } catch(e) { /* not a json error message */ }

        if (apiError && apiError.error && apiError.error.message) {
            errorMessage = `API Error during navigation: ${apiError.error.message} (Status: ${apiError.error.status || 'Unknown'})`;
            if (apiError.error.code === 404) {
              errorMessage += `. This might be due to an incorrect model name or API configuration.`
            }
        } else {
             errorMessage = error.message.startsWith("AI response") || error.message.startsWith("Your query regarding Pokémon Scarlet & Violet was blocked") || error.message.startsWith("AI generation") || error.message.startsWith("Gemini API Key")
                ? error.message
                : `Error fetching guidance from AI for Pokémon Scarlet & Violet: ${error.message}`;
        }
    }
    throw new Error(errorMessage);
  }
};


export const fetchGoalDetailsFromGemini = async (
  goalText: string,
  team: TeamMember[],
  currentLocation: GameLocationNode | null,
  nextBattle: { name:string | null; location: string | null; level: number | null }
): Promise<GeminiGoalResponse> => {
    const genAI = getGoogleGenAI();

    let gameContext = `Current Location: ${currentLocation?.name || 'Not specified'}.`;
    if (nextBattle.name && nextBattle.location && nextBattle.level) {
        gameContext += ` Next Major Battle: ${nextBattle.name} in ${nextBattle.location} (Lvl Cap: ${nextBattle.level}).`;
    }
    if (team.length > 0) {
        gameContext += ` Current Team: ${team.map(m => `${m.species} (Lvl ${m.level})`).join(', ')}.`;
    }

    const systemInstruction = `
        You are an AI expert for the game "Pokémon Scarlet and Violet".
        Your task is to analyze a user's custom goal for their Nuzlocke run and provide structured, helpful data about it.
        The user's current game context is: ${gameContext}.
        
        Based on the user's goal, provide the following details in a JSON object.
        - A refined, more descriptive title for the goal.
        - The relevant level cap for this goal.
        - The number of Pokémon the main opponent in this goal has. If not a battle, use 0.
        - A short, helpful strategic note for a Nuzlocke player.

        Example:
        User Goal: "beat cortondo gym"
        Your JSON output (for the Cortondo gym):
        {
            "refinedGoalText": "Defeat Gym Leader Katy",
            "level": 15,
            "pokemonCount": 4,
            "notes": "Katy uses Bug-types. A Fire or Flying type like Fletchling would be super effective. Watch out for her Tera Bug Teddiursa."
        }

        If the goal is vague (e.g., "get stronger"), provide a reasonable objective based on the game context, like grinding for the next battle.
        If a goal is "Catch a Water-type", you can set level to current level cap, pokemonCount to 1, and notes on where to find one.
        Always return a valid JSON object matching the schema. Do not add any text outside the JSON.
    `;
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            refinedGoalText: { type: Type.STRING, description: "A refined, more descriptive title for the goal." },
            level: { type: Type.NUMBER, description: "The recommended level cap for this goal. Use 0 if not applicable." },
            pokemonCount: { type: Type.NUMBER, description: "Number of opponent Pokémon. Use 0 if not a battle." },
            notes: { type: Type.STRING, description: "A short, helpful strategic note for a Nuzlocke player." }
        },
        required: ["refinedGoalText", "level", "pokemonCount", "notes"]
    };

    try {
        const response: GenerateContentResponse = await genAI.models.generateContent({
            model: GEMINI_MODEL_NAME,
            contents: `My goal is: "${goalText}"`,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.2
            }
        });

        const textOutput = response.text;
        
        if (typeof textOutput !== 'string' || textOutput.trim() === "") {
             let detailedErrorMsg = `The AI did not provide any details for your goal.`;
             if (response.promptFeedback?.blockReason) {
                detailedErrorMsg = `Your request for goal details was blocked. Reason: ${response.promptFeedback.blockReason}. ${response.promptFeedback.blockReasonMessage || 'No additional message provided.'}`;
            }
            console.error("Full AI response when goal detail text was missing:", JSON.stringify(response, null, 2));
            throw new Error(detailedErrorMsg);
        }

        const jsonStr = textOutput.trim();
        const parsedData = JSON.parse(jsonStr) as GeminiGoalResponse;
        
        return parsedData;

    } catch (error) {
        console.error(`Error processing Gemini API response for custom goal "${goalText}":`, error);
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
    const genAI = getGoogleGenAI();
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
        const response = await genAI.models.generateContent({
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
        let errorMessage = `Failed to get insights from AI for ${pokemonName}.`;
        if (error instanceof SyntaxError) {
            errorMessage = `The AI returned malformed data for ${pokemonName}. (Details: ${error.message})`;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        throw new Error(errorMessage);
    }
};


export const fetchBattleStrategyFromGemini = async (battleNode: GameLocationNode): Promise<BattleStrategyDetails> => {
    const genAI = getGoogleGenAI();
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

    const prompt = `
    You are an AI expert for a Pokemon Nuzlocke challenge application, specifically for "Pokémon Scarlet and Violet".
    Provide a detailed battle strategy for the following significant battle:
    - Battle: "${battleName}"
    - Location: "${locationName}"

    CRITICALLY IMPORTANT: Respond ONLY with a single, valid JSON object, with ALL property names in double quotes. Do NOT include any text, explanations, or markdown formatting (like \`\`\`json) outside of the JSON object itself. The entire response must be parsable by JSON.parse(). Ensure there are no trailing commas.

    The JSON object must conform to this exact structure:
    {
      "puzzleInformation": "string",
      "keyOpponentPokemon": [
        {
          "name": "string",
          "typeInfo": "string",
          "notes": "string"
        }
      ],
      "recommendedPokemonTypes": ["string"],
      "nuzlockeTips": "string"
    }

    Instructions for each field:
    - "puzzleInformation": A description of the gym test, team star base challenge, or any required task before the main battle. If none, state that.
    - "keyOpponentPokemon": An array of 1-3 of the most important Pokémon the opponent uses. For each:
        - "name": The Pokémon's species name.
        - "typeInfo": A string with the Pokémon's type(s) and, if applicable, its Tera Type (e.g., "Bug/Flying", "Normal, Tera Type: Bug").
        - "notes": A brief, critical note for a Nuzlocke player (e.g., "This is their ace.", "Has a powerful move like Hyper Voice.", "Sets up with...").
    - "recommendedPokemonTypes": An array of Pokémon types that are super-effective or strategically valuable for this fight.
    - "nuzlockeTips": A string containing a few concise, bullet-point-style tips for this battle from a Nuzlocke perspective. Use markdown-style lists (e.g., "* Tip 1\\n* Tip 2"). You MUST wrap any Pokémon names in double curly braces like {{PokemonName}} and any location names in double square brackets like [[LocationName]]. This is for frontend linking.

    Example for Cortondo Gym:
    {
      "puzzleInformation": "The Cortondo Gym Test is the Olive Roll. You must roll a giant olive through a maze to a goal. It's a simple physics puzzle with no battling involved.",
      "keyOpponentPokemon": [
        { "name": "Teddiursa", "typeInfo": "Normal, Tera Type: Bug", "notes": "This is Katy's ace and will Terastallize immediately. Its move Fury Cutter gets stronger with each consecutive hit." },
        { "name": "Nymble", "typeInfo": "Bug", "notes": "Very fast, can be surprisingly damaging if you're underleveled." }
      ],
      "recommendedPokemonTypes": ["Fire", "Flying", "Rock"],
      "nuzlockeTips": "* A {{Fletchling}} or {{Starly}} from [[South Province (Area Two)]] is an excellent counter.\\n* Be prepared for the Tera Bug {{Teddiursa}}; save your own Terastallization to counter it if needed.\\n* Bring some Antidotes as some of her Pokémon may have moves that can poison."
    }
    
    If information for a field is not available or applicable, use an empty string "" for string fields or an empty array [] for array fields. Do not omit any keys.
    
    Now, provide the JSON data for the battle: "${battleName}" at "${locationName}".
  `;

  try {
        const response: GenerateContentResponse = await genAI.models.generateContent({
            model: GEMINI_MODEL_NAME,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                temperature: 0.1,
                maxOutputTokens: 8192,
                thinkingConfig: { thinkingBudget: 4096 },
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
        let errorMessage = `Failed to get battle strategy from AI for ${battleName}.`;
        if (error instanceof SyntaxError) {
            errorMessage = `The AI returned malformed data for ${battleName}. (Details: ${error.message})`;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        throw new Error(errorMessage);
    }
};
