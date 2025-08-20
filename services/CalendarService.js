const { User } = require("../database");

// Try to use native fetch, fallback to node-fetch for older Node versions
let fetch;
let URLSearchParams;

try {
  // Try native fetch first
  if (globalThis.fetch && globalThis.URLSearchParams) {
    fetch = globalThis.fetch;
    URLSearchParams = globalThis.URLSearchParams;
    console.log("🌐 Using native fetch and URLSearchParams");
  } else {
    throw new Error("Native fetch not available");
  }
} catch (error) {
  try {
    // Fallback to node-fetch
    fetch = require("node-fetch");
    URLSearchParams = require("url").URLSearchParams;
    console.log("📦 Using node-fetch and Node.js URLSearchParams");
  } catch (fetchError) {
    console.error(
      "❌ Neither native fetch nor node-fetch available:",
      fetchError
    );
    throw new Error(
      "Fetch not available. Please install node-fetch: npm install node-fetch"
    );
  }
}

class CalendarService {
  constructor() {
    this.calendarApiUrl = "https://www.googleapis.com/calendar/v3";
  }

  // Get calendar scopes for OAuth
  static getCalendarScopes() {
    return [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ];
  }

  // Refresh access token using refresh token
  async refreshAccessToken(user) {
    if (!user.googleRefreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          refresh_token: user.googleRefreshToken,
          grant_type: "refresh_token",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ Token refresh failed:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(
          `Failed to refresh access token: ${response.status} ${
            errorData.error?.message || response.statusText
          }`
        );
      }

      const data = await response.json();

      // Update user's access token
      user.googleAccessToken = data.access_token;
      await user.save();

      return data.access_token;
    } catch (error) {
      console.error("Error refreshing access token:", error);
      throw error;
    }
  }

  // Make authenticated request to Google Calendar API
  async makeCalendarRequest(user, endpoint, options = {}) {
    console.log(
      `🔍 Making calendar request: ${options.method || "GET"} ${endpoint}`
    );

    try {
      let accessToken = user.googleAccessToken;

      if (!accessToken) {
        throw new Error(
          "User not authenticated with Google Calendar - no access token"
        );
      }

      console.log(`🔑 Using access token: ${accessToken.substring(0, 20)}...`);

      // Try request with current token
      let response = await this.attemptRequest(accessToken, endpoint, options);
      console.log(`📡 Initial response status: ${response.status}`);

      // If unauthorized, try refreshing token
      if (response.status === 401) {
        console.log("🔄 Access token expired, refreshing...");
        accessToken = await this.refreshAccessToken(user);
        console.log(`🔑 New access token: ${accessToken.substring(0, 20)}...`);
        response = await this.attemptRequest(accessToken, endpoint, options);
        console.log(`📡 Retry response status: ${response.status}`);
      }

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          errorData = { error: { message: "Could not parse error response" } };
        }

        console.error(`❌ Calendar API error response:`, {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });

        throw new Error(
          `Calendar API error: ${response.status} - ${
            errorData.error?.message || response.statusText
          }`
        );
      }

      console.log("✅ Calendar API request successful");
      return await response.json();
    } catch (error) {
      console.error("❌ Calendar API request failed:", {
        message: error.message,
        stack: error.stack,
        endpoint,
        method: options.method || "GET",
      });
      throw new Error(
        `Calendar service temporarily unavailable: ${error.message}`
      );
    }
  }

  // Helper method to attempt API request
  async attemptRequest(accessToken, endpoint, options) {
    const url = `${this.calendarApiUrl}${endpoint}`;

    return await fetch(url, {
      method: options.method || "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  }

  // Get user's calendars
  async getCalendars(user) {
    if (!user.googleAccessToken) {
      throw new Error("User not authenticated with Google Calendar");
    }

    return await this.makeCalendarRequest(user, "/calendars");
  }

  // Create calendar event
  async createEvent(user, eventData) {
    if (!user.googleAccessToken) {
      throw new Error("User not authenticated with Google Calendar");
    }

    const calendarId = eventData.calendarId || "primary";

    // Format event for Google Calendar API
    const googleEvent = {
      summary: eventData.title,
      description: eventData.description || "",
      start: {
        dateTime: eventData.startTime,
        timeZone: eventData.timeZone || "America/New_York",
      },
      end: {
        dateTime: eventData.endTime,
        timeZone: eventData.timeZone || "America/New_York",
      },
      reminders: {
        useDefault: false,
        overrides: eventData.reminders || [
          { method: "email", minutes: 24 * 60 }, // 1 day before
          { method: "popup", minutes: 10 }, // 10 minutes before
        ],
      },
    };

    const response = await this.makeCalendarRequest(
      user,
      `/calendars/${calendarId}/events`,
      {
        method: "POST",
        body: googleEvent,
      }
    );

    return response;
  }

  // Update calendar event
  async updateEvent(user, eventId, eventData, calendarId = "primary") {
    if (!user.googleAccessToken) {
      throw new Error("User not authenticated with Google Calendar");
    }

    // Format event for Google Calendar API
    const googleEvent = {
      summary: eventData.title,
      description: eventData.description || "",
      start: {
        dateTime: eventData.startTime,
        timeZone: eventData.timeZone || "America/New_York",
      },
      end: {
        dateTime: eventData.endTime,
        timeZone: eventData.timeZone || "America/New_York",
      },
      reminders: {
        useDefault: false,
        overrides: eventData.reminders || [
          { method: "email", minutes: 24 * 60 },
          { method: "popup", minutes: 10 },
        ],
      },
    };

    const response = await this.makeCalendarRequest(
      user,
      `/calendars/${calendarId}/events/${eventId}`,
      {
        method: "PUT",
        body: googleEvent,
      }
    );

    return response;
  }

  // Delete calendar event
  async deleteEvent(user, eventId, calendarId = "primary") {
    if (!user.googleAccessToken) {
      throw new Error("User not authenticated with Google Calendar");
    }

    await this.makeCalendarRequest(
      user,
      `/calendars/${calendarId}/events/${eventId}`,
      {
        method: "DELETE",
      }
    );

    return { success: true, message: "Event deleted successfully" };
  }

  // Get calendar events
  async getEvents(user, options = {}) {
    if (!user.googleAccessToken) {
      throw new Error("User not authenticated with Google Calendar");
    }

    const calendarId = options.calendarId || "primary";
    const params = new URLSearchParams();

    if (options.timeMin) params.append("timeMin", options.timeMin);
    if (options.timeMax) params.append("timeMax", options.timeMax);
    if (options.maxResults) params.append("maxResults", options.maxResults);
    if (options.singleEvents !== undefined)
      params.append("singleEvents", options.singleEvents);
    if (options.orderBy) params.append("orderBy", options.orderBy);

    const endpoint = `/calendars/${calendarId}/events${
      params.toString() ? `?${params.toString()}` : ""
    }`;

    const response = await this.makeCalendarRequest(user, endpoint);
    return response;
  }

  // Check if user has calendar permissions
  hasCalendarPermissions(user) {
    return !!(user.googleAccessToken && user.calendarPermissions);
  }

  // Generate calendar permission URL
  getCalendarPermissionUrl(userId) {
    const baseUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    const scopes = CalendarService.getCalendarScopes().join(" ");

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: `${
        process.env.BACKEND_URL || "http://localhost:8080"
      }/auth/google/calendar/callback`,
      response_type: "code",
      scope: scopes,
      access_type: "offline",
      prompt: "consent", // Force consent to get refresh token
      state: userId, // Pass user ID to identify user in callback
    });

    return `${baseUrl}?${params.toString()}`;
  }
}

module.exports = CalendarService;
