const { DataTypes } = require('sequelize');
const db = require('./db');

const Session = db.define('Session', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  duration: DataTypes.INTEGER,
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  started_at: DataTypes.DATE,
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'session',
  timestamps: false
});

module.exports = Session;
