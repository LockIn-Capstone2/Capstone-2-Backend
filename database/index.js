const Sequelize = require("sequelize");
const db = require("./db");

const User = require("./User");
const Tasks = require("./Tasks");
const Calculator = require("./Calculator");
const Reminder = require("./Reminder");
const Session = require("./Session");
const AiChatHistory = require("./aichathistory");
const StreakSession = require("./StreakSession");

// Define associations
User.hasMany(Tasks, { foreignKey: "user_id" }); // One user can have many tasks
Tasks.belongsTo(User, { foreignKey: "user_id" }); // Each task belongs to a specific user

User.hasMany(Calculator, { foreignKey: "user_id" }); // User can have many grade calculator instances
Calculator.belongsTo(User, { foreignKey: "user_id" }); // Each calculator belongs to a user

User.hasMany(Session, { foreignKey: "user_id" }); // Each user can have many study sessions
Session.belongsTo(User, { foreignKey: "user_id" }); // Each session belongs to a user

Tasks.hasMany(Reminder, { foreignKey: "task_id" }); // One task can have many reminders
Reminder.belongsTo(Tasks, { foreignKey: "task_id" }); // One reminder belongs to a specific task

User.hasMany(AiChatHistory, { foreignKey: "user_id" });
AiChatHistory.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(StreakSession, { foreignKey: "user_id" });
StreakSession.belongsTo(User, { foreignKey: "user_id" });
// Export everything
module.exports = {
  db,
  User,
  AiChatHistory,
  Tasks,
  Calculator,
  Reminder,
  Session,
  StreakSession,
};
