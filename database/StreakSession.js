// models/Session.js
const { DataTypes } = require("sequelize");
const sequelize = require("./db"); // your Sequelize instance

const StreakSession = sequelize.define(
  "Session",
  {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = StreakSession;
