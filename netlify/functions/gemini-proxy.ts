import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse } from "@google/genai";
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

interface ProxyRequest {
    params: GenerateContentParameters;
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Gemini API key is not configured on the server.' }),
        };
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        const body: ProxyRequest = JSON.parse(event.body || '{}');

        if (!body.params) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing "params" in request body.' }),
            };
        }

        const response: GenerateContentResponse = await ai.models.generateContent(body.params);
        
        const serializableResponse = {
            text: response.text, // This calls the getter
            candidates: response.candidates,
            promptFeedback: response.promptFeedback,
        };

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(serializableResponse),
        };
    } catch (e) {
        const error = e as Error;
        console.error('Error in Gemini proxy:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};

export { handler };
