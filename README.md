## JS Online Compiler – Rooms + Admin Problems

This project is a simple in-browser JavaScript playground with Rooms and an optional Admin workflow to create algorithm problems. Each Room can include:

- Metadata (name, group, author)
- Problem definition (title, description, difficulty, function name, starter code)
- Test cases to validate solutions

Users can write code in the browser and run it locally. They can also run tests (submitted to the server) which are executed in a small Node.js sandbox.

### Run Locally

Prerequisites: Node.js

1. Install dependencies
   - `npm install`
2. Configure Gemini API (for AI Hints feature)
   - Get your API key from [Google AI Studio](https://ai.google.dev/)
   - Create a `.env` file in the project root
   - Add: `GEMINI_API_KEY=your_actual_api_key_here`
3. Start both client and server
   - `npm run dev`

The server runs on http://localhost:4000 and the client on http://localhost:5173 by default.

### AI Hint Feature

The project now includes an AI-powered hint system using Google's Gemini API:

- Click the "💡 Get AI Hint" button in any problem to receive intelligent guidance
- The AI analyzes the problem description and your current code
- Provides helpful hints without giving away the complete solution
- Requires `GEMINI_API_KEY` in `.env` file to work

**To set up:**
1. Visit [Google AI Studio](https://ai.google.dev/)
2. Sign in with your Google account
3. Click "Get API Key" and create a new key
4. Copy the key to your `.env` file

### Admin setup

- By default, if no admin is set in `server/data/users.json`, the first user in that file is treated as a temporary admin (bootstrap) and can create Rooms.
- Alternatively, set the environment variable `ADMIN_EMAILS` (comma-separated emails) when starting the server. Matching accounts will be treated as admins.
  - Example (PowerShell):
    - `$env:ADMIN_EMAILS="admin@example.com,test@test"; npm run dev`

Only admins see the “CREATE” button on the Rooms page and can create rooms with problem definitions and test cases.

### Problem contract (JavaScript)

- The problem must specify a `functionName` (default `solve`). The user’s code should define this function.
- Tests are an array of objects with `input` and `output`. `input` can be a single value or an array (mapped to function positional arguments). The server will execute:
  - `result = solve(...inputArray)` and compare with `output` using deep JSON equality.

### Notes

- This is an educational/demo project. The server sandbox uses Node’s `vm` module and is not hardened for untrusted code in production.
