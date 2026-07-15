# Session Summary: Surrounding.io Gamification & PASS Integration

## 🎯 Goal Objective
The core goal of this session was to introduce a gamified social experience to the surrounding.io proximity map. Instead of relying solely on proximity, we introduced a "Turf War" activity where users can capture photos of their surroundings, drop them as pins on the map, and receive a score based on the complexity and aesthetic value of the photo. Other users can then compete to beat that high score at the same location.

## 🧠 Architectural Decisions Made
1.  **AI Execution (Backend vs Client-Side):**
    *   **Decision:** **Backend Server** (Next.js API Routes).
    *   **Rationale:** We reviewed brainstorms from multiple AI models (Ollama, LMStudio, GPT4All). To save mobile battery and keep the stack clean without setting up a complex separate Python server, we decided to handle the AI processing via a Next.js server route (`/api/pass`).
2.  **Upload Experience (Zero Friction):**
    *   **Decision:** **Zero-Friction UI.**
    *   **Rationale:** We rejected a multi-step "Upload then click Generate Tags" approach. Instead, we used a native HTML file input (`<input type="file" capture="environment" />`). On mobile, tapping the button opens the native camera and *instantly* begins processing the photo upon capture, with zero extra clicks.
3.  **Naming Convention:**
    *   **Decision:** The scoring engine is officially named **PASS (Photo Analysis & Scoring System)**.

## 🛠️ What Was Built

### 1. The PASS Engine Backend (`/api/pass/route.ts`)
*   **The Math:** Implemented the core scoring algorithm: `Points = Weight × Confidence × Rarity Bonus`.
*   **Simulation:** Currently, the engine simulates an AI vision response (e.g., OpenAI or Google Vision) by generating mock tags with predefined weights, calculating the total score out of 100, and returning actionable "Pro-Tips".
*   **Future Proof:** It is ready to be swapped with a real API call (like `fetch('https://api.openai.com/v1/chat/completions')`) in the future.

### 2. Frontend Upload UX (`page.tsx`)
*   **Navigation Update:** Renamed the "Pins" bottom tab to **"Photo Pins"** with a new `MapPinned` icon.
*   **Gallery Overlay:** Clicking the tab opens a new glassmorphic bottom panel showing historical photo drops and a massive dashed **"+" PASS Drop** button.
*   **Scanning Animation:** When a photo is taken, a full-screen, futuristic "Radar Scanning" overlay takes over the map while the backend processes the image.

### 3. Reward Presentation & Modal (`page.tsx`)
*   **Scorecard:** Once the PASS Engine returns the result, a sleek Glassmorphic modal pops up showing the final Gamified Score (e.g., `87.5/100`), a color-coded cloud of the detected hashtags, and a contextual Pro-Tip.
*   **Integration:** A "Drop Photo Pin" button on the scorecard pushes the new pin data into the global `pins` state array.

### 4. Custom Map Rendering (`map.tsx`)
*   **Custom Marker:** Implemented `createPhotoPinIcon`, which replaces the standard text pin with a beautiful, hover-animated thumbnail of the uploaded photo overlaid with the high score.
*   **Interactive Popups:** Clicking a Photo Pin on the map opens a custom Leaflet popup revealing the full photo, the breakdown of the tags, and the high score that other users need to beat to steal the location.

## 🚀 Next Steps for Future Sessions
*   Swap the mock data in `/api/pass/route.ts` with a live call to a Vision AI (like OpenAI GPT-4o or Google Cloud Vision).
*   Connect the `pins` state to a persistent database (e.g., Supabase or MongoDB) so pins remain on the map across sessions.
*   Implement the "Turf War" logic to allow users to overwrite a pin if they achieve a higher PASS score at the same GPS coordinates.
