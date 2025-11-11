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

- The system now supports two user roles: **Professor** and **Student**
- **Default Professor Account:**
  - Email: `owner@owner`
  - Password: `owner`
  - This account is automatically created with professor privileges
  
- **Professor Privileges:**
  1. Can create new Rooms (groups)
  2. Can invite students to their Rooms
  3. Can create problems within their Rooms
  4. Has full control over their Rooms

- **Student Privileges:**
  1. Can join Rooms they are invited to
  2. Can view and solve problems
  3. Cannot create Rooms or problems

- Alternatively, set the environment variable `ADMIN_EMAILS` (comma-separated emails) when starting the server. Matching accounts will be treated as admins.
  - Example (PowerShell):
    - `$env:ADMIN_EMAILS="admin@example.com,test@test"; npm run dev`

### Using the Professor Features

1. **Login as Professor:**
   - Use `owner@owner` / `owner` or create an account with this email
   
2. **Create a Room:**
   - Click the "CREATE" button on the Rooms page (only visible to professors)
   - Fill in room details (name, group, author, etc.)

3. **Invite Members:**
   - Open your created Room
   - Click "멤버 초대" (Invite Members) button
   - Select students from the dropdown
   - Students will now have access to the Room and its problems

4. **Create Problems:**
   - Inside your Room, click "CREATE PROBLEM"
   - Define the problem with title, description, test cases, etc.

### Problem contract (JavaScript)

- The problem must specify a `functionName` (default `solve`). The user’s code should define this function.
- Tests are an array of objects with `input` and `output`. `input` can be a single value or an array (mapped to function positional arguments). The server will execute:
  - `result = solve(...inputArray)` and compare with `output` using deep JSON equality.

### Notes

- This is an educational/demo project. The server sandbox uses Node’s `vm` module and is not hardened for untrusted code in production.
