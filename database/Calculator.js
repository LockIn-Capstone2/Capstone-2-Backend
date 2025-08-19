const { DataTypes } = require('sequelize');
const db = require('./db');

const Calculator = db.define('Calculator', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true,
  },
  user_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
  },
  assignment_type: {
    type: DataTypes.ENUM('Homework', 'Quiz', 'Midterm', 'Final'),
    allowNull: false,
  },
  assignment_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  assignment_grade: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  assignment_weight: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

module.exports = Calculator;