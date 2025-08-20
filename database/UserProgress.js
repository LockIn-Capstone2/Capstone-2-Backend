const { DataTypes } = require("sequelize");
const db = require("./db");

const UserProgress = db.define("UserProgress", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, // primary key
  user_id: { type: DataTypes.INTEGER, allowNull: false }, // foreign key to User.id
  ai_chat_history_id: { type: DataTypes.INTEGER, allowNull: false }, // foreign key to AiChatHistory.id
  card_index: { type: DataTypes.INTEGER, allowNull: true }, // for flashcards only
  is_correct: { type: DataTypes.BOOLEAN, allowNull: true }, // for flashcards only
  score: { type: DataTypes.INTEGER, allowNull: true }, // for quizzes only
  duration_ms: { type: DataTypes.INTEGER, allowNull: true }, // for flashcards only
  session_id: { type: DataTypes.STRING, allowNull: true }, // for flashcards only
  studied_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
});

module.exports = UserProgress;
