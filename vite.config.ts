
import path from 'path';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';

// Define __dirname for ES module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    return {
      // The 'define' block that exposed the API key to the client has been removed.
      // API calls are now handled by a serverless function proxy.
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});