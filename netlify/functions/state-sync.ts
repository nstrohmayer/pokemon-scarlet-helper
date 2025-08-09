import type { Handler, HandlerEvent } from "@netlify/functions";

// This is a simplified in-memory store. In a real-world serverless environment,
// this state would not persist across function invocations. A proper solution would
// use Netlify Blobs, Upstash, Vercel KV, or a similar persistent key-value store.
// For the purpose of this demonstration, we'll simulate persistence.
const stateStore = new Map<string, { state: AppState; expiresAt: number }>();

const ONE_HOUR_IN_MS = 60 * 60 * 1000;

interface AppState {
    [key: string]: string;
}

const generatePin = (): string => {
    let pin;
    do {
        pin = Math.floor(1000 + Math.random() * 9000).toString();
    } while (stateStore.has(pin)); // Ensure PIN is unique
    return pin;
};

const handler: Handler = async (event: HandlerEvent) => {
    // Clean up expired entries on every invocation
    const now = Date.now();
    for (const [pin, entry] of stateStore.entries()) {
        if (now > entry.expiresAt) {
            stateStore.delete(pin);
        }
    }

    if (event.httpMethod === 'POST') {
        try {
            const state: AppState = JSON.parse(event.body || '{}');
            if (Object.keys(state).length === 0) {
                return { statusCode: 400, body: JSON.stringify({ error: 'Cannot lock an empty state.' }) };
            }

            const pin = generatePin();
            const expiresAt = now + ONE_HOUR_IN_MS;
            stateStore.set(pin, { state, expiresAt });

            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin }),
            };
        } catch (e) {
            return { statusCode: 500, body: JSON.stringify({ error: 'Failed to process state data.' }) };
        }
    }

    if (event.httpMethod === 'GET') {
        const pin = event.queryStringParameters?.pin;
        if (!pin) {
            return { statusCode: 400, body: JSON.stringify({ error: 'PIN parameter is required.' }) };
        }

        const entry = stateStore.get(pin);
        if (!entry) {
            return { statusCode: 404, body: JSON.stringify({ error: 'Invalid or expired PIN.' }) };
        }

        // State is retrieved, so we delete it to make the PIN single-use
        stateStore.delete(pin);

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry.state),
        };
    }

    return {
        statusCode: 405,
        headers: { 'Allow': 'GET, POST' },
        body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
};

export { handler };
