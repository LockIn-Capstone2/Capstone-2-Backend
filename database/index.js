const db = require("./db");
const User = require("./user");
const AiChatHistory = require("./aichathistory");

User.hasMany(AiChatHistory, { foreignKey: "user_id" });
AiChatHistory.belongsTo(User, { foreignKey: "user_id" });

module.exports = {
  db,
  User,
  AiChatHistory,
};
