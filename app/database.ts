import * as SQLite from 'expo-sqlite';

// Open the database (creates it if it doesn't exist)
let db: any;

export const initDatabase = async () => {
  db = await SQLite.openDatabaseAsync('voiceNotes.db');
  // Create two tables: one for Pills (Meetings), one for Tasks
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      transcription TEXT
    );
    
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER,
      content TEXT NOT NULL,
      is_done INTEGER DEFAULT 0,
      FOREIGN KEY (meeting_id) REFERENCES meetings (id)
    );
  `);

  // --- SEED DATA (Only runs if empty) ---
  const result = await db.getAllSync('SELECT * FROM meetings');
  if (result != null) {
    if (result.length === 0) {
      await db.execAsync(`
        INSERT INTO meetings (title) VALUES ('Meeting 1'), ('Meeting 2'), ('Meeting 3');
        INSERT INTO tasks (meeting_id, content) VALUES 
        (1, 'Do this'), (1, 'Do that'), (2, 'Review notes'), (3, 'Email client');
    `);
    }
  }
};

// --- API FUNCTIONS ---

// 1. Get all Pills (Meetings)
export const getMeetings = async () => {
  return await db.getAllAsync('SELECT * FROM meetings'); // Returns [{id: 1, title: 'Meeting 1'}, ...]
};

// 2. Get Tasks for a specific Pill
export const getTasksForMeeting = async (meetingId: number) => {
  return await db.getAllAsync('SELECT * FROM tasks WHERE meeting_id = ?', [meetingId]);
};

// 3. Add a new Task
export const addTask = async (meetingId: number, content: string) => {
  const statement = await db.prepareAsync('INSERT INTO tasks (meeting_id, content) VALUES (?, ?)');
  try {
    await statement.executeAsync([meetingId, content]);
  } finally {
    await statement.finalizeAsync();
  }
};

// 4. Delete a Task
export const deleteTask = async (taskId: number) => {
  const statement = await db.prepareAsync('DELETE FROM tasks WHERE id = ?');
  try {
    await statement.executeAsync([taskId]);
  } finally {
    await statement.finalizeAsync();
  }
};

// 5. Add a new Meeting (Pill)
export const addMeeting = async (title: string, transcription: string = '') => {
  const statement = await db.prepareAsync('INSERT INTO meetings (title, transcription) VALUES (?, ?)');
  try {
    await statement.executeAsync([title, transcription]);
  } finally {
    await statement.finalizeAsync();
  }
};

// 6. Delete a Meeting (and its tasks)
export const deleteMeeting = async (meetingId: number) => {
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
};

// 7. Update Meeting Title
export const updateMeeting = async (meetingId: number, title: string) => {
  const statement = await db.prepareAsync('UPDATE meetings SET title = ? WHERE id = ?');
  try {
    await statement.executeAsync([title, meetingId]);
  } finally {
    await statement.finalizeAsync();
  }
};

// 8. Update Task Content
export const updateTask = async (taskId: number, content: string) => {
  const statement = await db.prepareAsync('UPDATE tasks SET content = ? WHERE id = ?');
  try {
    await statement.executeAsync([content, taskId]);
  } finally {
    await statement.finalizeAsync();
  }
};