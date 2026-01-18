import * as SQLite from 'expo-sqlite';

// Open the database (creates it if it doesn't exist)
let db: any = null;

export const initDatabase = async () => {
  db = await SQLite.openDatabaseAsync('fission.db');
  // Create two tables: one for Pills (Meetings), one for Tasks
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER,
      content TEXT NOT NULL,
      is_done INTEGER DEFAULT 0,
      FOREIGN KEY (meeting_id) REFERENCES meetings (id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // --- SEED DATA REMOVED ---
  // Default behavior: Start empty.
};

// Wrapper to handle stale connection errors with automatic retry
// Also ensures db is initialized before first use
const withRetry = async <T>(operation: () => Promise<T>): Promise<T> => {
  // Ensure db is initialized
  if (!db) {
    db = await SQLite.openDatabaseAsync('fission.db');
  }

  try {
    return await operation();
  } catch (e: any) {
    // Check if it's a stale connection error (NullPointerException)
    if (e?.message?.includes('NullPointerException') || e?.message?.includes('prepareAsync')) {

      // Close existing connection if it exists
      try {
        if (db && typeof db.closeAsync === 'function') {
          await db.closeAsync();
        }
      } catch (closeErr) {
        console.log('Error closing stale connection:', closeErr);
      }

      // Open fresh connection
      db = await SQLite.openDatabaseAsync('fission.db', { useNewConnection: true });

      try {
        return await operation(); // Retry once
      } catch (retryError: any) {
        throw retryError;
      }
    }
    throw e; // Re-throw other errors
  }
};

// --- API FUNCTIONS ---

// 1. Get all Pills (Meetings)
export const getMeetings = async () => {
  return withRetry(async () => {
    return await db.getAllAsync('SELECT * FROM meetings');
  });
};

// 2. Get Tasks for a specific Pill
export const getTasksForMeeting = async (meetingId: number) => {
  return withRetry(async () => {
    return await db.getAllAsync('SELECT * FROM tasks WHERE meeting_id = ?', [meetingId]);
  });
};

// 3. Add a new Task
export const addTask = async (meetingId: number, content: string) => {
  return withRetry(async () => {
    const statement = await db.prepareAsync('INSERT INTO tasks (meeting_id, content) VALUES (?, ?)');
    try {
      await statement.executeAsync([meetingId, content]);
    } finally {
      await statement.finalizeAsync();
    }
  });
};

// 4. Delete a Task
export const deleteTask = async (taskId: number) => {
  return withRetry(async () => {
    const statement = await db.prepareAsync('DELETE FROM tasks WHERE id = ?');
    try {
      await statement.executeAsync([taskId]);
    } finally {
      await statement.finalizeAsync();
    }
  });
};

// 5. Add a new Meeting (Pill) - Transcription is now ephemeral and not saved
export const addMeeting = async (title: string) => {
  return withRetry(async () => {
    const statement = await db.prepareAsync('INSERT INTO meetings (title) VALUES (?)');
    try {
      await statement.executeAsync([title]);
    } finally {
      await statement.finalizeAsync();
    }
  });
};

// 6. Delete a Meeting (and its tasks)
export const deleteMeeting = async (meetingId: number) => {
  return withRetry(async () => {
    // Manual cascade delete
    const taskStmt = await db.prepareAsync('DELETE FROM tasks WHERE meeting_id = ?');
    try {
      await taskStmt.executeAsync([meetingId]);
    } finally {
      await taskStmt.finalizeAsync();
    }

    const meetingStmt = await db.prepareAsync('DELETE FROM meetings WHERE id = ?');
    try {
      await meetingStmt.executeAsync([meetingId]);
    } finally {
      await meetingStmt.finalizeAsync();
    }
  });
};

// 7. Update Meeting Title
export const updateMeeting = async (meetingId: number, title: string) => {
  return withRetry(async () => {
    const statement = await db.prepareAsync('UPDATE meetings SET title = ? WHERE id = ?');
    try {
      await statement.executeAsync([title, meetingId]);
    } finally {
      await statement.finalizeAsync();
    }
  });
};

// 8. Update Task Content
export const updateTask = async (taskId: number, content: string) => {
  return withRetry(async () => {
    const statement = await db.prepareAsync('UPDATE tasks SET content = ? WHERE id = ?');
    try {
      await statement.executeAsync([content, taskId]);
    } finally {
      await statement.finalizeAsync();
    }
  });
};

// 9. Key-Value Settings (Persistent Preferences)
export const getSetting = async (key: string): Promise<string | null> => {
  return withRetry(async () => {
    try {
      const result = await db.getFirstAsync('SELECT value FROM settings WHERE key = ?', [key]);
      return result ? result.value : null;
    } catch (e) {
      return null;
    }
  });
};

export const setSetting = async (key: string, value: string) => {
  return withRetry(async () => {
    const statement = await db.prepareAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    try {
      await statement.executeAsync([key, value]);
    } finally {
      await statement.finalizeAsync();
    }
  });
};