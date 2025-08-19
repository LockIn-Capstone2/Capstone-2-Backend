const express = require("express");
const jwt = require("jsonwebtoken");
const googleOAuth = require("../config/googleOAuth");
const { User } = require("../database");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Middleware to authenticate JWT tokens
const authenticateJWT = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).send({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).send({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

// Auth0 authentication route
router.post("/auth0", async (req, res) => {
  try {
    const { auth0Id, email, username } = req.body;

    if (!auth0Id) {
      return res.status(400).send({ error: "Auth0 ID is required" });
    }

    // Try to find existing user by auth0Id first
    let user = await User.findOne({ where: { auth0Id } });

    if (!user && email) {
      // If no user found by auth0Id, try to find by email
      user = await User.findOne({ where: { email } });

      if (user) {
        // Update existing user with auth0Id
        user.auth0Id = auth0Id;
        await user.save();
      }
    }

    if (!user) {
      // Create new user if not found
      const userData = {
        auth0Id,
        email: email || null,
        username: username || email?.split("@")[0] || `user_${Date.now()}`, // Use email prefix as username if no username provided
        passwordHash: null, // Auth0 users don't have passwords
      };

      // Ensure username is unique
      let finalUsername = userData.username;
      let counter = 1;
      while (await User.findOne({ where: { username: finalUsername } })) {
        finalUsername = `${userData.username}_${counter}`;
        counter++;
      }
      userData.username = finalUsername;

      user = await User.create(userData);
    }

    // Generate JWT token with auth0Id included
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        auth0Id: user.auth0Id,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.send({
      message: "Auth0 authentication successful",
      user: {
        id: user.id,
        username: user.username,
        auth0Id: user.auth0Id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Auth0 authentication error:", error);
    res.sendStatus(500);
  }
});

// Signup route
router.post("/signup", async (req, res) => {
  try {
    const { username, firstName, lastName, password, email } = req.body;

    console.log("📝 Signup attempt:", {
      username,
      firstName,
      lastName,
      email,
      passwordProvided: !!password,
    });

    if (!username || !password) {
      return res
        .status(400)
        .send({ error: "Username and password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .send({ error: "Password must be at least 6 characters long" });
    }

    // Check if user already exists by username
    const existingUserByUsername = await User.findOne({ where: { username } });
    if (existingUserByUsername) {
      return res.status(409).send({ error: "Username already exists" });
    }

    // Check if user already exists by email (if email provided)
    if (email) {
      const existingUserByEmail = await User.findOne({ where: { email } });
      if (existingUserByEmail) {
        return res.status(409).send({ error: "Email already exists" });
      }
    }

    // Create new user
    const passwordHash = User.hashPassword(password);
    const userData = {
      firstName,
      lastName,
      username,
      email: email || null, // Handle optional email
      passwordHash,
    };

    console.log("🔨 Creating user with data:", {
      ...userData,
      passwordHash: "[HIDDEN]",
    });

    const user = await User.create(userData);

    console.log("✅ User created successfully:", {
      id: user.id,
      username: user.username,
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        auth0Id: user.auth0Id,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.send({
      message: "User created successfully",
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (error) {
    console.error("❌ Signup error:", error);
    console.error("❌ Error details:", {
      message: error.message,
      name: error.name,
      sql: error.sql,
      fields: error.fields,
    });

    // Send more specific error messages
    if (error.name === "SequelizeUniqueConstraintError") {
      return res
        .status(409)
        .send({ error: "Username or email already exists" });
    }

    if (error.name === "SequelizeValidationError") {
      return res
        .status(400)
        .send({ error: error.errors.map((e) => e.message).join(", ") });
    }

    res.status(500).send({ error: "Internal server error during signup" });
  }
});

// Login route
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).send({ error: "Username and password are required" });
      return;
    }

    // Find user
    const user = await User.findOne({ where: { username } });

    if (!user) {
      return res.status(401).send({ error: "Invalid credentials" });
    }

    // Check password
    if (!user.checkPassword(password)) {
      return res.status(401).send({ error: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        auth0Id: user.auth0Id,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.send({
      message: "Login successful",
      user: { id: user.id, username: user.username },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.sendStatus(500);
  }
});

// Logout route
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.send({ message: "Logout successful" });
});

// Get current user route (protected)
router.get("/me", (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.send({});
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).send({ error: "Invalid or expired token" });
    }
    res.send({ user: user });
  });
});

// ─────────────────────────────────────────────────────────────
// GOOGLE OAUTH ROUTES (Manual Implementation)
// ─────────────────────────────────────────────────────────────

// Initiate Google OAuth
router.get("/google", (req, res) => {
  const authUrl = googleOAuth.getAuthUrl();
  console.log("🚀 Redirecting to Google OAuth:", authUrl);
  res.redirect(authUrl);
});

// Handle Google OAuth callback
router.get("/google/callback", async (req, res) => {
  try {
    const { code, error } = req.query;

    if (error) {
      console.error("❌ Google OAuth error:", error);
      return res.redirect(
        `${
          process.env.FRONTEND_URL || "http://localhost:3000"
        }/login?error=oauth_failed`
      );
    }

    if (!code) {
      console.error("❌ No authorization code received");
      return res.redirect(
        `${
          process.env.FRONTEND_URL || "http://localhost:3000"
        }/login?error=oauth_failed`
      );
    }

    console.log("🔄 Processing Google OAuth callback with code...");

    // Exchange code for access token
    const tokenData = await googleOAuth.getAccessToken(code);
    console.log("✅ Access token received");

    // Get user profile from Google
    const profile = await googleOAuth.getUserProfile(tokenData.access_token);
    console.log("✅ User profile received");

    // Process user (create/find in database)
    const user = await googleOAuth.processGoogleUser(profile);
    console.log("🎉 Google OAuth successful for user:", user.username);

    // Generate JWT token (SAME format as regular login)
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        auth0Id: user.auth0Id,
        googleId: user.googleId,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Set SAME httpOnly cookie as regular login
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    console.log("✅ JWT token set for Google user:", user.username);

    // Redirect to frontend homepage
    res.redirect(process.env.FRONTEND_URL || "http://localhost:3000");
  } catch (error) {
    console.error("❌ Google OAuth callback error:", error);
    res.redirect(
      `${
        process.env.FRONTEND_URL || "http://localhost:3000"
      }/login?error=oauth_error`
    );
  }
});

module.exports = { router, authenticateJWT };
