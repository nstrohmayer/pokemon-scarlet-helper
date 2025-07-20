import type { Handler } from "@netlify/functions";
import { GoogleGenAI, GenerateContentResponse, Type, Chat } from "@google/genai";
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
    GeminiPokemonInsightsResponse,
    ChatMessage
} from '../../types';
import { GEMINI_MODEL_NAME } from '../../constants';

// --- Re-implementing core logic from old geminiService.ts here on the server-side ---

let ai: GoogleGenAI | null = null;
const getGoogleGenAI = (): GoogleGenAI => {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable not configured for the serverless function.");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
};


const locationDetailsSchema = {
    type: Type.OBJECT,
    properties: {
        locationName: { type: Type.STRING, description: "The name of the location." },
        summary: { type: Type.STRING, description: "A brief summary of the location relevant to a Nuzlocke player." },
        catchablePokemon: {
            type: Type.ARRAY,
            description: "List of Pokémon that can be caught here.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "Name of the Pokémon." },
                    conditions: { type: Type.STRING, description: "Conditions to encounter (e.g., Tall Grass, Surfing, Day/Night)." }
                },
                required: ['name', 'conditions']
            }
        },
        trainers: {
            type: Type.ARRAY,
            description: "List of notable trainers in the area.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "Trainer's name." },
                    strongestPokemonName: { type: Type.STRING, description: "Name of their strongest Pokémon." },
                    strongestPokemonLevel: { type: Type.INTEGER, description: "Level of their strongest Pokémon." },
                    notes: { type: Type.STRING, description: "Any special notes about the trainer." }
                },
                required: ['name', 'strongestPokemonName', 'strongestPokemonLevel']
            }
        },
        items: {
            type: Type.ARRAY,
            description: "List of important items found here.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "Name of the item." },
                    locationDescription: { type: Type.STRING, description: "Where to find the item in the area." }
                },
                required: ['name', 'locationDescription']
            }
        },
        staticEncounters: {
            type: Type.ARRAY,
            description: "List of static or fixed Pokémon encounters.",
            items: {
                type: Type.OBJECT,
                properties: {
                    pokemonName: { type: Type.STRING, description: "Name of the Pokémon in the static encounter." },
                    level: { type: Type.INTEGER, description: "Level of the static encounter Pokémon." },
                    notes: { type: Type.STRING, description: "Notes about the encounter (e.g., 'Gift Pokémon')." }
                },
                required: ['pokemonName', 'level']
            }
        }
    },
    required: ['locationName', 'summary', 'catchablePokemon', 'trainers', 'items', 'staticEncounters']
};


// Each of these functions will be called by the handler based on the 'action'
const handleFetchLocationDetails = async (payload: any): Promise<DetailedLocationInfo> => {
  const { locationName } = payload;
  if (!locationName) throw new Error("locationName is required for fetchLocationDetails");
  const genAI = getGoogleGenAI();

  const prompt = `Provide detailed information about the game location "${locationName}" from "Pokémon Scarlet and Violet". Focus on data relevant to a Nuzlocke player.`;

    const response: GenerateContentResponse = await genAI.models.generateContent({
        model: GEMINI_MODEL_NAME,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: locationDetailsSchema,
            temperature: 0.1,
        }
    });

    const jsonStr = response.text.trim();
    if (!jsonStr) {
        throw new Error(`Gemini returned an empty response for location: ${locationName}`);
    }
    const parsedData = JSON.parse(jsonStr) as GeminiLocationResponse;

    const catchablePokemonProcessed: CatchablePokemonInfo[] = (parsedData.catchablePokemon || []).map(p => ({
      name: p.name || "Unknown Pokemon",
      conditions: p.conditions || ""
    }));

    return {
      locationId: `sv-${locationName.toLowerCase().replace(/\s+/g, '-').replace(/[()',.]/g, '')}`,
      locationName: parsedData.locationName || locationName, 
      summary: parsedData.summary || "",
      catchablePokemon: catchablePokemonProcessed,
      trainers: parsedData.trainers || [],
      items: parsedData.items || [],
      staticEncounters: parsedData.staticEncounters || [],
    };
};

const handleFetchNavigatorGuidance = async (payload: any): Promise<string> => {
    const { userPrompt } = payload;
    if (!userPrompt) throw new Error("userPrompt is required for fetchNavigatorGuidance");
    const genAI = getGoogleGenAI();
  
    const systemInstruction = `
    You are an AI assistant for a Pokemon Nuzlocke challenge application, specifically for the game "Pokémon Scarlet and Violet".
    Your goal is to provide helpful, concise, and informative answers that aid the player in their Nuzlocke challenge.
    Tailor advice to Nuzlocke rules. Be concise and accurate for "Pokémon Scarlet and Violet".
    When you mention a Pokémon name, wrap it in {{PokemonName}}.
    When you mention a game location, wrap it in [[LocationName]].
    Respond with plain text. Do not wrap your response in JSON or markdown code fences.`;

    const response: GenerateContentResponse = await genAI.models.generateContent({
        model: GEMINI_MODEL_NAME,
        contents: userPrompt,
        config: { systemInstruction, temperature: 0.3, topK: 40, topP: 0.95 }
    });
    
    return response.text;
};

const handleFetchPokemonGenerationInsights = async (payload: any): Promise<PokemonGenerationInsights> => {
    const { pokemonName } = payload;
    if (!pokemonName) throw new Error("pokemonName is required for fetchPokemonGenerationInsights");
    const genAI = getGoogleGenAI();
    
    const prompt = `Provide detailed insights about "${pokemonName}" in Pokémon Scarlet and Violet.`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            scarletVioletSummary: { type: Type.STRING, description: "A concise summary (2-3 sentences) of what's new or significant for this Pokémon in Scarlet and Violet." },
            notableNewMoves: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING } } } },
            availability: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { area: { type: Type.STRING }, notes: { type: Type.STRING } } } }
        },
        required: ["scarletVioletSummary", "notableNewMoves", "availability"]
    };

    const response = await genAI.models.generateContent({
        model: GEMINI_MODEL_NAME,
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.1 }
    });

    const parsedData = JSON.parse(response.text) as GeminiPokemonInsightsResponse;
    return { pokemonName, ...parsedData };
};


const battleStrategySchema = {
    type: Type.OBJECT,
    properties: {
        puzzleInformation: { type: Type.STRING, description: "Information about any gym puzzle or pre-battle challenge." },
        keyOpponentPokemon: {
            type: Type.ARRAY,
            description: "A list of the opponent's key Pokémon.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "Pokémon's name." },
                    typeInfo: { type: Type.STRING, description: "Pokémon's type, including Tera Type if applicable (e.g., 'Bug/Flying', 'Tera Type: Bug')." },
                    notes: { type: Type.STRING, description: "Important notes like key moves, abilities, or held items." }
                },
                required: ['name', 'typeInfo', 'notes']
            }
        },
        recommendedPokemonTypes: {
            type: Type.ARRAY,
            description: "A list of Pokémon types that are effective in this battle.",
            items: { type: Type.STRING }
        },
        nuzlockeTips: { type: Type.STRING, description: "Overall strategy and tips for a Nuzlocke run. In this string, wrap Pokémon names in {{...}} and location names in [[...]] for the frontend to parse." }
    },
    required: ['puzzleInformation', 'keyOpponentPokemon', 'recommendedPokemonTypes', 'nuzlockeTips']
};


const handleFetchBattleStrategy = async (payload: any): Promise<BattleStrategyDetails> => {
    const { battleNode } = payload;
    if (!battleNode?.significantBattleName || !battleNode.id) throw new Error("A valid battleNode is required for fetchBattleStrategy");
    const genAI = getGoogleGenAI();
    
    const prompt = `Provide a detailed Nuzlocke battle strategy for the significant battle: "${battleNode.significantBattleName}" at location "${battleNode.name}" in "Pokémon Scarlet and Violet".`;

    const response = await genAI.models.generateContent({
        model: GEMINI_MODEL_NAME,
        contents: prompt,
        config: { 
            responseMimeType: "application/json",
            responseSchema: battleStrategySchema,
            temperature: 0.1
        }
    });
    const jsonStr = response.text.trim();
    if (!jsonStr) {
        throw new Error(`Gemini returned an empty response for battle: ${battleNode.significantBattleName}`);
    }
    const parsedData = JSON.parse(jsonStr) as GeminiBattleStrategyResponse;
    return { battleId: battleNode.id, ...parsedData };
};

const handleSendChatMessage = async (payload: any): Promise<string> => {
    const { message, history, context } = payload;
    if (!message || !history || !context) throw new Error("Message, history, and context are required for sendChatMessage");
    const genAI = getGoogleGenAI();

    const systemInstruction = `
        You are an AI assistant for a Pokemon Nuzlocke challenge application, for the game "Pokémon Scarlet and Violet". You are the "Story Helper".
        Your goal is to give the player helpful, actionable advice based on their current situation.
        All advice must be relevant to a Nuzlocke run. Be concise and actionable.
        Use simple markdown lists. When you mention a Pokémon name, wrap it in {{PokemonName}}. When you mention a game location, wrap it in [[LocationName]].
        Respond ONLY with plain text advice. Do not add introductions or wrap your response in JSON/markdown code fences.
    `;
    
    const chat: Chat = genAI.chats.create({
        model: GEMINI_MODEL_NAME,
        config: { systemInstruction },
        history: history.map((m: ChatMessage) => ({ role: m.role, parts: [{ text: m.text }] }))
    });

    let contextPrompt = "My current game status:\n";
    contextPrompt += `* Current Location: ${context.currentLocation?.name || 'Not specified'}\n`;
    if (context.nextBattle.name && context.nextBattle.location && context.nextBattle.level) {
        contextPrompt += `* Next Major Battle: ${context.nextBattle.name} in [[${context.nextBattle.location}]] (Level Cap: ${context.nextBattle.level})\n`;
    }
    if (context.team.length > 0) {
        contextPrompt += `* Current Team: ${context.team.map((m: TeamMember) => `{{${m.species}}} (Lvl ${m.level})`).join(', ')}\n`;
    }
    contextPrompt += `\nMy question is: ${message}`;
    
    const response = await chat.sendMessage({ message: contextPrompt });
    return response.text;
};


// --- Main Handler ---
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { action, payload } = JSON.parse(event.body || '{}');

    let responseData;
    switch (action) {
      case 'fetchLocationDetails':
        responseData = await handleFetchLocationDetails(payload);
        break;
      case 'fetchNavigatorGuidance':
        responseData = await handleFetchNavigatorGuidance(payload);
        break;
      case 'fetchPokemonGenerationInsights':
        responseData = await handleFetchPokemonGenerationInsights(payload);
        break;
      case 'fetchBattleStrategy':
        responseData = await handleFetchBattleStrategy(payload);
        break;
      case 'sendChatMessage':
          responseData = await handleSendChatMessage(payload);
          break;
      // 'fetchGoalDetailsFromGemini' is not implemented as it was small and can be part of a larger action if needed.
      // If needed, it would be added here.
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(responseData),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    console.error("Error in gemini-proxy function:", errorMessage);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: errorMessage }),
    };
  }
};