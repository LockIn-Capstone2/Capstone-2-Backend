const { DataTypes } = require('sequelize');
const db = require('./db');

const Calculator = db.define('Calculator', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true },
  assessment: DataTypes.TEXT,
  grade: DataTypes.INTEGER,
  weight: DataTypes.INTEGER,
  user_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false }

});

module.exports = Calculator;
