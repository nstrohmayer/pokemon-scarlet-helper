
import { defineConfig } from 'vite';

export default defineConfig({
  // The 'define' block that exposed the API key is removed.
  // All API calls will now be proxied through a Netlify function to keep the key secure.
});
