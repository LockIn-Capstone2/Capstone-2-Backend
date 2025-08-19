const { DataTypes } = require("sequelize");
const db = require("./db");

const Badge = db.define("Badge", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  description: { type: DataTypes.TEXT, allowNull: false },
  icon: { type: DataTypes.STRING, allowNull: false }, // emoji or icon name
  category: {
    type: DataTypes.ENUM("streak", "quiz", "accuracy", "speed", "milestone"),
    allowNull: false,
  },
  requirement_type: {
    type: DataTypes.ENUM(
      "streak_days",
      "quiz_count",
      "accuracy_percentage",
      "completion_time",
      "total_days"
    ),
    allowNull: false,
  },
  requirement_value: { type: DataTypes.INTEGER, allowNull: false },
  rarity: {
    type: DataTypes.ENUM("common", "rare", "epic", "legendary"),
    allowNull: false,
    defaultValue: "common",
  },
  points: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }, // points awarded when earned
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
});

module.exports = Badge;
