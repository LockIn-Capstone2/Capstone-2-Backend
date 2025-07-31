const { DataTypes } = require("sequelize");
const db = require("./db");

const Task = db.define("Task",
  {
    id: { 
        type: DataTypes.INTEGER, 
        primaryKey: true, 
        autoIncrement: true },
    class: DataTypes.STRING,
    assignment: DataTypes.STRING,
    description: DataTypes.TEXT,
    status: DataTypes.STRING,
    deadline: DataTypes.DATE,
    priority: DataTypes.STRING,
    user_id: { 
        type: DataTypes.INTEGER, 
        allowNull: false },
    created_at: { 
        type: DataTypes.DATE, 
        defaultValue: DataTypes.NOW },
  },
);

module.exports = Task;
