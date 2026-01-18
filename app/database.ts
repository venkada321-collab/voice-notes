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

// Helper to ensure DB connection is valid (fixes background resume issue)
const ensureDbConnection = async () => {
  if (!db) {
    db = await SQLite.openDatabaseAsync('fission.db');
  }
  return db;
};

// --- API FUNCTIONS ---

// 1. Get all Pills (Meetings)
export const getMeetings = async () => {
  const conn = await ensureDbConnection();
  return await conn.getAllAsync('SELECT * FROM meetings');
};

// 2. Get Tasks for a specific Pill
export const getTasksForMeeting = async (meetingId: number) => {
  const conn = await ensureDbConnection();
  return await conn.getAllAsync('SELECT * FROM tasks WHERE meeting_id = ?', [meetingId]);
};

// 3. Add a new Task
export const addTask = async (meetingId: number, content: string) => {
  const conn = await ensureDbConnection();
  const statement = await conn.prepareAsync('INSERT INTO tasks (meeting_id, content) VALUES (?, ?)');
  try {
    await statement.executeAsync([meetingId, content]);
  } finally {
    await statement.finalizeAsync();
  }
};

// 4. Delete a Task
export const deleteTask = async (taskId: number) => {
  const conn = await ensureDbConnection();
  const statement = await conn.prepareAsync('DELETE FROM tasks WHERE id = ?');
  try {
    await statement.executeAsync([taskId]);
  } finally {
    await statement.finalizeAsync();
  }
};

// 5. Add a new Meeting (Pill) - Transcription is now ephemeral and not saved
export const addMeeting = async (title: string) => {
  const conn = await ensureDbConnection();
  const statement = await conn.prepareAsync('INSERT INTO meetings (title) VALUES (?)');
  try {
    await statement.executeAsync([title]);
  } finally {
    await statement.finalizeAsync();
  }
};

// 6. Delete a Meeting (and its tasks)
export const deleteMeeting = async (meetingId: number) => {
  const conn = await ensureDbConnection();
  // Manual cascade delete
  const taskStmt = await conn.prepareAsync('DELETE FROM tasks WHERE meeting_id = ?');
  try {
    await taskStmt.executeAsync([meetingId]);
  } finally {
    await taskStmt.finalizeAsync();
  }

  const meetingStmt = await conn.prepareAsync('DELETE FROM meetings WHERE id = ?');
  try {
    await meetingStmt.executeAsync([meetingId]);
  } finally {
    await meetingStmt.finalizeAsync();
  }
};

// 7. Update Meeting Title
export const updateMeeting = async (meetingId: number, title: string) => {
  const conn = await ensureDbConnection();
  const statement = await conn.prepareAsync('UPDATE meetings SET title = ? WHERE id = ?');
  try {
    await statement.executeAsync([title, meetingId]);
  } finally {
    await statement.finalizeAsync();
  }
};

// 8. Update Task Content
export const updateTask = async (taskId: number, content: string) => {
  const conn = await ensureDbConnection();
  const statement = await conn.prepareAsync('UPDATE tasks SET content = ? WHERE id = ?');
  try {
    await statement.executeAsync([content, taskId]);
  } finally {
    await statement.finalizeAsync();
  }
};

// 9. Key-Value Settings (Persistent Preferences)
export const getSetting = async (key: string): Promise<string | null> => {
  try {
    const conn = await ensureDbConnection();
    const result = await conn.getFirstAsync('SELECT value FROM settings WHERE key = ?', [key]);
    return result ? result.value : null;
  } catch (e) {
    return null;
  }
};

export const setSetting = async (key: string, value: string) => {
  const conn = await ensureDbConnection();
  const statement = await conn.prepareAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  try {
    await statement.executeAsync([key, value]);
  } finally {
    await statement.finalizeAsync();
  }
};