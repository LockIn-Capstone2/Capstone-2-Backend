require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const path = require("path");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const app = express();
const apiRouter = require("./api");
const { router: authRouter } = require("./auth");
const { db } = require("./database");
const cors = require("cors");
const { OpenAI } = require("openai");
const { Model } = require("sequelize");
const Anthropic = require("@anthropic-ai/sdk");
const PORT = process.env.PORT || 8080;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// body parser middleware
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000" || FRONTEND_URL,
    credentials: true,
  })
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.post("/chat", async (req, res) => {
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
You are an AI study assistant designed to help students review topics and prepare for exams. Your task is to create either flashcards or a quiz based on the user's request. The user's request will be provided within <user_request> tags.

Here is the user's request:
<user_request>
${user_request}
</user_request>

Instructions:

1. Analyze the user's request to determine whether they want flashcards or a quiz.

2. If the user requests flashcards:
   a. Create a set of at least 5 flashcards related to the topic.
   b. Each flashcard should have a question on one side and the answer on the other.
   c. Format the flashcards in markdown using the following structure:
      \`\`\`markdown
      ## Flashcard 1
      **Q:** [Question]
      **A:** [Answer]

      ## Flashcard 2
      **Q:** [Question]
      **A:** [Answer]
      \`\`\`

3. If the user requests a quiz:
   a. Generate a multiple-choice quiz with at least 5 questions related to the topic.
   b. Each question should have 4 options, with only one correct answer.
   c. Format the quiz in markdown using the following structure:
      \`\`\`markdown
      ## Question 1
      [Question text]
      A) [Option A]
      B) [Option B]
      C) [Option C]
      D) [Option D]

      Correct Answer: [Letter of correct option]

      ## Question 2
      [Question text]
      A) [Option A]
      B) [Option B]
      C) [Option C]
      D) [Option D]

      Correct Answer: [Letter of correct option]
      \`\`\`

4. Before providing your final output, plan and structure your response within <study_material_planning> tags in your thinking block. Consider the following:
   - Clearly state whether the user wants flashcards or a quiz.
   - Identify the main concepts or subtopics within the user's request.
   - For flashcards: List potential question-answer pairs.
   - For quiz: List potential multiple-choice questions with options.
   - Review and refine your initial ideas to ensure diversity and challenge.
   - Ensure the content is accurate and relevant to the topic.

5. After your planning process, provide the flashcards or quiz in markdown format as specified above.

Remember to always format your output in markdown, and ensure that quizzes are multiple-choice with four options per question. Your final output should consist only of the formatted flashcards or quiz and should not duplicate or rehash any of the work you did in the study material planning section.`,
            },
          ],
        },
      ],
    });
    const replyContent = response?.content?.find((c) => c.type === "text");
    const replyText = replyContent?.text || "Sorry, no response.";
    res.status(200).send({ reply: replyText });
  } catch (error) {
    console.error(error);
    res.status(404).send("Bad Request ❌");
  }
});

// cookie parser middleware
app.use(cookieParser());

app.use(morgan("dev")); // logging middleware
app.use(express.static(path.join(__dirname, "public"))); // serve static files from public folder
app.use("/api", apiRouter); // mount api router
app.use("/auth", authRouter); // mount auth router

// error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.sendStatus(500);
});

const runApp = async () => {
  try {
    await db.sync();
    console.log("✅ Connected to the database");
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Unable to connect to the database:", err);
  }
};

runApp();

module.exports = app;
