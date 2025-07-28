
# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:** Node.js, Netlify CLI

1.  Install dependencies:
    `npm install`
2.  Install Netlify CLI globally if you haven't already:
    `npm install -g netlify-cli`
3.  Set the `GEMINI_API_KEY` in an `.env` file in the project root to your Gemini API key. This key will be used by the backend proxy and will not be exposed to the client. For example:
    `GEMINI_API_KEY=YOUR_ACTUAL_API_KEY`
4.  Log in to your Netlify account:
    `netlify login`
5.  Run the app:
    `npm run dev` (This will launch the site and proxy functions together).
