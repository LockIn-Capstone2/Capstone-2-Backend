const { DataTypes } = require("sequelize");
const db = require("./db");

const Tasks = db.define("Tasks",
  {
    id: { 
        type: DataTypes.INTEGER, 
        primaryKey: true, 
        autoIncrement: true },
    className: DataTypes.STRING,
    assignment: DataTypes.STRING,
    description: DataTypes.TEXT,
    status: {
      type: DataTypes.ENUM('Pending', 'Submitted', 'In-progress'),
      allowNull: false
    },
    deadline: DataTypes.DATE,
    priority:  {
      type: DataTypes.ENUM('high', 'medium', 'low'),
      allowNull: false
    },
    user_id: { 
        type: DataTypes.INTEGER, 
        allowNull: false },
    created_at: { 
        type: DataTypes.DATE, 
        defaultValue: DataTypes.NOW },
  },
);

module.exports = Tasks;
