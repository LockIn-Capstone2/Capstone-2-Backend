const express = require("express");
const router = express.Router();
const { AiChatHistory } = require("../database");
const Anthropic = require("@anthropic-ai/sdk");
const { nanoid } = require("nanoid");

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Safely sanitize JSON string for database storage
function sanitizeJsonString(jsonString) {
  try {
    // First try to parse and re-stringify to ensure valid JSON
    const parsed = JSON.parse(jsonString);
    return JSON.stringify(parsed);
  } catch (error) {
    // If parsing fails, try to clean it up
    let cleaned = jsonString
      .replace(/\n/g, "\\n") // Escape newlines
      .replace(/\r/g, "\\r") // Escape carriage returns
      .replace(/\t/g, "\\t") // Escape tabs
      .replace(/\\/g, "\\\\") // Escape backslashes
      .replace(/"/g, '\\"') // Escape quotes
      .replace(/\f/g, "\\f") // Escape form feeds
      .replace(/\b/g, "\\b"); // Escape backspaces

    try {
      // Try to parse the cleaned string
      JSON.parse(cleaned);
      return cleaned;
    } catch (secondError) {
      // If still fails, return a safe fallback
      console.error("Failed to sanitize JSON:", secondError);
      return JSON.stringify({
        error: "Malformed response",
        original: jsonString.substring(0, 100) + "...",
      });
    }
  }
}

// More robust JSON extraction that can handle malformed JSON
function extractQuizDataRobust(text) {
  if (!text || typeof text !== "string") return null;

  console.log(
    "Attempting to extract JSON from:",
    text.substring(0, 200) + "..."
  );

  // First try: direct JSON parse
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      console.log(
        "Direct JSON parse successful, found array with",
        parsed.length,
        "items"
      );
      return parsed;
    }

    // Look for array fields in object
    if (parsed && typeof parsed === "object") {
      const possibleArrays = [
        "items",
        "quiz",
        "flashcards",
        "data",
        "questions",
      ];
      for (const key of possibleArrays) {
        if (Array.isArray(parsed[key])) {
          console.log(
            "Found array in field:",
            key,
            "with",
            parsed[key].length,
            "items"
          );
          return parsed[key];
        }
      }
    }
  } catch (error) {
    console.log("Direct JSON parse failed:", error.message);
  }

  // Try to clean the text and parse again
  try {
    // Remove common prefixes/suffixes that AI might add
    let cleanedText = text.trim();

    // Remove markdown code blocks if present
    cleanedText = cleanedText
      .replace(/```json\s*/g, "")
      .replace(/```\s*$/g, "");

    // Remove any text before the first [
    const firstBracket = cleanedText.indexOf("[");
    if (firstBracket > 0) {
      cleanedText = cleanedText.substring(firstBracket);
    }

    // Remove any text after the last ]
    const lastBracket = cleanedText.lastIndexOf("]");
    if (lastBracket > 0 && lastBracket < cleanedText.length - 1) {
      cleanedText = cleanedText.substring(0, lastBracket + 1);
    }

    console.log(
      "Attempting to parse cleaned text:",
      cleanedText.substring(0, 200) + "..."
    );

    const parsed = JSON.parse(cleanedText);
    if (Array.isArray(parsed)) {
      console.log(
        "Cleaned text parse successful, found array with",
        parsed.length,
        "items"
      );
      return parsed;
    }
  } catch (error) {
    console.log("Cleaned text parse failed:", error.message);
  }

  // Second try: extract array with bracket counting
  try {
    const start = text.indexOf("[");
    if (start === -1) {
      console.log("No opening bracket found");
      return null;
    }

    let bracketCount = 0;
    let end = -1;
    let inString = false;
    let escapeNext = false;

    for (let i = start; i < text.length; i++) {
      const char = text[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === "\\") {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === "[") {
          bracketCount++;
        } else if (char === "]") {
          bracketCount--;
          if (bracketCount === 0) {
            end = i;
            break;
          }
        }
      }
    }

    if (end === -1) {
      console.log("Bracket counting failed - unbalanced brackets");
      return null;
    }

    const jsonString = text.substring(start, end + 1);
    console.log("Extracted JSON string:", jsonString.substring(0, 100) + "...");

    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed)) {
      console.log(
        "Bracket extraction successful, found array with",
        parsed.length,
        "items"
      );
      return parsed;
    }
  } catch (error) {
    console.log("Bracket extraction failed:", error.message);
  }

  // Third try: regex-based extraction
  try {
    const arrayRegex = /\[[\s\S]*?\]/g;
    const matches = text.match(arrayRegex);

    if (matches) {
      for (const match of matches) {
        try {
          const parsed = JSON.parse(match);
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log(
              "Regex extraction successful, found array with",
              parsed.length,
              "items"
            );
            return parsed;
          }
        } catch (error) {
          console.log("Regex match parse failed:", error.message);
        }
      }
    }
  } catch (error) {
    console.log("Regex extraction failed:", error.message);
  }

  console.log("All extraction methods failed");
  return null;
}

router.post("/", async (req, res) => {
  const { user_request } = req.body;
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${user_request}
You are an expert AI study assistant designed to help students excel in their academic pursuits. You can create comprehensive study materials including flashcards, quizzes, and detailed study plans.

RESPONSE TYPES:
1. FLASHCARDS: When user requests flashcards or memorization help
2. QUIZ: When user requests practice questions or assessments  
3. STUDY_PLAN: When user asks for study plans, strategies, or learning guidance

INSTRUCTIONS:
- Analyze the user's request to determine the most appropriate response type
- For flashcards/quiz: Create exactly 10 high-quality items and respond with valid JSON array
- For study plans: Provide comprehensive, actionable study strategies as regular text (NOT JSON)
- Ensure all content is academically rigorous, accurate, and exam-focused
- Use evidence-based learning techniques and cognitive science principles

RESPONSE FORMATS:

For flashcards and quizzes, respond with a valid JSON array.

For FLASHCARDS (JSON array):
[
  {
    "front": "Clear, specific question or concept",
    "back": "Comprehensive, accurate answer with key details",
    "difficulty": "easy|medium|hard",
    "cognitive_skill": "recall|comprehension|application|analysis|synthesis|evaluation",
    "topic": "specific subtopic this covers"
  }
]

For QUIZ (JSON array):
Create exactly 10 questions in this format:
[
  {
    "question": "What is the first stage of the water cycle?",
    "options": ["A) Evaporation", "B) Condensation", "C) Precipitation", "D) Collection"],
    "correct": "A",
    "explanation": "Evaporation is the first stage where water turns from liquid to vapor due to heat from the sun.",
    "difficulty": "easy",
    "cognitive_skill": "recall",
    "topic": "water cycle stages"
  }
]

For STUDY_PLAN (Regular text format):
Provide a comprehensive, well-structured study plan in clear, readable text format. Include:

1. Overview and Learning Objectives
2. Detailed Study Schedule (day-by-day breakdown)
3. Active Learning Strategies
4. Recommended Resources and Materials
5. Assessment and Practice Methods
6. Common Pitfalls to Avoid
7. Success Indicators and Progress Tracking
8. Time Management Tips

Format the response as clear, organized text with headings, bullet points, and structured sections. Do NOT use JSON format for study plans.

QUALITY STANDARDS:
- Academic accuracy: All content must be factually correct and up-to-date
- Cognitive depth: Include higher-order thinking skills (analysis, synthesis, evaluation)
- Exam alignment: Focus on concepts commonly tested in academic assessments
- Learning science: Incorporate spaced repetition, active recall, and interleaving principles
- Accessibility: Clear, concise language appropriate for the academic level
- Comprehensive coverage: Address key concepts, common misconceptions, and advanced topics

RESPONSE RULES:
- For flashcards/quiz: Respond with valid JSON array
- For quizzes: Create exactly 10 questions
- For study plans: Respond with clear, structured text (NOT JSON format)
- Ensure all JSON is properly formatted and parseable
- Include difficulty progression and varied cognitive skills
- Focus on mastery learning and deep understanding

IMPORTANT: When creating quizzes, respond with ONLY a JSON array containing exactly 10 question objects. Do not add any text before or after the JSON array.
`,
            },
          ],
        },
      ],
    });
    const replyContent = response?.content?.find((c) => c.type === "text");
    const replyText = replyContent?.text || "Sorry, no response.";

    // Log the raw AI response for debugging
    console.log("🤖 RAW AI RESPONSE:");
    console.log("Response length:", replyText.length);
    console.log("Response preview:", replyText.substring(0, 1000));
    console.log(
      "Contains JSON array markers:",
      replyText.includes("[") && replyText.includes("]")
    );

    // const isQuiz = replyText.includes("## Question 1");
    // const quizId = isQuiz ? nanoid(8) : null;

    // const responseType = isQuiz ? "quiz" : "flashcard";

    // await AiChatHistory.create({
    //   user_id: req.user?.id || null,
    //   user_request,
    //   ai_response: replyText,
    //   quiz_id: quizId,
    //   response_type: responseType,
    //   status: "success",
    // });

    // if (isQuiz && quizId) {
    //   const link = `http://localhost:3000/quiz/${quizId}`;
    //   return res.status(200).send({
    //     reply: `Your quiz is ready! [Click here to take it](${link})`,
    //   });
    // }

    let parsed = extractQuizDataRobust(replyText);

    // Debug logging to see what we're getting
    console.log("🔍 DEBUG: Raw AI Response:");
    console.log("Length:", replyText.length);
    console.log("First 500 chars:", replyText.substring(0, 500));
    console.log("Last 500 chars:", replyText.substring(replyText.length - 500));
    console.log("Contains '[':", replyText.includes("["));
    console.log("Contains ']':", replyText.includes("]"));
    console.log("Contains 'question':", replyText.includes("question"));
    console.log("Parsed result:", parsed);
    console.log("Parsed type:", typeof parsed);
    console.log(
      "Parsed length:",
      Array.isArray(parsed) ? parsed.length : "N/A"
    );

    // Determine response type by inspecting the parsed JSON and user request
    let responseType = "unknown"; // Start neutral instead of defaulting to flashcard

    // First, check if the user specifically requested a study plan
    const userRequestLower = (user_request || "").toLowerCase();
    const isStudyPlanRequest =
      userRequestLower.includes("study plan") ||
      userRequestLower.includes("study strategy") ||
      userRequestLower.includes("learning plan") ||
      userRequestLower.includes("how to study") ||
      userRequestLower.includes("study guide");

    // Check if user specifically requested a quiz
    const isQuizRequest =
      userRequestLower.includes("quiz") ||
      userRequestLower.includes("test") ||
      userRequestLower.includes("practice questions") ||
      userRequestLower.includes("assessment") ||
      userRequestLower.includes("multiple choice") ||
      userRequestLower.includes("mcq");

    // Check if user specifically requested flashcards
    const isFlashcardRequest =
      userRequestLower.includes("flashcard") ||
      userRequestLower.includes("memorization") ||
      userRequestLower.includes("memory") ||
      userRequestLower.includes("recall");

    if (isStudyPlanRequest) {
      responseType = "study_plan";
    } else if (Array.isArray(parsed) && parsed.length > 0) {
      const firstItem = parsed[0];

      // More flexible quiz detection - just needs question field
      const looksLikeQuiz =
        firstItem && typeof firstItem === "object" && "question" in firstItem;

      // More flexible flashcard detection - just needs front/back fields
      const looksLikeFlashcard =
        firstItem &&
        typeof firstItem === "object" &&
        "front" in firstItem &&
        "back" in firstItem;

      if (looksLikeQuiz) {
        responseType = "quiz";
      } else if (looksLikeFlashcard) {
        responseType = "flashcard";
      }
    } else if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      // Check if it's a study plan JSON object
      const looksLikeStudyPlan =
        parsed &&
        typeof parsed === "object" &&
        ("title" in parsed ||
          "study_schedule" in parsed ||
          "learning_objectives" in parsed);
      if (looksLikeStudyPlan) responseType = "study_plan";
    }

    // Enhanced fallback detection with user request consideration
    if (responseType === "unknown") {
      const lower = replyText.toLowerCase();
      const hasQuestion = /"question"\s*:/.test(lower);
      const hasOptions = /"options"\s*:\s*\[/.test(lower);
      const hasCorrect = /"correct"\s*:/.test(lower);
      const hasFront = /"front"\s*:/.test(lower);
      const hasBack = /"back"\s*:/.test(lower);
      const hasStudyPlan =
        /"study_schedule"\s*:/.test(lower) ||
        /"learning_objectives"\s*:/.test(lower);

      // Prioritize user request over content analysis
      if (isQuizRequest && (hasQuestion || hasOptions)) {
        responseType = "quiz";
      } else if (isFlashcardRequest && (hasFront || hasBack)) {
        responseType = "flashcard";
      } else if (hasQuestion && hasOptions) {
        responseType = "quiz";
      } else if (hasFront && hasBack) {
        responseType = "flashcard";
      } else if (hasStudyPlan) {
        responseType = "study_plan";
      } else if (isQuizRequest) {
        // If user asked for quiz but content doesn't match, still treat as quiz
        responseType = "quiz";
      } else if (isFlashcardRequest) {
        // If user asked for flashcards but content doesn't match, still treat as flashcard
        responseType = "flashcard";
      } else {
        // Final fallback - default to flashcard only if we have no other clues
        responseType = "flashcard";
      }
    }

    // Debug logging to help troubleshoot response type detection
    console.log("🔍 Response Type Detection Debug:");
    console.log("  User Request:", user_request);
    console.log("  User Request Lower:", userRequestLower);
    console.log("  Is Quiz Request:", isQuizRequest);
    console.log("  Is Flashcard Request:", isFlashcardRequest);
    console.log("  Is Study Plan Request:", isStudyPlanRequest);
    console.log(
      "  Parsed Data Type:",
      Array.isArray(parsed) ? "Array" : typeof parsed
    );
    console.log(
      "  Parsed Data Length:",
      Array.isArray(parsed) ? parsed.length : "N/A"
    );
    console.log("  Final Response Type:", responseType);
    console.log("  Content Preview:", replyText.substring(0, 200) + "...");

    const quizId = responseType === "quiz" ? nanoid(8) : null;

    // Generate ID for both quiz and flashcard
    const contentId = nanoid(8); // Always generate an ID

    try {
      await AiChatHistory.create({
        user_id: req.user?.id || null,
        user_request,
        ai_response:
          responseType === "study_plan"
            ? replyText // Store study plan as plain text
            : Array.isArray(parsed)
            ? sanitizeJsonString(JSON.stringify(parsed))
            : sanitizeJsonString(replyText),
        quiz_id: contentId, // Use the same ID for both types
        response_type: responseType,
        status: "success",
      });
    } catch (dbErr) {
      console.error("Error saving AI chat history ❌", dbErr.message || dbErr);
    }

    // Generate link for quiz, flashcard, and study plan
    let contentLink = null;
    let userMessage = replyText;

    if (responseType === "quiz") {
      const baseUrl =
        process.env.FRONTEND_URL || "https://lock-in-front-end-nu.vercel.app/";
      contentLink = `${baseUrl}/quiz/${contentId}`;
      userMessage = `Your quiz is ready! Click here to take it: ${contentLink}`;
    } else if (responseType === "flashcard") {
      const baseUrl =
        process.env.FRONTEND_URL || "https://lock-in-front-end-nu.vercel.app/";
      contentLink = `${baseUrl}/flashcards/${contentId}`;
      userMessage = `Your flashcards are ready! Click here to study: ${contentLink}`;
    } else if (responseType === "study_plan") {
      // For study plans, return the text directly without a link
      userMessage = replyText; // Return the study plan as text
      contentLink = null; // No link needed for study plans
    }

    res.status(200).send({
      reply: userMessage,
      data: responseType === "study_plan" ? null : parsed, // No parsed data for study plans
      quiz_id: contentId, // Keep the field name for backward compatibility
      response_type: responseType,
      quiz_link: contentLink, // Keep the field name for backward compatibility
      content_id: contentId, // Add new field for clarity
      content_link: contentLink, // Add new field for clarity
    });
  } catch (error) {
    console.error(
      "Error getting a response ❌",
      error.response?.data || error.message || error
    );
    res.status(500).send("Error getting a response.");
  }
});

// Utility route to clean up malformed JSON data (run once if needed)
router.post("/cleanup-json", async (req, res) => {
  try {
    const allRecords = await AiChatHistory.findAll();
    let cleanedCount = 0;

    for (const record of allRecords) {
      try {
        // Try to parse the stored JSON
        JSON.parse(record.ai_response);
      } catch (parseError) {
        // If parsing fails, try to clean it up
        try {
          const cleaned = sanitizeJsonString(record.ai_response);
          await record.update({ ai_response: cleaned });
          cleanedCount++;
        } catch (cleanupError) {
          console.error(`Failed to clean record ${record.id}:`, cleanupError);
        }
      }
    }

    res.json({
      message: `Cleaned up ${cleanedCount} malformed JSON records`,
      total_records: allRecords.length,
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    res.status(500).json({ error: "Cleanup failed" });
  }
});

router.get("/quiz/:quizId", async (req, res) => {
  const { quizId } = req.params;

  try {
    const history = await AiChatHistory.findOne({ where: { quiz_id: quizId } });
    console.log("Fetched AI Response:", history?.ai_response);

    if (!history) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    let parsed = null;
    try {
      parsed = JSON.parse(history.ai_response);
    } catch (_) {
      // try to extract array if the stored string isn't pure JSON
      try {
        parsed = extractQuizDataRobust(history.ai_response);
      } catch (extractError) {
        console.error("Failed to extract JSON from ai_response:", extractError);
        // Return error response instead of crashing
        return res.status(500).json({
          error: "Failed to parse quiz data",
          details: "The stored quiz data is malformed",
          ai_response: history.ai_response.substring(0, 200) + "...",
          debug_info: {
            response_type: history.response_type,
            quiz_id: history.quiz_id,
            ai_response_length: history.ai_response.length,
          },
        });
      }
    }

    if (!parsed) {
      return res.status(500).json({
        error: "No quiz data could be extracted",
        details: "The response format is not supported",
        ai_response: history.ai_response.substring(0, 200) + "...",
        debug_info: {
          response_type: history.response_type,
          quiz_id: history.quiz_id,
        },
      });
    }

    return res.status(200).json({
      ai_response: history.ai_response,
      data: parsed,
      response_type: history.response_type,
      quiz_id: history.quiz_id,
    });
  } catch (err) {
    console.error("Error fetching quiz by ID ❌", err.message || err);
    res.status(500).json({ error: "Server error" });
  }
});

// Debug route to inspect stored data
router.get("/debug/:quizId", async (req, res) => {
  const { quizId } = req.params;

  try {
    const history = await AiChatHistory.findOne({ where: { quiz_id: quizId } });

    if (!history) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    // Try to parse the stored response
    let parsed = null;
    let parseError = null;

    try {
      parsed = JSON.parse(history.ai_response);
    } catch (error) {
      parseError = error.message;
    }

    res.json({
      quiz_id: history.quiz_id,
      response_type: history.response_type,
      user_request: history.user_request,
      ai_response_length: history.ai_response.length,
      ai_response_preview: history.ai_response.substring(0, 500) + "...",
      parse_success: parsed !== null,
      parse_error: parseError,
      parsed_data: parsed,
      raw_ai_response: history.ai_response,
    });
  } catch (error) {
    res.status(500).json({ error: "Debug failed", message: error.message });
  }
});

// New endpoint for retrieving flashcards by ID
router.get("/flashcards/:flashcardId", async (req, res) => {
  const { flashcardId } = req.params;

  try {
    const history = await AiChatHistory.findOne({
      where: {
        quiz_id: flashcardId, // Using the same field for both types
        response_type: "flashcard",
      },
    });

    if (!history) {
      return res.status(404).json({ error: "Flashcards not found" });
    }

    let parsed = null;
    try {
      parsed = JSON.parse(history.ai_response);
    } catch (_) {
      parsed = extractQuizDataRobust(history.ai_response);
    }

    if (!parsed) {
      return res.status(500).json({
        error: "No flashcard data could be extracted",
        details: "The response format is not supported",
      });
    }

    return res.status(200).json({
      ai_response: history.ai_response,
      data: parsed,
      response_type: history.response_type,
      flashcard_id: history.quiz_id, // Using the stored ID
    });
  } catch (err) {
    console.error("Error fetching flashcards by ID ❌", err.message || err);
    res.status(500).json({ error: "Server error" });
  }
});

// New endpoint for retrieving study plans by ID
router.get("/study-plan/:studyPlanId", async (req, res) => {
  const { studyPlanId } = req.params;

  try {
    const history = await AiChatHistory.findOne({
      where: {
        quiz_id: studyPlanId, // Using the same field for all types
        response_type: "study_plan",
      },
    });

    if (!history) {
      return res.status(404).json({ error: "Study plan not found" });
    }

    let parsed = null;
    try {
      parsed = JSON.parse(history.ai_response);
    } catch (_) {
      // For study plans, we expect a JSON object, not an array
      try {
        const cleaned = sanitizeJsonString(history.ai_response);
        parsed = JSON.parse(cleaned);
      } catch (extractError) {
        console.error("Failed to parse study plan JSON:", extractError);
        return res.status(500).json({
          error: "Failed to parse study plan data",
          details: "The stored study plan data is malformed",
        });
      }
    }

    if (!parsed || typeof parsed !== "object") {
      return res.status(500).json({
        error: "No study plan data could be extracted",
        details: "The response format is not supported",
      });
    }

    return res.status(200).json({
      ai_response: history.ai_response,
      data: parsed,
      response_type: history.response_type,
      study_plan_id: history.quiz_id, // Using the stored ID
    });
  } catch (err) {
    console.error("Error fetching study plan by ID ❌", err.message || err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
