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


// Each of these functions will be called by the handler based on the 'action'
const handleFetchLocationDetails = async (payload: any): Promise<DetailedLocationInfo> => {
  const { locationName } = payload;
  if (!locationName) throw new Error("locationName is required for fetchLocationDetails");
  const genAI = getGoogleGenAI();

  const prompt = `
    You are an AI assistant for a Pokemon Nuzlocke challenge application.
    Your task is to provide detailed information about the game location "${locationName}" from the game "Pokémon Scarlet and Violet".
    CRITICALLY IMPORTANT: Respond ONLY with a single, valid JSON object. ALL property names must be in double quotes. Ensure no trailing commas.
    The entire response MUST be parseable by JSON.parse(). Do NOT include any text or markdown formatting around the JSON object.
    The JSON object must conform to the following structure:
    {
      "locationName": "string", "summary": "string", "catchablePokemon": [{"name": "string", "conditions": "string"}],
      "trainers": [{"name": "string", "strongestPokemonName": "string", "strongestPokemonLevel": "number", "notes": "string"}],
      "items": [{"name": "string", "locationDescription": "string"}],
      "staticEncounters": [{"pokemonName": "string", "level": "number", "notes": "string"}]
    }
    For empty fields, use "" for strings or [] for arrays. Do not omit keys. Provide data for "Pokémon Scarlet and Violet".`;

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

    const jsonStr = response.text.trim();
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

const handleFetchBattleStrategy = async (payload: any): Promise<BattleStrategyDetails> => {
    const { battleNode } = payload;
    if (!battleNode?.significantBattleName || !battleNode.id) throw new Error("A valid battleNode is required for fetchBattleStrategy");
    const genAI = getGoogleGenAI();
    
    const prompt = `
    Provide a detailed battle strategy for the significant battle: "${battleNode.significantBattleName}" at location "${battleNode.name}" in "Pokémon Scarlet and Violet".
    Respond ONLY with a single, valid JSON object with all keys double-quoted. Do not include extra text.
    Use this structure:
    {
      "puzzleInformation": "string",
      "keyOpponentPokemon": [{"name": "string", "typeInfo": "string", "notes": "string"}],
      "recommendedPokemonTypes": ["string"],
      "nuzlockeTips": "string"
    }
    In nuzlockeTips, wrap Pokémon names in {{...}} and locations in [[...]].`;

    const response = await genAI.models.generateContent({
        model: GEMINI_MODEL_NAME,
        contents: prompt,
        config: { responseMimeType: "application/json", temperature: 0.1, maxOutputTokens: 8192, thinkingConfig: { thinkingBudget: 4096 } }
    });
    const parsedData = JSON.parse(response.text) as GeminiBattleStrategyResponse;
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
