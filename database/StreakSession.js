const { DataTypes } = require("sequelize");
const db = require("./db"); // your Sequelize instance

const StreakSession = db.define(
  "StreakSession",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    startTime: { type: DataTypes.DATE, allowNull: false },
    endTime: { type: DataTypes.DATE, allowNull: true },
  },
  { timestamps: true }
);

module.exports = StreakSession;
