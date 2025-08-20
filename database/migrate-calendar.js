const { db, User, Tasks } = require("./index");

async function migrateCalendarFields() {
  try {
    console.log("🔄 Starting calendar fields migration...");

    // Check if we need to sync the database (add new columns)
    await db.sync({ alter: true });

    console.log("✅ Database schema updated with calendar fields");

    // Update existing users to have default calendar permission values
    const usersUpdated = await User.update(
      {
        calendarPermissions: false,
      },
      {
        where: {
          calendarPermissions: null,
        },
      }
    );

    console.log(
      `📝 Updated ${usersUpdated[0]} users with default calendar permissions`
    );

    // Update existing tasks to have default reminder values
    const tasksUpdated = await Tasks.update(
      {
        hasReminder: false,
      },
      {
        where: {
          hasReminder: null,
        },
      }
    );

    console.log(
      `📝 Updated ${tasksUpdated[0]} tasks with default reminder values`
    );

    console.log("🎉 Calendar fields migration completed successfully!");
  } catch (error) {
    console.error("❌ Calendar fields migration failed:", error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateCalendarFields()
    .then(() => {
      console.log("✅ Migration complete");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Migration failed:", error);
      process.exit(1);
    });
}

module.exports = { migrateCalendarFields };
