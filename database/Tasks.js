const { DataTypes } = require("sequelize");
const db = require("./db");

const Tasks = db.define("Tasks", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  className: DataTypes.STRING,
  assignment: DataTypes.STRING,
  description: DataTypes.TEXT,
  status: {
    type: DataTypes.ENUM("pending", "completed", "in-progress"),
    allowNull: false,
  },
  deadline: DataTypes.DATE,
  priority: {
    type: DataTypes.ENUM("high", "medium", "low"),
    allowNull: false,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  calendarEventId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  hasReminder: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
});

module.exports = Tasks;
