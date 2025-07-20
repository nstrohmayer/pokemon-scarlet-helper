
# Run and deploy your AI Studio app

This contains everything you need to run your app locally and deploy it to a hosting service.

## Run Locally

**Prerequisites:**  Node.js and the [Netlify CLI](https://docs.netlify.com/cli/get-started/).

1.  Install dependencies:
    `npm install`
2.  Create a file named `.env` in the project root. This file will store your API key for local development.
3.  Add your Gemini API key to the `.env` file. The serverless function will access this key.
    `GEMINI_API_KEY=YOUR_ACTUAL_API_KEY`
    *(Note: The `VITE_` prefix is no longer used as the key is not exposed to the client-side code anymore.)*
4.  Run the app using the Netlify CLI, which will run the Vite dev server and the serverless function proxy:
    `netlify dev`

---

## Deploying Your App

When you deploy your site to Netlify, it will use the `netlify.toml` file to configure the build and deploy the serverless function.

You must configure the `GEMINI_API_KEY` environment variable directly on Netlify for the live application to work.

### Example: Deploying to Netlify

1.  Log in to your Netlify account and navigate to the dashboard for your site.
2.  Go to **Site configuration** > **Build & deploy** > **Environment** > **Environment variables**.
3.  Click **Add a variable**.
4.  Enter the key as `GEMINI_API_KEY`.
5.  Enter the value as your actual Gemini API key.
6.  Save the variable.
7.  Go to the **Deploys** tab and trigger a new deploy (e.g., "Deploy with latest branch commit"). Your site should now build and deploy with the API key securely configured on the backend.
