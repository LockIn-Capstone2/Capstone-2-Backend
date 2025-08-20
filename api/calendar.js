const express = require("express");
const CalendarService = require("../services/CalendarService");
const { authenticateJWT } = require("../auth");
const { User, Tasks } = require("../database");

const router = express.Router();
const calendarService = new CalendarService();

// Check if user has calendar permissions
router.get("/permissions", authenticateJWT, async (req, res) => {
  try {
    console.log("🔍 Checking calendar permissions for user:", req.user.id);

    const user = await User.findByPk(req.user.id);

    if (!user) {
      console.error("❌ User not found:", req.user.id);
      return res.status(404).json({ error: "User not found" });
    }

    console.log("📊 User calendar data:", {
      id: user.id,
      googleAccessToken: !!user.googleAccessToken,
      googleRefreshToken: !!user.googleRefreshToken,
      calendarPermissions: user.calendarPermissions,
    });

    const hasPermissions = calendarService.hasCalendarPermissions(user);

    console.log("✅ Calendar permissions check result:", hasPermissions);

    res.json({
      hasPermissions,
      calendarPermissions: user.calendarPermissions || false,
      hasTokens: !!(user.googleAccessToken && user.googleRefreshToken),
    });
  } catch (error) {
    console.error("❌ Error checking calendar permissions:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: "Failed to check calendar permissions",
      details: error.message,
    });
  }
});

// Get calendar permission URL
router.get("/permissions/url", authenticateJWT, (req, res) => {
  try {
    console.log("🔗 Generating calendar permission URL for user:", req.user.id);
    const permissionUrl = calendarService.getCalendarPermissionUrl(req.user.id);
    console.log(
      "✅ Permission URL generated:",
      permissionUrl.substring(0, 100) + "..."
    );
    res.json({ permissionUrl });
  } catch (error) {
    console.error("❌ Error generating calendar permission URL:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: "Failed to generate permission URL",
      details: error.message,
    });
  }
});

// Get user's calendars
router.get("/calendars", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!calendarService.hasCalendarPermissions(user)) {
      return res.status(403).json({
        error: "Calendar permissions required",
        needsPermission: true,
      });
    }

    const calendars = await calendarService.getCalendars(user);
    res.json(calendars);
  } catch (error) {
    console.error("Error fetching calendars:", error);

    if (error.message.includes("not authenticated")) {
      return res.status(403).json({
        error: "Calendar permissions required",
        needsPermission: true,
      });
    }

    res.status(500).json({ error: "Failed to fetch calendars" });
  }
});

// Get calendar events
router.get("/events", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!calendarService.hasCalendarPermissions(user)) {
      return res.status(403).json({
        error: "Calendar permissions required",
        needsPermission: true,
      });
    }

    const options = {
      calendarId: req.query.calendarId,
      timeMin: req.query.timeMin,
      timeMax: req.query.timeMax,
      maxResults: req.query.maxResults
        ? parseInt(req.query.maxResults)
        : undefined,
      singleEvents: req.query.singleEvents !== "false",
      orderBy: req.query.orderBy || "startTime",
    };

    const events = await calendarService.getEvents(user, options);
    res.json(events);
  } catch (error) {
    console.error("Error fetching calendar events:", error);

    if (error.message.includes("not authenticated")) {
      return res.status(403).json({
        error: "Calendar permissions required",
        needsPermission: true,
      });
    }

    res.status(500).json({ error: "Failed to fetch calendar events" });
  }
});

// Create calendar event from task
router.post("/events", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!calendarService.hasCalendarPermissions(user)) {
      return res.status(403).json({
        error: "Calendar permissions required",
        needsPermission: true,
      });
    }

    const {
      title,
      description,
      startTime,
      endTime,
      timeZone,
      calendarId,
      reminders,
      taskId,
    } = req.body;

    // Validate required fields
    if (!title || !startTime || !endTime) {
      return res.status(400).json({
        error: "Title, start time, and end time are required",
      });
    }

    const eventData = {
      title,
      description,
      startTime,
      endTime,
      timeZone,
      calendarId,
      reminders,
    };

    const event = await calendarService.createEvent(user, eventData);

    // If this event is for a task, update the task with the calendar event ID
    if (taskId) {
      const task = await Tasks.findOne({
        where: { id: taskId, user_id: user.id },
      });

      if (task) {
        task.calendarEventId = event.id;
        task.hasReminder = true;
        await task.save();
      }
    }

    res.status(201).json({
      success: true,
      event,
      message: "Calendar event created successfully",
    });
  } catch (error) {
    console.error("Error creating calendar event:", error);

    if (error.message.includes("not authenticated")) {
      return res.status(403).json({
        error: "Calendar permissions required",
        needsPermission: true,
      });
    }

    res.status(500).json({ error: "Failed to create calendar event" });
  }
});

// Update calendar event
router.put("/events/:eventId", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!calendarService.hasCalendarPermissions(user)) {
      return res.status(403).json({
        error: "Calendar permissions required",
        needsPermission: true,
      });
    }

    const { eventId } = req.params;
    const {
      title,
      description,
      startTime,
      endTime,
      timeZone,
      calendarId,
      reminders,
    } = req.body;

    // Validate required fields
    if (!title || !startTime || !endTime) {
      return res.status(400).json({
        error: "Title, start time, and end time are required",
      });
    }

    const eventData = {
      title,
      description,
      startTime,
      endTime,
      timeZone,
      reminders,
    };

    const event = await calendarService.updateEvent(
      user,
      eventId,
      eventData,
      calendarId || "primary"
    );

    res.json({
      success: true,
      event,
      message: "Calendar event updated successfully",
    });
  } catch (error) {
    console.error("Error updating calendar event:", error);

    if (error.message.includes("not authenticated")) {
      return res.status(403).json({
        error: "Calendar permissions required",
        needsPermission: true,
      });
    }

    res.status(500).json({ error: "Failed to update calendar event" });
  }
});

// Delete calendar event
router.delete("/events/:eventId", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!calendarService.hasCalendarPermissions(user)) {
      return res.status(403).json({
        error: "Calendar permissions required",
        needsPermission: true,
      });
    }

    const { eventId } = req.params;
    const { calendarId } = req.query;

    await calendarService.deleteEvent(user, eventId, calendarId || "primary");

    // Remove calendar event ID from any associated task
    const task = await Tasks.findOne({
      where: { calendarEventId: eventId, user_id: user.id },
    });

    if (task) {
      task.calendarEventId = null;
      task.hasReminder = false;
      await task.save();
    }

    res.json({
      success: true,
      message: "Calendar event deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting calendar event:", error);

    if (error.message.includes("not authenticated")) {
      return res.status(403).json({
        error: "Calendar permissions required",
        needsPermission: true,
      });
    }

    res.status(500).json({ error: "Failed to delete calendar event" });
  }
});

// Sync task with calendar (create/update calendar event for a task)
router.post("/sync-task/:taskId", authenticateJWT, async (req, res) => {
  try {
    console.log(
      "🔄 Syncing task with calendar. TaskID:",
      req.params.taskId,
      "UserID:",
      req.user.id
    );

    const user = await User.findByPk(req.user.id);

    if (!user) {
      console.error("❌ User not found for sync-task:", req.user.id);
      return res.status(404).json({ error: "User not found" });
    }

    console.log("📊 User calendar permissions:", {
      hasGoogleAccessToken: !!user.googleAccessToken,
      hasGoogleRefreshToken: !!user.googleRefreshToken,
      calendarPermissions: user.calendarPermissions,
    });

    if (!calendarService.hasCalendarPermissions(user)) {
      console.log(
        "⚠️ User does not have calendar permissions, returning graceful failure"
      );
      return res.status(200).json({
        success: false,
        error: "Calendar permissions required",
        needsPermission: true,
        message:
          "Task created successfully, but calendar sync skipped (no permissions)",
      });
    }

    const { taskId } = req.params;
    const { startTime, endTime, timeZone, calendarId, reminders } = req.body;

    // Find the task
    const task = await Tasks.findOne({
      where: { id: taskId, user_id: user.id },
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Validate required fields
    if (!startTime || !endTime) {
      console.log("⚠️ No timing data provided for calendar sync");
      return res.status(400).json({
        success: false,
        error: "Start time and end time are required for calendar sync",
        message: "Please provide start time and end time to sync with calendar",
        needsTiming: true,
      });
    }

    const eventData = {
      title: task.assignment,
      description: task.description || `Task: ${task.assignment}`,
      startTime,
      endTime,
      timeZone,
      calendarId,
      reminders,
    };

    let event;

    // If task already has a calendar event, update it
    if (task.calendarEventId) {
      try {
        event = await calendarService.updateEvent(
          user,
          task.calendarEventId,
          eventData,
          calendarId || "primary"
        );
      } catch (error) {
        // If update fails (e.g., event was deleted), create a new one
        console.log(
          "Failed to update existing event, creating new one:",
          error.message
        );
        event = await calendarService.createEvent(user, eventData);
        task.calendarEventId = event.id;
      }
    } else {
      // Create new calendar event
      event = await calendarService.createEvent(user, eventData);
      task.calendarEventId = event.id;
    }

    task.hasReminder = true;
    await task.save();

    res.json({
      success: true,
      event,
      task,
      message: "Task synced with calendar successfully",
    });
  } catch (error) {
    console.error("❌ Error syncing task with calendar:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      taskId: req.params.taskId,
      userId: req.user.id,
    });

    if (error.message.includes("not authenticated")) {
      return res.status(403).json({
        error: "Calendar permissions required",
        needsPermission: true,
      });
    }

    // Check if this is a token refresh failure
    if (
      error.message.includes("Failed to refresh access token") ||
      error.message.includes("temporarily unavailable")
    ) {
      // Reset calendar permissions for this user since tokens are invalid
      user.calendarPermissions = false;
      user.googleAccessToken = null;
      user.googleRefreshToken = null;
      await user.save();

      console.log(
        "🔄 Reset calendar permissions for user due to invalid tokens"
      );

      return res.status(200).json({
        success: false,
        error: "Calendar authorization expired",
        needsPermission: true,
        message:
          "Task created successfully, but calendar sync failed (please re-authorize Google Calendar)",
      });
    }

    res.status(500).json({
      error: "Failed to sync task with calendar",
      details: error.message,
    });
  }
});

// Remove calendar sync from task
router.delete("/sync-task/:taskId", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const { taskId } = req.params;

    // Find the task
    const task = await Tasks.findOne({
      where: { id: taskId, user_id: user.id },
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Delete calendar event if it exists
    if (task.calendarEventId && calendarService.hasCalendarPermissions(user)) {
      try {
        await calendarService.deleteEvent(user, task.calendarEventId);
      } catch (error) {
        console.log(
          "Failed to delete calendar event (may already be deleted):",
          error.message
        );
      }
    }

    // Remove calendar sync from task
    task.calendarEventId = null;
    task.hasReminder = false;
    await task.save();

    res.json({
      success: true,
      task,
      message: "Calendar sync removed from task",
    });
  } catch (error) {
    console.error("Error removing calendar sync from task:", error);
    res.status(500).json({ error: "Failed to remove calendar sync from task" });
  }
});

module.exports = router;
