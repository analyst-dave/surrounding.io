This is the entire project specification broken down into multiple Markdown files. By separating the concerns (Goals, Backend Logic, Frontend UI, Data Schemas), the development team can work on distinct components simultaneously.

---

## 📂 1. `project_overview.md`

This file defines the scope, goal, and high-level requirements for the entire application.

```markdown
# 🚀 Project Alpha: AI Image Tagger & Scoring System

## 🎯 1. Goal & Objective
To build a sophisticated web application that ingests an image, uses AI models to automatically detect objects and concepts, and generates a standardized, weighted "Score" reflecting the image's thematic complexity and commercial viability for stock photography/e-commerce use.

## ✨ 2. Key Features
1. **Image Upload Interface:** Simple drag-and-drop functionality.
2. **AI Analysis Engine (Backend):** Calls multiple specialized AI models.
3. **Scoring Algorithm (Backend):** Executes the weighted calculation based on detected tags.
4. **Results Visualization (Frontend):** Displays the generated tags, the final score, and a breakdown of the scoring components.

## 🛠️ 3. Technical Requirements
*   **Backend:** Python (Flask or FastAPI) is highly recommended due to robust AI/ML libraries (Pillow, OpenCV, etc.).
*   **Frontend:** React.js is recommended for state management and complex UI rendering.
*   **Deployment:** Must handle asynchronous processing due to AI model latency.
```

---

## 💻 2. `backend_api_specification.md`

This file is the core developer instruction for the backend API endpoints and the business logic.

```markdown
# 💻 Backend API Specification (Python/FastAPI)

## 🌐 1. Core Endpoint
- **Endpoint:** `/api/analyze_image`
- **Method:** `POST`
- **Request Body:**
    ```json
    {
      "image_file": "bytes_data_of_image",
      "user_id": "optional_user_id"
    }
    ```
- **Response Body (Success):**
    ```json
    {
      "status": "success",
      "image_id": "unique_id",
      "analysis_results": {
        "score": 87.5,
        "tags": ["dog", "park", "autumn", "happy"],
        "score_breakdown": {
          "object_score": 30.0,
          "theme_score": 35.0,
          "composition_score": 22.5,
          "rarity_score": 10.0
        },
        "detection_data": [
          {"object": "dog", "confidence": 0.95, "bbox": [x1, y1, x2, y2]},
          {"object": "autumn", "confidence": 0.88, "bbox": [x1, y1, x2, y2]}
        ]
      }
    }
    ```

## 🧠 2. Core Business Logic: Scoring Algorithm
The final score is a weighted average of four sub-scores.

$$
\text{Final Score} = \text{Object Score} + \text{Theme Score} + \text{Composition Score} + \text{Rarity Score}
$$

### A. Object Score Calculation (Weight: 0.4)
*   **Input:** Raw tags detected by general object recognition models.
*   **Logic:** Sum the weighted confidence scores of all detected primary objects.
    $$
    \text{Object Score} = \sum (\text{Object Confidence}_i \times \text{Object Weight}_i)
    $$
    *(Example: Dog (0.95) $\times$ 0.3 + Park (0.90) $\times$ 0.2 = 0.295)*

### B. Theme Score Calculation (Weight: 0.35)
*   **Input:** Tags categorized as seasonal, emotional, or abstract concepts (e.g., `autumn`, `happy`, `corporate`).
*   **Logic:** Use a predefined dictionary mapping common concepts to a score.
    $$
    \text{Theme Score} = \text{Average}(\text{Score}_{\text{Seasonal}}, \text{Score}_{\text{Emotion}})
    $$

### C. Composition Score Calculation (Weight: 0.2)
*   **Input:** Metrics derived from image analysis (e.g., rule of thirds adherence, symmetry detection, depth map analysis).
*   **Logic:** A function that assesses visual balance. Scores should be normalized (0 to 100).

### D. Rarity Score Calculation (Weight: 0.05)
*   **Input:** The unique combination of all detected tags.
*   **Logic:** The lower the frequency of the tag combination across the dataset, the higher the score. Use a simple inverse frequency multiplier.
    $$
    \text{Rarity Score} = 100 - (\text{Frequency of Tag Combination} \times 5)
    $$

## ☁️ 3. AI Model Integration (Pseudo-Code)
```python
def analyze_image(image_bytes):
    # 1. Run General Object Recognition (YOLO, COCO dataset)
    detected_objects = object_detector(image_bytes)
    
    # 2. Run Contextual Tagging (BLIP/CLIP for conceptual tags)
    detected_concepts = concept_tagger(image_bytes)
    
    # 3. Run Composition Analysis (OpenCV/Specialized model)
    composition_metrics = composition_analyzer(image_bytes)
    
    # 4. Execute Scoring Engine
    score_breakdown = calculate_scores(
        objects=detected_objects, 
        concepts=detected_concepts, 
        metrics=composition_metrics
    )
    
    # 5. Return structured result
    return final_result(score_breakdown)
```
```

---

## 🖥️ 3. `frontend_ui_component.md`

This file guides the React developer on how to build the user interface and manage state.

```markdown
# 🖥️ Frontend UI Component Guide (React.js)

## 🖼️ 1. Component Structure
The application should primarily consist of two main components: `ImageUploader` and `ResultsViewer`.

### A. `ImageUploader` Component
*   **State:** `selectedFile` (File object), `isLoading` (boolean).
*   **Functionality:**
    *   Handle drag-and-drop event handlers (`onDrop`).
    *   Show a loading spinner when the API call is initiated.
    *   On successful upload, pass the file data to the state, triggering the API call.

### B. `ResultsViewer` Component
*   **State:** `analysisData` (The JSON response from the API).
*   **Rendering Priority:**
    1.  **Headline Score:** The final number (e.g., 87.5/100) must be the largest, most prominent element on the screen.
    2.  **Score Breakdown:** Display the four weighted components (`Object Score`, `Theme Score`, etc.) using a radial progress bar or segmented card view to show contribution.
    3.  **Tags:** Display the full list of generated tags. Implement a "tag cloud" visualization.
    4.  **Visualization:** If possible, overlay the detected bounding boxes (`detection_data`) onto a thumbnail preview of the image.

## 🎨 2. Styling Notes
*   Use a clean, minimalist aesthetic (high contrast, professional feel).
*   Color-code the score breakdowns: Green for high score contributions, Yellow for average, Red for weak areas.
*   The transition from the loading spinner to the results screen must feel smooth and professional.
```

---

## 💾 4. `data_schema.md`

This file defines the required TypeScript interfaces for both the front and back ends to ensure data consistency.

```markdown
# 💾 Data Schemas (TypeScript / JSON Reference)

## 1. Tag Structure
Defines a single identified tag, regardless of its origin (object, theme, etc.).
```typescript
interface Tag {
    name: string;         // e.g., "dog", "autumn"
    confidence: number;   // 0.0 to 1.0
    score_weight: number; // How much this tag contributes to the score calculation
}
```

## 2. Detection Data Structure (For Visualization)
Used to map the bounding boxes on the image.
```typescript
interface BoundingBox {
    x_min: number; // Normalized coordinate (0 to 1)
    y_min: number;
    x_max: number;
    y_max: number;
}

interface DetectedObject {
    label: string;
    confidence: number;
    bbox: BoundingBox;
}
```

## 3. Full API Response Structure (The payload the client expects)
This consolidates all inputs and outputs.
```typescript
interface APIResponse {
    success: boolean;
    timestamp: Date;
    input_file_metadata: {
        file_name: string;
        dimensions: { width: number, height: number };
    };
    results: {
        total_score: number; // The final score out of 100 or 1.0
        breakdown: {
            object_detection_score: number; // Component score
            theme_coherence_score: number; // Component score
            emotional_resonance_score: number; // Component score
        };
        tags: TaggedObject[]; // Array of detected objects with bboxes
        tags_summary: TagSummary[]; // Summary object for non-spatial data
    }
}
```