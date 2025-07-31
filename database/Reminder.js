const { DataTypes } = require('sequelize');
const db = require('./db');

const Reminder = db.define('Reminder', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true },
  task_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false },
    
  remind: DataTypes.DATE
}, 
);

module.exports = Reminder;
