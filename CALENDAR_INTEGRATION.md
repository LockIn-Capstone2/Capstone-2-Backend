# Google Calendar Integration

This document provides comprehensive information about the Google Calendar integration implementation for the task management application.

## Overview

The calendar integration allows users to:

- Grant Google Calendar permissions
- Create calendar events from tasks
- Update and delete calendar events
- Sync tasks with calendar events
- Manage calendar reminders

## Architecture

### Manual OAuth Flow

The implementation uses a **manual OAuth flow** instead of Passport.js for better control and flexibility:

- **`config/googleOAuth.js`**: Core OAuth helper functions
- **`services/CalendarService.js`**: Calendar API operations
- **`api/calendar.js`**: Calendar REST endpoints
- **`auth/index.js`**: OAuth callback handlers

## Database Schema Changes

### User Model Updates

```javascript
// New fields added to User model
googleAccessToken: DataTypes.TEXT,     // Google API access token
googleRefreshToken: DataTypes.TEXT,    // Google API refresh token
calendarPermissions: DataTypes.BOOLEAN // Whether user granted calendar access
```

### Task Model Updates

```javascript
// New fields added to Task model
calendarEventId: DataTypes.STRING,  // Google Calendar event ID
hasReminder: DataTypes.BOOLEAN      // Whether task has calendar reminder
```

## Setup Instructions

### 1. Environment Variables

Ensure these variables are set in your `.env` file:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
BACKEND_URL=http://localhost:8080
FRONTEND_URL=http://localhost:3000
```

### 2. Database Migration

Run the migration to add new fields:

```bash
node database/migrate-calendar.js
```

### 3. Test Integration

Verify everything is working:

```bash
node test-calendar.js
```

## API Endpoints

### Authentication Endpoints

#### Get Calendar Permission URL

```http
GET /api/calendar/permissions/url
Authorization: Bearer <jwt_token>
```

Returns a Google OAuth URL for calendar permissions.

#### Calendar Permission Callback

```http
GET /auth/google/calendar/callback?code=<auth_code>&state=<user_id>
```

Handles the OAuth callback and stores calendar tokens. Redirects to:

- Success: `http://localhost:3000/Tasks?calendar_success=permissions_granted`
- Error: `http://localhost:3000/Tasks?calendar_error=<error_type>`

### Calendar Management Endpoints

#### Check Calendar Permissions

```http
GET /api/calendar/permissions
Authorization: Bearer <jwt_token>
```

Returns user's calendar permission status.

#### Get User's Calendars

```http
GET /api/calendar/calendars
Authorization: Bearer <jwt_token>
```

Returns list of user's Google Calendars.

#### Get Calendar Events

```http
GET /api/calendar/events?timeMin=2024-01-01T00:00:00Z&timeMax=2024-12-31T23:59:59Z
Authorization: Bearer <jwt_token>
```

Returns calendar events within specified time range.

### Event Management Endpoints

#### Create Calendar Event

```http
POST /api/calendar/events
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "title": "Complete Project",
  "description": "Finish the task management app",
  "startTime": "2024-01-15T10:00:00Z",
  "endTime": "2024-01-15T11:00:00Z",
  "timeZone": "America/New_York",
  "taskId": 123
}
```

#### Update Calendar Event

```http
PUT /api/calendar/events/{eventId}
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "title": "Updated Event Title",
  "startTime": "2024-01-15T11:00:00Z",
  "endTime": "2024-01-15T12:00:00Z"
}
```

#### Delete Calendar Event

```http
DELETE /api/calendar/events/{eventId}
Authorization: Bearer <jwt_token>
```

### Task-Calendar Sync Endpoints

#### Sync Task with Calendar

```http
POST /api/calendar/sync-task/{taskId}
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "startTime": "2024-01-15T14:00:00Z",
  "endTime": "2024-01-15T15:00:00Z",
  "timeZone": "America/New_York"
}
```

#### Remove Task Calendar Sync

```http
DELETE /api/calendar/sync-task/{taskId}
Authorization: Bearer <jwt_token>
```

## Usage Flow

### 1. Initial Setup

1. User logs in through existing auth system
2. User requests calendar permissions via `/api/calendar/permissions/url`
3. User is redirected to Google OAuth consent screen
4. After consent, user is redirected back to `/auth/google/calendar/callback`
5. Backend stores access and refresh tokens

### 2. Creating Calendar Events

1. User creates or edits a task
2. Frontend sends request to `/api/calendar/sync-task/{taskId}` with timing info
3. Backend creates Google Calendar event
4. Task is updated with `calendarEventId` and `hasReminder: true`

### 3. Managing Events

1. User can view calendar events via `/api/calendar/events`
2. User can update events via `/api/calendar/events/{eventId}`
3. User can delete events via `/api/calendar/events/{eventId}`
4. Task sync is automatically maintained

## Error Handling

The implementation includes comprehensive error handling:

### Token Refresh

- Automatically refreshes expired access tokens using refresh tokens
- Graceful fallback when refresh fails
- Clear error messages for permission issues

### API Errors

- Standardized error responses
- Specific error codes for different scenarios
- Logging for debugging

### Common Error Responses

```json
// Permission required
{
  "error": "Calendar permissions required",
  "needsPermission": true
}

// Authentication failed
{
  "error": "User not authenticated with Google Calendar"
}

// Validation error
{
  "error": "Title, start time, and end time are required"
}
```

## Security Considerations

### Token Storage

- Access tokens stored in database (encrypted in production)
- Refresh tokens stored securely
- Tokens scoped to minimum required permissions

### API Protection

- All endpoints require JWT authentication
- User can only access their own calendar data
- Input validation on all calendar operations

### OAuth Security

- Uses PKCE flow where possible
- State parameter for CSRF protection
- Secure redirect URI validation

## Frontend Integration

### Calendar Permission Flow

```javascript
// Check if user has calendar permissions
const checkCalendarPermissions = async () => {
  const response = await fetch("/api/calendar/permissions", {
    credentials: "include",
  });
  const data = await response.json();
  return data.hasPermissions;
};

// Request calendar permissions
const requestCalendarPermissions = async () => {
  const response = await fetch("/api/calendar/permissions/url", {
    credentials: "include",
  });
  const data = await response.json();
  window.location.href = data.permissionUrl;
};
```

### Creating Calendar Events

```javascript
// Sync task with calendar
const syncTaskWithCalendar = async (taskId, eventData) => {
  const response = await fetch(`/api/calendar/sync-task/${taskId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(eventData),
  });

  if (!response.ok) {
    const error = await response.json();
    if (error.needsPermission) {
      // Redirect to permissions flow
      await requestCalendarPermissions();
      return;
    }
    throw new Error(error.error);
  }

  return await response.json();
};
```

## Testing

### Unit Tests

Run the calendar integration tests:

```bash
node test-calendar.js
```

### Integration Tests

1. Start the server: `npm run start-dev`
2. Use Postman or curl to test API endpoints
3. Verify calendar events appear in Google Calendar

### Test Scenarios

- [ ] User can request calendar permissions
- [ ] OAuth callback processes correctly
- [ ] Calendar events are created successfully
- [ ] Events sync with tasks properly
- [ ] Token refresh works automatically
- [ ] Error handling works correctly

## Troubleshooting

### Common Issues

#### "Calendar permissions required"

- User needs to grant calendar permissions
- Check if user completed OAuth flow
- Verify tokens are stored in database

#### "Failed to refresh access token"

- Refresh token may be expired or invalid
- User needs to re-authorize
- Check Google Cloud Console settings

#### "Calendar API error: 401"

- Access token expired and refresh failed
- User needs to re-authorize
- Check token storage

### Debug Steps

1. Check environment variables are set
2. Verify database migration completed
3. Test OAuth flow manually
4. Check server logs for specific errors
5. Verify Google Cloud Console configuration

## Deployment Notes

### Production Environment

- Set `NODE_ENV=production`
- Use HTTPS for OAuth callbacks
- Set secure cookie flags
- Use proper database encryption

### Google Cloud Console

- Configure OAuth consent screen
- Add production domain to authorized origins
- Set up proper redirect URIs
- Enable Calendar API

## Future Enhancements

### Potential Features

- Multiple calendar support
- Recurring event support
- Calendar event templates
- Bulk calendar operations
- Calendar sync status dashboard
- Email notifications for events

### Performance Optimizations

- Batch calendar operations
- Caching for calendar data
- Incremental sync
- Background job processing

---

For questions or issues, please refer to the main project documentation or create an issue in the repository.
