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
    allowNull: true,
  },
  assignment_grade: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  assignment_weight: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
});

module.exports = Calculator;
