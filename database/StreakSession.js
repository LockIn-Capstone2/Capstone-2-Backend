const { DataTypes } = require("sequelize");
const db = require("./db"); // your Sequelize instance

const StreakSession = db.define(
  "StreakSession",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    startTime: { type: DataTypes.DATE, allowNull: false },
    endTime: { type: DataTypes.DATE, allowNull: true },
    session_type: {
      type: DataTypes.ENUM("study", "break", "review"),
      allowNull: false,
      defaultValue: "study",
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  { timestamps: true }
);

module.exports = StreakSession;
