import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse } from "@google/genai";
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

interface ProxyRequest {
    params: GenerateContentParameters;
}

const PROXY_TIMEOUT_MS = 9000; // 9 seconds, must be less than client-side and default Netlify function timeout

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

        const generateContentPromise = ai.models.generateContent(body.params);
        
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('AI request timed out on the server.')), PROXY_TIMEOUT_MS)
        );

        // Race the API call against our timeout
        const response = await Promise.race([
            generateContentPromise,
            timeoutPromise
        ]) as GenerateContentResponse;
        
        // Manually construct a plain object to ensure serialization is safe and lean.
        const serializableResponse = {
            text: response.text, // The getter is called here, result is a string
            candidates: response.candidates?.map(c => ({
                finishReason: c.finishReason,
                finishMessage: c.finishMessage,
            })),
            promptFeedback: response.promptFeedback ? {
                blockReason: response.promptFeedback.blockReason,
                blockReasonMessage: response.promptFeedback.blockReasonMessage,
            } : undefined,
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