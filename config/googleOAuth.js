const { User } = require("../database");

// Manual Google OAuth helper functions
const googleOAuth = {
  // Generate Google OAuth URL (basic profile + email)
  getAuthUrl() {
    const baseUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: `${
        process.env.BACKEND_URL || "http://localhost:8080"
      }/auth/google/callback`,
      response_type: "code",
      scope: "profile email",
      access_type: "offline",
    });
    return `${baseUrl}?${params.toString()}`;
  },

  // Generate Google OAuth URL with Calendar permissions
  getCalendarAuthUrl(userId) {
    const baseUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: `${
        process.env.BACKEND_URL || "http://localhost:8080"
      }/auth/google/calendar/callback`,
      response_type: "code",
      scope: "profile email https://www.googleapis.com/auth/calendar.events",
      access_type: "offline",
      prompt: "consent", // Force consent to get refresh token
      state: userId, // Pass user ID to identify user in callback
    });
    return `${baseUrl}?${params.toString()}`;
  },

  // Exchange authorization code for access token
  async getAccessToken(code, isCalendarFlow = false) {
    const redirectUri = isCalendarFlow
      ? `${
          process.env.BACKEND_URL || "http://localhost:8080"
        }/auth/google/calendar/callback`
      : `${
          process.env.BACKEND_URL || "http://localhost:8080"
        }/auth/google/callback`;

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to get access token");
    }

    return await response.json();
  },

  // Exchange authorization code for access token specifically for calendar permissions
  async getAccessTokenWithCalendarScopes(code) {
    const redirectUri = `${
      process.env.BACKEND_URL || "http://localhost:8080"
    }/auth/google/calendar/callback`;

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to get calendar access token: ${
          errorData.error || response.statusText
        }`
      );
    }

    return await response.json();
  },

  // Refresh access token using refresh token
  async refreshAccessToken(refreshToken) {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh access token");
    }

    return await response.json();
  },

  // Get user profile from Google
  async getUserProfile(accessToken) {
    const response = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`
    );

    if (!response.ok) {
      throw new Error("Failed to get user profile");
    }

    return await response.json();
  },

  // Process Google user and create/find in database
  async processGoogleUser(profile) {
    try {
      console.log("🔍 Google OAuth Profile:", {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        firstName: profile.given_name,
        lastName: profile.family_name,
        picture: profile.picture,
      });

      const googleId = profile.id;
      const email = profile.email;
      const firstName = profile.given_name;
      const lastName = profile.family_name;
      const profilePicture = profile.picture;

      // 1. Check if user exists by googleId
      let user = await User.findOne({ where: { googleId } });

      if (user) {
        console.log("✅ Existing Google user found:", user.username);
        return user;
      }

      // 2. If not found by googleId, check by email (link existing account)
      if (email) {
        user = await User.findOne({ where: { email } });

        if (user) {
          console.log(
            "🔗 Linking Google account to existing user:",
            user.username
          );
          // Link Google account to existing user
          user.googleId = googleId;
          user.profilePicture = profilePicture;
          await user.save();
          return user;
        }
      }

      // 3. Create new user
      console.log("🆕 Creating new Google user");

      // Generate unique username from email or Google name
      let username =
        email?.split("@")[0] ||
        profile.name?.replace(/\s+/g, "").toLowerCase() ||
        `google_user_${Date.now()}`;

      // Ensure username is unique
      let finalUsername = username;
      let counter = 1;
      while (await User.findOne({ where: { username: finalUsername } })) {
        finalUsername = `${username}_${counter}`;
        counter++;
      }

      const userData = {
        googleId,
        email: email || null,
        firstName: firstName || null,
        lastName: lastName || null,
        username: finalUsername,
        profilePicture: profilePicture || null,
        passwordHash: null, // Google users don't have passwords
      };

      user = await User.create(userData);
      console.log("✅ New Google user created:", user.username);

      return user;
    } catch (error) {
      console.error("❌ Google OAuth error:", error);
      throw error;
    }
  },
};

module.exports = googleOAuth;
