const { DataTypes } = require("sequelize");
const db = require("./db");

const AiChatHistory = db.define("AiChatHistory", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  user_request: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  ai_response: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  quiz_id: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  response_type: {
    type: DataTypes.ENUM("flashcard", "quiz"),
    allowNull: false,
    defaultValue: "flashcard",
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: "success",
  },
});

module.exports = AiChatHistory;
