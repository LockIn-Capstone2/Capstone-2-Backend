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
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${user_request}
You are an advanced AI study assistant that creates either flashcards or a multiple-choice quiz based on the user's request to help with exam preparation.

Instructions:
- Decide whether to create flashcards or a quiz based on the user's request context.
- Determine the appropriate number of items based on the user's request (aim for 5-15 items unless specifically requested otherwise).
- Respond with ONLY a valid JSON array (no prose, no code fences, no surrounding text). The array must contain at least 10 items.
- Use one of the following object shapes for each item:

Flashcard item example (as plain JSON object, not code-fenced):
{
  "front": "Question or prompt goes here",
  "back": "Answer or explanation goes here",
  "difficulty": "easy|medium|hard",
  "cognitive_skill": "recall|comprehension|application|analysis"
}

Quiz question item example (as plain JSON object, not code-fenced):
{
  "question": "The question text goes here",
  "options": [
    "A) First option",
    "B) Second option",
    "C) Third option",
    "D) Fourth option"
  ],
  "correct": "A|B|C|D",
  "difficulty": "easy|medium|hard",
  "cognitive_skill": "recall|comprehension|application|analysis"
}

Requirements:
- Ensure valid JSON syntax that can be parsed directly.
- Vary difficulty levels and cognitive skills across items.
- Ensure content is accurate and aligned with typical exam expectations.
- Do not include any commentary, explanations, tags, or code fences.
`,
            },
          ],
        },
      ],
    });
    const replyContent = response?.content?.find((c) => c.type === "text");
    const replyText = replyContent?.text || "Sorry, no response.";

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

    // Determine response type by inspecting the parsed JSON
    let responseType = "flashcard";
    if (Array.isArray(parsed) && parsed.length > 0) {
      const firstItem = parsed[0];
      const looksLikeQuiz =
        firstItem &&
        typeof firstItem === "object" &&
        "question" in firstItem &&
        Array.isArray(firstItem.options) &&
        "correct" in firstItem;
      const looksLikeFlashcard =
        firstItem &&
        typeof firstItem === "object" &&
        "front" in firstItem &&
        "back" in firstItem;
      if (looksLikeQuiz) responseType = "quiz";
      else if (looksLikeFlashcard) responseType = "flashcard";
    }
    // Fallback detection if parsing failed
    if (!Array.isArray(parsed)) {
      const lower = (replyText || "").toLowerCase();
      const hasQuestion = /"question"\s*:/.test(lower);
      const hasOptions = /"options"\s*:\s*\[/.test(lower);
      const hasCorrect = /"correct"\s*:/.test(lower);
      if (hasQuestion && hasOptions && hasCorrect) {
        responseType = "quiz";
      }
    }

    const quizId = responseType === "quiz" ? nanoid(8) : null;

    try {
      await AiChatHistory.create({
        user_id: req.user?.id || null,
        user_request,
        ai_response: Array.isArray(parsed)
          ? sanitizeJsonString(JSON.stringify(parsed))
          : sanitizeJsonString(replyText),
        quiz_id: quizId,
        response_type: responseType,
        status: "success",
      });
    } catch (dbErr) {
      console.error("Error saving AI chat history ❌", dbErr.message || dbErr);
    }

    // Generate quiz link if it's a quiz
    let quizLink = null;
    let userMessage = replyText;

    if (responseType === "quiz" && quizId) {
      const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      quizLink = `${baseUrl}/quiz/${quizId}`;
      userMessage = `Your quiz is ready! Click here to take it: ${quizLink}`;
    }

    res.status(200).send({
      reply: userMessage,
      data: parsed,
      quiz_id: quizId,
      response_type: responseType,
      quiz_link: quizLink,
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

module.exports = router;
