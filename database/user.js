const { DataTypes } = require("sequelize");
const db = require("./db");
const bcrypt = require("bcrypt");

const User = db.define("user", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },

  auth0Id: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  googleId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  profilePicture: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true, // Allow null for OAuth users who might not provide email
    unique: true,
    validate: {
      isEmail: {
        msg: "Must be a valid email address",
      },
    },
    set(value) {
      // Convert empty strings to null to avoid unique constraint issues
      this.setDataValue("email", value === "" ? null : value);
    },
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  studyGoal: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 30, // Default 30 minutes per day
  },
});

// Instance method to check password
User.prototype.checkPassword = function (password) {
  if (!this.passwordHash) {
    return false; // Auth0 users don't have passwords
  }
  return bcrypt.compareSync(password, this.passwordHash);
};

// Class method to hash password
User.hashPassword = function (password) {
  const saltValue = 12;
  return bcrypt.hashSync(password, saltValue);
};

module.exports = User;
