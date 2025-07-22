
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    // Load environment variables from the project root
    const env = loadEnv(mode, '.', '');
    const viteApiKey = env.VITE_GEMINI_API_KEY || ""; // Default to empty string if undefined

    return {
      define: {
        'process.env.API_KEY': JSON.stringify(viteApiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(viteApiKey)
      }
    };
});