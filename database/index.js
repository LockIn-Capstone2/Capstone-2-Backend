const Sequelize = require("sequelize");
const db = require("./db");



const User = require('./User');
const Task = require('./Tasks');
const Calculator = require('./Calculator');
const Reminder = require('./Reminder');
const Session = require('./Session');

// Define associations
User.hasMany(Task, { foreignKey: 'user_id' }); // One user can have many tasks
Task.belongsTo(User, { foreignKey: 'user_id' }); // Each task belongs to a specific user 

User.hasMany(Calculator, { foreignKey: 'user_id' }); // User can have many grade calculator instances 
Calculator.belongsTo(User, { foreignKey: 'user_id' }); // Each calculator belongs to a user

User.hasMany(Session, { foreignKey: 'user_id' }); // Each user can have many study sessions
Session.belongsTo(User, { foreignKey: 'user_id' }); // Each session belongs to a user 

Task.hasMany(Reminder, { foreignKey: 'task_id' }); // One task can have many reminders 
Reminder.belongsTo(Task, { foreignKey: 'task_id' }); // One reminder belongs to a specific task 

// Export everything
module.exports = {
  db,
  User,
  Task,
  Calculator,
  Reminder,
  Session
};
