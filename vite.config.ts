
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'url';

// Define __dirname for ES module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    // Load environment variables from the project root
    const env = loadEnv(mode, __dirname, '');
    const viteApiKey = env.VITE_GEMINI_API_KEY || ""; // Default to empty string if undefined

    return {
      define: {
        'process.env.API_KEY': JSON.stringify(viteApiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(viteApiKey)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});