const { DataTypes } = require("sequelize");
const db = require("./db");

const UserBadge = db.define("UserBadge", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false }, // foreign key to User.id
  badge_id: { type: DataTypes.INTEGER, allowNull: false }, // foreign key to Badge.id
  earned_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  progress_value: { type: DataTypes.INTEGER, allowNull: false }, // the value when badge was earned
  is_new: { type: DataTypes.BOOLEAN, defaultValue: true }, // for showing "NEW" indicator
});

module.exports = UserBadge;
