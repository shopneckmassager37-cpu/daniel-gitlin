import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from 'better-sqlite3';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase Client (if available)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const isPlaceholder = (val?: string) => !val || val.includes('placeholder') || val.includes('EXAMPLE');

const supabase = (supabaseUrl && supabaseKey && !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseKey)) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

if (supabase) {
  console.log("Supabase client initialized.");
} else {
  console.log("Supabase credentials missing, using local SQLite only.");
}

// Initialize SQLite Database
console.log("Initializing database...");
let db: any;

// Helper for Supabase sync
async function syncToSupabase(table: string, data: any) {
  if (!supabase) return;
  try {
    const { error } = await supabase.from(table).upsert(data);
    if (error) console.warn(`Supabase sync warning (${table}):`, error.message);
  } catch (e) {
    console.error(`Supabase sync exception (${table}):`, e);
  }
}

async function deleteFromSupabase(table: string, id: string, idColumn: string = 'id') {
  if (!supabase) return;
  try {
    const { error } = await supabase.from(table).delete().eq(idColumn, id);
    if (error) console.warn(`Supabase delete warning (${table}):`, error.message);
  } catch (e) {
    console.error(`Supabase delete exception (${table}):`, e);
  }
}
try {
  db = new Database('lumdim.db');
  console.log("Database initialized successfully.");
} catch (err) {
  console.error("Failed to initialize file-based database, falling back to in-memory:", err);
  try {
    db = new Database(':memory:');
    console.log("In-memory database initialized.");
  } catch (memErr) {
    console.error("Failed to initialize in-memory database:", memErr);
    process.exit(1);
  }
}

// Create tables if they don't exist
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT,
      name TEXT,
      role TEXT,
      data TEXT -- JSON string for extra fields
    );
  `);

  // Migration: remove unique constraint from email if it exists
  try {
      const tableInfo = db.prepare("PRAGMA table_info(users)").all();
      // Check if we need to migrate (this is a bit tricky in SQLite, 
      // but we can check if we've already done it or just try to recreate)
      // For simplicity in this environment, we'll just ensure the table 
      // matches our new schema if it's already there.
      // A more robust way is to check the index list.
      const indexList = db.prepare("PRAGMA index_list(users)").all();
      let hasEmailUnique = false;
      for (const idx of indexList) {
        if (idx.unique === 1 && idx.origin === 'u') {
          const idxInfo = db.prepare(`PRAGMA index_info('${idx.name}')`).all();
          if (idxInfo.some((col: any) => col.name === 'email')) {
            hasEmailUnique = true;
            break;
          }
        }
      }
      
      if (hasEmailUnique) {
        console.log("Migrating users table to remove UNIQUE constraint on email...");
        db.exec(`
          DROP TABLE IF EXISTS users_new;
          CREATE TABLE users_new (
            id TEXT PRIMARY KEY,
            email TEXT,
            name TEXT,
            role TEXT,
            data TEXT
          );
          INSERT INTO users_new SELECT id, email, name, role, data FROM users;
          DROP TABLE users;
          ALTER TABLE users_new RENAME TO users;
        `);
        console.log("Migration completed successfully.");
      }
    } catch (migrationErr) {
      console.error("Migration failed (users table):", migrationErr);
    }

    db.exec(`
    CREATE TABLE IF NOT EXISTS classrooms (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE,
      name TEXT,
      subject TEXT,
      grade TEXT,
      teacher_id TEXT,
      data TEXT -- JSON string for extra fields
    );

    CREATE INDEX IF NOT EXISTS idx_classrooms_teacher_id ON classrooms(teacher_id);
    CREATE INDEX IF NOT EXISTS idx_classrooms_code ON classrooms(code);

    -- Ensure code is populated for existing classrooms
    UPDATE classrooms SET code = id WHERE code IS NULL;


    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      type TEXT,
      title TEXT,
      message TEXT,
      timestamp INTEGER,
      is_read INTEGER DEFAULT 0,
      link TEXT,
      data TEXT -- JSON string for extra fields
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

    CREATE TABLE IF NOT EXISTS parent_verifications (
      user_id TEXT PRIMARY KEY,
      parent_email TEXT,
      otp TEXT,
      expires_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      timestamp INTEGER,
      subject TEXT,
      grade TEXT,
      type TEXT,
      title TEXT,
      is_correct INTEGER,
      content TEXT,
      details TEXT -- JSON string for extra fields
    );

    CREATE INDEX IF NOT EXISTS idx_history_user_id ON history(user_id);

    CREATE TABLE IF NOT EXISTS stats (
      user_id TEXT,
      subject TEXT,
      correct INTEGER,
      total INTEGER,
      PRIMARY KEY (user_id, subject)
    );

    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      title TEXT,
      type TEXT,
      subject TEXT,
      grade TEXT,
      teacher_id TEXT,
      timestamp INTEGER,
      data TEXT -- JSON string for extra fields
    );
  `);
  console.log("Tables created or already exist.");
} catch (err) {
  console.error("Failed to create tables:", err);
  process.exit(1);
}

// Helper to get Kinde Management API Token
async function getKindeManagementToken(domain: string, clientId: string, clientSecret: string, scopes: string) {
  const cleanClientId = clientId.trim();
  const cleanClientSecret = clientSecret.trim();
  
  let normalizedDomain = domain.trim().replace(/\/+$/, "").replace(/\/api$/, "");
  // If it's just a subdomain, append .kinde.com
  if (!normalizedDomain.includes('.') && !normalizedDomain.startsWith('http')) {
    normalizedDomain = `${normalizedDomain}.kinde.com`;
  }
  
  const kindeBaseUrl = normalizedDomain.startsWith('http') ? normalizedDomain : `https://${normalizedDomain}`;
  const tokenUrl = `${kindeBaseUrl}/oauth2/token`;
  
  // Try multiple common audiences if not explicitly provided
  const audiences = process.env.KINDE_MANAGEMENT_AUDIENCE 
    ? [process.env.KINDE_MANAGEMENT_AUDIENCE] 
    : [`${kindeBaseUrl}/api`, kindeBaseUrl, "https://api.kinde.com"];

  console.log(`[Kinde Auth] Attempting token fetch for domain: ${kindeBaseUrl}`);
  console.log(`[Kinde Auth] Token URL: ${tokenUrl}`);
  
  let lastResponseText = "";
  let lastStatus = 0;

  for (const audience of audiences) {
    for (const includeScope of [true, false]) {
      console.log(`[Kinde Auth] Trying audience: ${audience} (includeScope: ${includeScope})`);
      
      try {
        const params: any = {
          grant_type: "client_credentials",
          client_id: cleanClientId,
          client_secret: cleanClientSecret,
          audience: audience,
        };
        if (includeScope && scopes) {
          params.scope = scopes;
        }

        let response = await fetch(tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(params),
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`[Kinde Auth] Successfully obtained token with audience: ${audience}`);
          return { access_token: data.access_token, kindeBaseUrl };
        }

        lastStatus = response.status;
        lastResponseText = await response.text();
        console.warn(`[Kinde Auth] Failed with audience ${audience} (scope: ${includeScope}): ${lastStatus} ${lastResponseText}`);
        
        // If it's a 401, try Basic Auth fallback for this audience
        if (lastStatus === 401) {
          console.log(`[Kinde Auth] Retrying audience ${audience} with Basic Auth...`);
          const authHeader = Buffer.from(`${cleanClientId}:${cleanClientSecret}`).toString('base64');
          const basicParams: any = {
            grant_type: "client_credentials",
            audience: audience,
          };
          if (includeScope && scopes) {
            basicParams.scope = scopes;
          }

          response = await fetch(tokenUrl, {
            method: "POST",
            headers: { 
              "Content-Type": "application/x-www-form-urlencoded",
              "Authorization": `Basic ${authHeader}`
            },
            body: new URLSearchParams(basicParams),
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`[Kinde Auth] Successfully obtained token (Basic Auth) with audience: ${audience}`);
            return { access_token: data.access_token, kindeBaseUrl };
          }
          lastStatus = response.status;
          lastResponseText = await response.text();
        }
      } catch (e: any) {
        console.error(`[Kinde Auth] Fetch error for audience ${audience}:`, e.message);
        lastResponseText = e.message;
      }
    }
  }

  // If we reach here, all audiences failed
  console.error(`[Kinde Auth] All token acquisition attempts failed. Last status: ${lastStatus}`);
  
  let userFriendlyError = `Failed to get Kinde token: ${lastResponseText} (Status: ${lastStatus}).`;
  
  if (lastStatus === 401 || lastResponseText.includes("invalid_client")) {
    userFriendlyError += "\n\nCRITICAL CHECKLIST FOR 'invalid_client':\n" +
      "1. Are you using the Client ID/Secret from a 'Machine to Machine' application? (Regular Web/SPA apps will NOT work here).\n" +
      "2. Is the M2M application 'Authorized' for the 'Kinde Management API' under the 'APIs' tab in Kinde?\n" +
      "3. Did you copy the 'Client Secret' correctly? It is different from the 'Client ID'.\n" +
      "4. Ensure there are no hidden spaces in your environment variables.";
  } else if (lastResponseText.includes("not_found") || lastStatus === 400 || lastStatus === 404) {
    userFriendlyError += "\n\nCRITICAL CHECKLIST FOR 'not_found' / 400:\n" +
      "1. Ensure your KINDE_DOMAIN is correct (e.g., yourdomain.kinde.com).\n" +
      "2. Check if the 'Audience' in Kinde (Settings -> APIs -> Kinde Management API) matches exactly what we tried.\n" +
      "3. If you have a custom domain, ensure it is configured correctly in Kinde.";
  }
  
  throw new Error(userFriendlyError);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // API Routes
  app.get("/api/users/:id", (req, res) => {
    try {
      const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any;
      if (!row) return res.status(404).json({ error: "User not found" });
      const user = {
        ...JSON.parse(row.data || '{}'),
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role
      };
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/users", (req, res) => {
    try {
      const rows = db.prepare('SELECT * FROM users').all();
      const users = rows.map((row: any) => ({
        ...JSON.parse(row.data || '{}'),
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role
      }));
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/users", async (req, res) => {
    const user = req.body;
    try {
      const { id, email, name, role, ...extra } = user;
      const stmt = db.prepare(`
        INSERT INTO users (id, email, name, role, data)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          email = excluded.email,
          name = excluded.name,
          role = excluded.role,
          data = excluded.data
      `);
      stmt.run(id, email, name, role, JSON.stringify(extra));
      
      // Sync to Supabase
      await syncToSupabase('users', { id, email, name, role, data: JSON.stringify(extra) });

      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/classrooms", async (req, res) => {
    const userId = req.query.userId as string;
    const code = req.query.code as string;
    
    console.log(`[API] Fetching classrooms for userId: ${userId}, code: ${code}`);

    if (!userId && !code) {
      return res.status(400).json({ error: "Missing userId or code" });
    }

    try {
      let rows: any[] = [];
      if (code) {
        console.log(`[API] Querying local DB for code: ${code}`);
        rows = db.prepare('SELECT * FROM classrooms WHERE code = ? OR id = ?').all(code, code);
        
        // Also fetch from Supabase to ensure we have the latest list
        if (supabase) {
          try {
            console.log(`[API] Querying Supabase for code: ${code}`);
            // Manual timeout for Supabase query
            const supabaseQuery = supabase
              .from('classrooms')
              .select('*')
              .or(`code.eq.${code},id.eq.${code}`);
            
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Supabase timeout')), 4000)
            );

            const { data, error } = await Promise.race([supabaseQuery, timeoutPromise]) as any;
            
            if (error) {
              console.error(`[API] Supabase error for code ${code}:`, error);
            } else if (data && data.length > 0) {
              console.log(`[API] Found in Supabase, updating local DB`);
              const item = data[0];
              const insert = db.prepare(`
                INSERT INTO classrooms (id, code, name, subject, grade, teacher_id, data)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  code = excluded.code,
                  name = excluded.name,
                  subject = excluded.subject,
                  grade = excluded.grade,
                  teacher_id = excluded.teacher_id,
                  data = excluded.data
              `);
              insert.run(item.id, item.code, item.name, item.subject, item.grade, item.teacher_id, item.data);
              rows = [item];
            }
          } catch (supabaseErr) {
            console.error(`[API] Supabase exception for code ${code}:`, supabaseErr);
          }
        }
      } else if (userId) {
        console.log(`[API] Querying local DB for userId: ${userId}`);
        rows = db.prepare('SELECT * FROM classrooms WHERE teacher_id = ? OR data LIKE ?').all(userId, `%${userId}%`);
        
        // Also fetch from Supabase to ensure we have the latest list
        if (supabase) {
          try {
            console.log(`[API] Querying Supabase for userId: ${userId}`);
            // Use correct PostgREST syntax for .or() with ilike: column.ilike.*value*
            const supabaseQuery = supabase
              .from('classrooms')
              .select('*')
              .or(`teacher_id.eq.${userId},data.ilike.*${userId}*`);
            
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Supabase timeout')), 4000)
            );

            const { data, error } = await Promise.race([supabaseQuery, timeoutPromise]) as any;
            
            if (error) {
              console.error(`[API] Supabase error for userId ${userId}:`, error);
            } else if (data && data.length > 0) {
              console.log(`[API] Found ${data.length} classrooms in Supabase, updating local DB`);
              const insert = db.prepare(`
                INSERT INTO classrooms (id, code, name, subject, grade, teacher_id, data)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  code = excluded.code,
                  name = excluded.name,
                  subject = excluded.subject,
                  grade = excluded.grade,
                  teacher_id = excluded.teacher_id,
                  data = excluded.data
              `);
              
              for (const item of data) {
                insert.run(item.id, item.code || item.id, item.name, item.subject, item.grade, item.teacher_id, item.data);
                // Update rows with the latest data from Supabase
                const existingIndex = rows.findIndex((r: any) => r.id === item.id);
                if (existingIndex >= 0) {
                  rows[existingIndex] = item;
                } else {
                  rows.push(item);
                }
              }
            }
          } catch (supabaseErr) {
            console.error(`[API] Supabase exception for userId ${userId}:`, supabaseErr);
          }
        }
      } else {
        rows = db.prepare('SELECT * FROM classrooms').all();
      }
      
      const classrooms = rows.map((row: any) => ({
        ...JSON.parse(row.data || '{}'),
        id: row.id,
        code: row.code || row.id,
        name: row.name,
        subject: row.subject,
        grade: row.grade,
        teacherId: row.teacher_id
      }));
      
      // Secondary filter for studentIds in JSON data if needed
      const filtered = (userId && !code) ? classrooms.filter((c: any) => c.teacherId === userId || c.studentIds?.includes(userId)) : classrooms;
      
      res.json(filtered);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/classrooms", async (req, res) => {
    const classroom = req.body;
    try {
      const { id, code, name, subject, grade, teacherId, ...extra } = classroom;
      const finalCode = code || id;
      const stmt = db.prepare(`
        INSERT INTO classrooms (id, code, name, subject, grade, teacher_id, data)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          code = excluded.code,
          name = excluded.name,
          subject = excluded.subject,
          grade = excluded.grade,
          teacher_id = excluded.teacher_id,
          data = excluded.data
      `);
      stmt.run(id, finalCode, name, subject, grade, teacherId, JSON.stringify(extra));
      
      // Sync to Supabase
      await syncToSupabase('classrooms', { 
        id, 
        code: finalCode, 
        name, 
        subject, 
        grade, 
        teacher_id: teacherId, 
        data: JSON.stringify(extra) 
      });

      res.json(classroom);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/classrooms/sync", async (req, res) => {
    const classrooms = req.body;
    try {
      const insert = db.prepare(`
        INSERT INTO classrooms (id, code, name, subject, grade, teacher_id, data)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          code = excluded.code,
          name = excluded.name,
          subject = excluded.subject,
          grade = excluded.grade,
          teacher_id = excluded.teacher_id,
          data = excluded.data
      `);
      
      const transaction = db.transaction((items) => {
        for (const item of items) {
          const { id, code, name, subject, grade, teacherId, ...extra } = item;
          const finalCode = code || id;
          insert.run(id, finalCode, name, subject, grade, teacherId, JSON.stringify(extra));
        }
      });
      
      transaction(classrooms);

      // Sync to Supabase outside the transaction
      if (supabase) {
        await Promise.all(classrooms.map((item: any) => {
          const { id, code, name, subject, grade, teacherId, ...extra } = item;
          const finalCode = code || id;
          return syncToSupabase('classrooms', { 
            id, 
            code: finalCode, 
            name, 
            subject, 
            grade, 
            teacher_id: teacherId, 
            data: JSON.stringify(extra) 
          });
        }));
      }

      res.json({ status: "ok" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/users/sync", async (req, res) => {
    const users = req.body;
    try {
      const insert = db.prepare(`
        INSERT INTO users (id, email, name, role, data)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          email = excluded.email,
          name = excluded.name,
          role = excluded.role,
          data = excluded.data
      `);
      
      const transaction = db.transaction((items) => {
        for (const item of items) {
          const { id, email, name, role, ...extra } = item;
          insert.run(id, email, name, role, JSON.stringify(extra));
        }
      });
      
      transaction(users);

      // Sync to Supabase outside the transaction
      if (supabase) {
        await Promise.all(users.map((item: any) => {
          const { id, email, name, role, ...extra } = item;
          return syncToSupabase('users', { id, email, name, role, data: JSON.stringify(extra) });
        }));
      }

      res.json({ status: "ok" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/register", async (req, res) => {
    const newUser = req.body;
    try {
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(newUser.email);
      if (existing) {
        return res.status(400).json({ error: "משתמש כבר קיים במערכת" });
      }

      const { id, email, name, role, ...extra } = newUser;
      db.prepare('INSERT INTO users (id, email, name, role, data) VALUES (?, ?, ?, ?, ?)')
        .run(id, email, name, role, JSON.stringify(extra));

      // Sync to Supabase
      await syncToSupabase('users', { id, email, name, role, data: JSON.stringify(extra) });

      res.json(newUser);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/classrooms/:id", async (req, res) => {
    const id = req.params.id;
    const updates = req.body;
    try {
      const current = db.prepare('SELECT * FROM classrooms WHERE id = ?').get(id) as any;
      if (!current) return res.status(404).json({ error: "Classroom not found" });

      const currentData = JSON.parse(current.data || '{}');
      const { name, subject, grade, teacher_id, data, ...rest } = { ...current, ...updates };
      
      // Merge extra data
      const finalData = { ...JSON.parse(current.data || '{}'), ...updates };
      delete (finalData as any).name;
      delete (finalData as any).subject;
      delete (finalData as any).grade;
      delete (finalData as any).teacher_id;

      db.prepare(`
        UPDATE classrooms SET
          name = ?, subject = ?, grade = ?, teacher_id = ?, data = ?
        WHERE id = ?
      `).run(updates.name || current.name, updates.subject || current.subject, updates.grade || current.grade, updates.teacherId || current.teacher_id, JSON.stringify(finalData), id);
      
      // Sync to Supabase
      await syncToSupabase('classrooms', { 
        id, 
        name: updates.name || current.name, 
        subject: updates.subject || current.subject, 
        grade: updates.grade || current.grade, 
        teacher_id: updates.teacherId || current.teacher_id, 
        data: JSON.stringify(finalData) 
      });

      res.json({ id, ...current, ...updates, data: finalData });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/classrooms/:id", async (req, res) => {
    const id = req.params.id;
    try {
      db.prepare('DELETE FROM classrooms WHERE id = ?').run(id);
      
      // Sync to Supabase
      await deleteFromSupabase('classrooms', id);

      res.json({ status: "ok" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Notifications API
  app.get("/api/notifications", (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    try {
      const rows = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY timestamp DESC LIMIT 50').all(userId);
      const notifications = rows.map((row: any) => ({
        ...JSON.parse(row.data || '{}'),
        id: row.id,
        userId: row.user_id,
        type: row.type,
        title: row.title,
        message: row.message,
        timestamp: row.timestamp,
        isRead: row.is_read === 1,
        link: row.link
      }));
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/notifications", async (req, res) => {
    const notification = req.body;
    try {
      const { id, userId, type, title, message, timestamp, isRead, link, ...extra } = notification;
      const stmt = db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, message, timestamp, is_read, link, data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(id, userId, type, title, message, timestamp || Date.now(), isRead ? 1 : 0, link, JSON.stringify(extra));
      
      // Sync to Supabase
      await syncToSupabase('notifications', { 
        id, 
        user_id: userId, 
        type, 
        title, 
        message, 
        timestamp: timestamp || Date.now(), 
        is_read: isRead ? 1 : 0, 
        link, 
        data: JSON.stringify(extra) 
      });

      res.json(notification);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/notifications/:id", async (req, res) => {
    const id = req.params.id;
    const { isRead } = req.body;
    try {
      db.prepare('UPDATE notifications SET is_read = ? WHERE id = ?').run(isRead ? 1 : 0, id);
      await syncToSupabase('notifications', { id, is_read: isRead ? 1 : 0 });
      res.json({ status: "ok" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/notifications/mark-all-read", async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    try {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
      // Note: Syncing all to Supabase might be slow if there are many, 
      // but usually we only have a few recent ones.
      // For now, we'll just update local DB and assume Supabase sync happens eventually or is less critical for "read" status.
      res.json({ status: "ok" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // History API
  app.get("/api/history", (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    try {
      const rows = db.prepare('SELECT * FROM history WHERE user_id = ? ORDER BY timestamp DESC').all(userId);
      const history = rows.map((row: any) => ({
        ...JSON.parse(row.details || '{}'),
        id: row.id,
        timestamp: row.timestamp,
        subject: row.subject,
        grade: row.grade,
        type: row.type,
        title: row.title,
        isCorrect: row.is_correct === 1,
        content: row.content
      }));
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/history", async (req, res) => {
    const { userId, item } = req.body;
    if (!userId || !item) return res.status(400).json({ error: "Missing data" });
    try {
      const { id, timestamp, subject, grade, type, title, isCorrect, content, details, ...rest } = item;
      const stmt = db.prepare(`
        INSERT INTO history (id, user_id, timestamp, subject, grade, type, title, is_correct, content, details)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          timestamp = excluded.timestamp,
          subject = excluded.subject,
          grade = excluded.grade,
          type = excluded.type,
          title = excluded.title,
          is_correct = excluded.is_correct,
          content = excluded.content,
          details = excluded.details
      `);
      stmt.run(id, userId, timestamp, subject, grade, type, title, isCorrect ? 1 : 0, content, JSON.stringify({ ...details, ...rest }));
      
      // Sync to Supabase
      await syncToSupabase('history', { 
        id, 
        user_id: userId, 
        timestamp, 
        subject, 
        grade, 
        type, 
        title, 
        is_correct: isCorrect ? 1 : 0, 
        content, 
        details: JSON.stringify({ ...details, ...rest }) 
      });

      res.json(item);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/history/:id", (req, res) => {
    try {
      db.prepare('DELETE FROM history WHERE id = ?').run(req.params.id);
      
      // Sync to Supabase
      deleteFromSupabase('history', req.params.id);

      res.json({ status: "ok" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/history/user/:userId", (req, res) => {
    try {
      db.prepare('DELETE FROM history WHERE user_id = ?').run(req.params.userId);
      
      // Sync to Supabase
      deleteFromSupabase('history', req.params.userId, 'user_id');

      res.json({ status: "ok" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Stats API
  app.get("/api/stats", (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    try {
      const rows = db.prepare('SELECT * FROM stats WHERE user_id = ?').all(userId);
      res.json(rows.map((row: any) => ({
        subject: row.subject,
        correct: row.correct,
        total: row.total
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/stats", async (req, res) => {
    const { userId, stats } = req.body;
    if (!userId || !stats) return res.status(400).json({ error: "Missing data" });
    try {
      const stmt = db.prepare(`
        INSERT INTO stats (user_id, subject, correct, total)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, subject) DO UPDATE SET
          correct = excluded.correct,
          total = excluded.total
      `);
      
      const transaction = db.transaction((items) => {
        for (const stat of items) {
          stmt.run(userId, stat.subject, stat.correct, stat.total);
        }
      });
      
      transaction(stats);

      // Sync each to Supabase outside the transaction
      if (supabase) {
        await Promise.all(stats.map((stat: any) => 
          syncToSupabase('stats', { user_id: userId, subject: stat.subject, correct: stat.correct, total: stat.total })
        ));
      }

      res.json({ status: "ok" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Games API
  app.get("/api/games", (req, res) => {
    const userId = req.query.userId;
    try {
      let rows;
      if (userId) {
        rows = db.prepare('SELECT * FROM games WHERE teacher_id = ? OR data LIKE ?').all(userId, `%${userId}%`);
      } else {
        rows = db.prepare('SELECT * FROM games').all();
      }
      const games = rows.map((row: any) => ({
        ...JSON.parse(row.data || '{}'),
        id: row.id,
        title: row.title,
        type: row.type,
        subject: row.subject,
        grade: row.grade,
        teacherId: row.teacher_id,
        timestamp: row.timestamp
      }));
      res.json(games);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/games", async (req, res) => {
    const game = req.body;
    try {
      const { id, title, type, subject, grade, teacherId, timestamp, ...extra } = game;
      const stmt = db.prepare(`
        INSERT INTO games (id, title, type, subject, grade, teacher_id, timestamp, data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          type = excluded.type,
          subject = excluded.subject,
          grade = excluded.grade,
          teacher_id = excluded.teacher_id,
          timestamp = excluded.timestamp,
          data = excluded.data
      `);
      stmt.run(id, title, type, subject, grade, teacherId, timestamp, JSON.stringify(extra));
      
      // Sync to Supabase
      await syncToSupabase('games', { 
        id, 
        title, 
        type, 
        subject, 
        grade, 
        teacher_id: teacherId, 
        timestamp, 
        data: JSON.stringify(extra) 
      });

      res.json(game);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Kinde Role Update Endpoint
  app.post("/api/admin/update-kinde-role", async (req, res) => {
    const { userId, plan } = req.body;
    
    if (!userId || !plan) {
      return res.status(400).json({ error: "Missing userId or plan" });
    }

    const kindeDomain = process.env.KINDE_DOMAIN || process.env.VITE_KINDE_DOMAIN;
    const clientId = process.env.KINDE_MANAGEMENT_CLIENT_ID;
    const clientSecret = process.env.KINDE_MANAGEMENT_CLIENT_SECRET;

    if (!kindeDomain || !clientId || !clientSecret) {
      console.warn("Kinde Management API credentials missing", { 
        kindeDomain: !!kindeDomain, 
        clientId: !!clientId, 
        clientSecret: !!clientSecret 
      });
      return res.status(500).json({ 
        error: "Kinde Management API not configured. Please ensure KINDE_DOMAIN, KINDE_MANAGEMENT_CLIENT_ID, and KINDE_MANAGEMENT_CLIENT_SECRET are set in your environment." 
      });
    }

    try {
      // 1. Get user role from DB to know which Pro role to use
      const userRow = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as any;
      if (!userRow) {
        return res.status(404).json({ error: "User not found in local database" });
      }
      const userRole = userRow.role || 'STUDENT';

      // 2. Determine the Pro Role ID from environment
      const proRoleId = userRole === 'TEACHER' 
        ? process.env.KINDE_ROLE_ID_TEACHER_PRO 
        : process.env.KINDE_ROLE_ID_STUDENT_PRO;

      if (!proRoleId) {
        console.warn(`Kinde Pro Role ID missing for role: ${userRole}`);
        return res.status(500).json({ error: `Kinde Pro Role ID not configured for ${userRole}` });
      }

  // 3. Get Kinde Access Token
      const { access_token, kindeBaseUrl } = await getKindeManagementToken(
        kindeDomain, 
        clientId, 
        clientSecret, 
        "read:organizations read:roles write:roles"
      );

      let orgCode = process.env.KINDE_ORGANIZATION_CODE;

      if (!orgCode) {
        const orgsResponse = await fetch(`${kindeBaseUrl}/api/v1/organizations`, {
          headers: {
            "Authorization": `Bearer ${access_token}`,
            "Accept": "application/json",
          },
        });

        if (!orgsResponse.ok) {
          const err = await orgsResponse.text();
          throw new Error(`Failed to fetch Kinde organizations: ${err}`);
        }

        const { organizations } = await orgsResponse.json();
        if (!organizations || organizations.length === 0) {
          throw new Error("No Kinde organizations found");
        }

        orgCode = organizations[0].code;
      }

      if (plan === 'Pro') {
        // Assign role using organization-scoped endpoint
        const roleAssignResponse = await fetch(`${kindeBaseUrl}/api/v1/organizations/${orgCode}/users/${userId}/roles`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${access_token}`,
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({ role_ids: [proRoleId] }),
        });

        if (!roleAssignResponse.ok) {
          const err = await roleAssignResponse.text();
          throw new Error(`Failed to assign Kinde role: ${err}`);
        }
      } else {
        // Downgrade: Remove the Pro role
        const roleRemoveResponse = await fetch(`${kindeBaseUrl}/api/v1/organizations/${orgCode}/users/${userId}/roles/${proRoleId}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${access_token}`,
            "Accept": "application/json",
          },
        });

        if (!roleRemoveResponse.ok) {
          const err = await roleRemoveResponse.text();
          // If role wasn't there, it might 404, which is fine for a downgrade
          if (roleRemoveResponse.status !== 404) {
            throw new Error(`Failed to remove Kinde role: ${err}`);
          }
        }
      }

      res.json({ status: "ok", message: `Kinde role updated to ${plan} successfully` });
    } catch (error: any) {
      console.error("Kinde Role Update Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/classrooms/:id/leave", async (req, res) => {
    const id = req.params.id;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    try {
      const current = db.prepare('SELECT * FROM classrooms WHERE id = ?').get(id) as any;
      if (!current) return res.status(404).json({ error: "Classroom not found" });

      const currentData = JSON.parse(current.data || '{}');
      const studentIds = currentData.studentIds || [];
      const updatedStudentIds = studentIds.filter((sid: string) => sid !== userId);

      const finalData = { ...currentData, studentIds: updatedStudentIds };

      db.prepare(`
        UPDATE classrooms SET data = ? WHERE id = ?
      `).run(JSON.stringify(finalData), id);
      
      // Sync to Supabase
      await syncToSupabase('classrooms', { 
        id, 
        data: JSON.stringify(finalData) 
      });

      res.json({ status: "ok" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // PayPal Subscription Cancellation Endpoint
  app.post("/api/paypal/cancel-subscription", async (req, res) => {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ error: "Missing subscriptionId" });
    }

    const clientId = process.env.PAYPAL_CLIENT_ID || process.env.VITE_PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const isSandbox = !process.env.PAYPAL_LIVE || process.env.PAYPAL_LIVE === 'false';
    const paypalBaseUrl = isSandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

    if (!clientId || !clientSecret) {
      console.warn("PayPal API credentials missing", { clientId: !!clientId, clientSecret: !!clientSecret });
      return res.status(500).json({ error: "PayPal API not configured" });
    }

    try {
      // 1. Get PayPal Access Token
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const tokenResponse = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
        }),
      });

      if (!tokenResponse.ok) {
        const err = await tokenResponse.text();
        throw new Error(`Failed to get PayPal token: ${err}`);
      }

      const { access_token } = await tokenResponse.json();

      // 2. Cancel Subscription
      const cancelResponse = await fetch(`${paypalBaseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: "User downgraded to free plan"
        }),
      });

      if (!cancelResponse.ok && cancelResponse.status !== 422) {
        // 422 might mean it's already cancelled or in a state where it can't be cancelled
        const err = await cancelResponse.text();
        throw new Error(`Failed to cancel PayPal subscription: ${err}`);
      }

      res.json({ status: "ok", message: "Subscription cancelled successfully" });
    } catch (error: any) {
      console.error("PayPal Cancellation Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/send-otp", async (req, res) => {
    const { userId, parentEmail } = req.body;
    if (!userId || !parentEmail) return res.status(400).json({ error: "Missing data" });

    try {
      // Validate that parent email is different from child email
      const userRow = db.prepare('SELECT email FROM users WHERE id = ?').get(userId) as any;
      if (userRow && userRow.email.toLowerCase() === parentEmail.toLowerCase()) {
        return res.status(400).json({ error: "כתובת המייל של ההורה חייבת להיות שונה מכתובת המייל של הילד" });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      db.prepare(`
        INSERT INTO parent_verifications (user_id, parent_email, otp, expires_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          parent_email = excluded.parent_email,
          otp = excluded.otp,
          expires_at = excluded.expires_at
      `).run(userId, parentEmail, otp, expiresAt);

      // Send Email
      const smtpHostRaw = process.env.SMTP_HOST || 'smtp.hostinger.com';
      const smtpHost = smtpHostRaw.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const smtpPort = parseInt(process.env.SMTP_PORT || '465');
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      if (!smtpUser || !smtpPass) {
        console.error("SMTP Credentials missing:", { 
          hasUser: !!smtpUser, 
          hasPass: !!smtpPass,
          host: smtpHost,
          port: smtpPort
        });
        throw new Error("שרת המיילים לא מוגדר כראוי (חסרים פרטי התחברות)");
      }

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPass
        },
        // Hostinger specific settings sometimes help
        tls: {
          rejectUnauthorized: false
        }
      });

      console.log(`Attempting to send OTP to ${parentEmail} via ${smtpHost}:${smtpPort}`);

      await transporter.sendMail({
        from: `"Lumdim Support" <${smtpUser}>`,
        to: parentEmail,
        subject: "קוד אימות הורה - Lumdim",
        html: `
          <div dir="rtl" style="font-family: sans-serif; text-align: right; padding: 20px;">
            <h2 style="color: #3b82f6;">שלום רב,</h2>
            <p>ילדכם ביקש להשתמש באפליקציית <b>Lumdim</b> ללמידה חכמה.</p>
            <p>מכיוון שילדכם מתחת לגיל 13, נדרש אישור הורה להמשך השימוש.</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
              <p style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">קוד האימות שלך הוא:</p>
              <h1 style="font-size: 48px; letter-spacing: 10px; color: #111827; margin: 0;">${otp}</h1>
            </div>
            <p style="font-size: 14px; color: #ef4444; font-weight: bold;">שימו לב: בהזנת קוד זה הנכם מאשרים כי אתם ההורים/האפוטרופוסים החוקיים של הילד וכי הנכם מעל גיל 18.</p>
            <p>הקוד תקף ל-10 דקות הקרובות.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="font-size: 12px; color: #9ca3af;">אם לא ביקשתם קוד זה, ניתן להתעלם מהמייל.</p>
          </div>
        `
      });

      res.json({ status: "ok" });
    } catch (error: any) {
      console.error("Failed to send OTP:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    const { userId, otp } = req.body;
    if (!userId || !otp) return res.status(400).json({ error: "Missing data" });

    try {
      const row = db.prepare('SELECT * FROM parent_verifications WHERE user_id = ?').get(userId) as any;
      if (!row) return res.status(404).json({ error: "Verification not found" });

      if (row.otp !== otp) return res.status(400).json({ error: "קוד אימות לא תקין" });
      if (Date.now() > row.expires_at) return res.status(400).json({ error: "הקוד פג תוקף" });

      // Success - Update user in DB
      const userRow = db.prepare('SELECT email, name, data FROM users WHERE id = ?').get(userId) as any;
      if (userRow) {
        const data = JSON.parse(userRow.data || '{}');
        data.isParentVerified = true;
        data.isOver13 = false;
        data.parentEmail = row.parent_email;
        db.prepare('UPDATE users SET data = ? WHERE id = ?').run(JSON.stringify(data), userId);

        // Send Confirmation Email to Parent
        const smtpHostRaw = process.env.SMTP_HOST || 'smtp.hostinger.com';
        const smtpHost = smtpHostRaw.replace(/^https?:\/\//, '').replace(/\/$/, '');
        const smtpPort = parseInt(process.env.SMTP_PORT || '465');
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;

        if (smtpUser && smtpPass) {
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: { user: smtpUser, pass: smtpPass },
            tls: { rejectUnauthorized: false }
          });

          const appUrl = process.env.APP_URL || 'http://localhost:3000';
          const deleteUrl = `${appUrl}/api/auth/delete-child?userId=${userId}&email=${encodeURIComponent(row.parent_email)}`;

          await transporter.sendMail({
            from: `"Lumdim Support" <${smtpUser}>`,
            to: row.parent_email,
            subject: "אישור הורה הושלם בהצלחה - Lumdim",
            html: `
              <div dir="rtl" style="font-family: sans-serif; text-align: right; padding: 20px;">
                <h2 style="color: #10b981;">שלום רב,</h2>
                <p>אנו שמחים לעדכן כי תהליך אישור ההורה עבור <b>${userRow.name || 'ילדכם'}</b> הושלם בהצלחה.</p>
                <p>כעת ילדכם יכול להשתמש בכל אפשרויות הלמידה ב-Lumdim.</p>
                
                <div style="background: #f9fafb; padding: 20px; border-radius: 15px; margin: 20px 0; border: 1px solid #e5e7eb;">
                  <h3 style="margin-top: 0;">מידע חשוב:</h3>
                  <ul style="padding-right: 20px;">
                    <li><a href="${appUrl}/privacy">מדיניות הפרטיות שלנו</a></li>
                    <li><a href="${appUrl}/terms">תנאי השימוש</a></li>
                  </ul>
                  <p style="font-size: 13px; color: #6b7280; margin-top: 20px;">
                    באפשרותכם לבטל את המנוי של ילדכם ולמחוק את כל המידע שנאסף עליו בכל עת על ידי לחיצה על הקישור הבא:
                  </p>
                  <a href="${deleteUrl}" style="display: inline-block; background: #ef4444; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">ביטול חשבון ומחיקת כל הנתונים</a>
                </div>
                
                <p style="font-size: 12px; color: #9ca3af;">מייל זה נשלח באופן אוטומטי, נא לא להשיב לו.</p>
              </div>
            `
          });
        }
      }

      // Cleanup
      db.prepare('DELETE FROM parent_verifications WHERE user_id = ?').run(userId);

      res.json({ status: "ok" });
    } catch (error: any) {
      console.error("Verification error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/validate-school", async (req, res) => {
    const { code, userId } = req.body;
    if (!code) return res.status(400).json({ error: "Missing school code" });

    const kindeDomain = process.env.KINDE_DOMAIN || process.env.VITE_KINDE_DOMAIN;
    const clientId = process.env.KINDE_MANAGEMENT_CLIENT_ID;
    const clientSecret = process.env.KINDE_MANAGEMENT_CLIENT_SECRET;

    if (!kindeDomain || !clientId || !clientSecret) {
      console.warn("Kinde Management API credentials missing for school validation");
      return res.status(500).json({ 
        error: "Kinde Management API not configured. Please ensure KINDE_DOMAIN, KINDE_MANAGEMENT_CLIENT_ID, and KINDE_MANAGEMENT_CLIENT_SECRET are set in your environment." 
      });
    }

    try {
      console.log("Validating school code:", code);
      const { access_token, kindeBaseUrl } = await getKindeManagementToken(
        kindeDomain, 
        clientId, 
        clientSecret, 
        "read:organizations create:organization_users"
      );

      // Check if organization exists with this code
      // Using the list endpoint and filtering manually is more robust than the direct ID endpoint
      const orgsResponse = await fetch(`${kindeBaseUrl}/api/v1/organizations`, {
        headers: {
          "Authorization": `Bearer ${access_token}`,
          "Accept": "application/json",
        },
      });

      if (!orgsResponse.ok) {
        const err = await orgsResponse.text();
        console.error("Kinde Orgs Fetch Error:", err);
        throw new Error("Failed to fetch Kinde organizations");
      }

      const data = await orgsResponse.json();
      const organizations = data.organizations || [];
      const organization = organizations.find((o: any) => o.code === code || o.id === code);

      if (!organization) {
        console.warn("Organization not found for code:", code);
        return res.status(404).json({ error: "קוד בית ספר לא תקין. וודא שאתה משתמש ב-Organization Code מ-Kinde (למשל org_...)" });
      }

      console.log("School validated successfully:", organization.name);

      // If userId is provided, associate user with organization in Kinde
      if (userId) {
        console.log(`Associating user ${userId} with organization ${organization.code}`);
        try {
          const associateResponse = await fetch(`${kindeBaseUrl}/api/v1/organizations/${organization.code}/users`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${access_token}`,
              "Content-Type": "application/json",
              "Accept": "application/json",
            },
            body: JSON.stringify({ 
              users: [userId] 
            }),
          });

          if (!associateResponse.ok) {
            const err = await associateResponse.text();
            console.error(`Kinde Association Error (Status ${associateResponse.status}):`, err);
            // Try alternative payload if first one fails (some Kinde versions use different formats)
            if (associateResponse.status === 400 || associateResponse.status === 422) {
               console.log("Retrying with alternative payload format...");
               await fetch(`${kindeBaseUrl}/api/v1/organizations/${organization.code}/users`, {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${access_token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ user_ids: [userId] }),
              });
            }
          } else {
            console.log(`Successfully associated user ${userId} with organization ${organization.code}`);
          }
        } catch (assocError) {
          console.error("Failed to associate user with organization:", assocError);
        }
      }

      res.json({ 
        status: "ok", 
        schoolName: organization.name,
        schoolCode: organization.code
      });
    } catch (error: any) {
      console.error("School Validation Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete User and associated data
  app.delete("/api/users/:id", (req, res) => {
    const id = req.params.id;
    try {
      const deleteClassrooms = db.prepare('DELETE FROM classrooms WHERE teacher_id = ?');
      const deleteUser = db.prepare('DELETE FROM users WHERE id = ?');
      const deleteVerifications = db.prepare('DELETE FROM parent_verifications WHERE user_id = ?');
      const deleteNotifications = db.prepare('DELETE FROM notifications WHERE user_id = ?');
      
      const transaction = db.transaction(() => {
        deleteClassrooms.run(id);
        deleteUser.run(id);
        deleteVerifications.run(id);
        deleteNotifications.run(id);
        db.prepare('DELETE FROM history WHERE user_id = ?').run(id);
        db.prepare('DELETE FROM stats WHERE user_id = ?').run(id);
        db.prepare('DELETE FROM games WHERE teacher_id = ?').run(id);
      });
      
      transaction();
      res.json({ status: "ok", message: "User and associated data deleted" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Parent endpoint to delete child account
  app.get("/api/auth/delete-child", (req, res) => {
    const { userId, email } = req.query;
    if (!userId) return res.status(400).send("Missing userId");

    try {
      const userRow = db.prepare('SELECT data FROM users WHERE id = ?').get(userId) as any;
      if (!userRow) return res.status(404).send("המשתמש לא נמצא");

      const data = JSON.parse(userRow.data || '{}');
      // Simple verification: check if the email in query matches the parent email stored
      if (email && data.parentEmail !== email) {
        return res.status(403).send("אין הרשאה למחוק משתמש זה");
      }

      const deleteClassrooms = db.prepare('DELETE FROM classrooms WHERE teacher_id = ?');
      const deleteUser = db.prepare('DELETE FROM users WHERE id = ?');
      const deleteVerifications = db.prepare('DELETE FROM parent_verifications WHERE user_id = ?');
      const deleteNotifications = db.prepare('DELETE FROM notifications WHERE user_id = ?');
      
      const transaction = db.transaction(() => {
        deleteClassrooms.run(userId);
        deleteUser.run(userId);
        deleteVerifications.run(userId);
        deleteNotifications.run(userId);
      });
      
      transaction();

      res.send(`
        <div dir="rtl" style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #ef4444;">החשבון נמחק בהצלחה</h1>
          <p>כל הנתונים הקשורים לילדכם נמחקו לצמיתות מהמערכת שלנו.</p>
          <p>צר לנו לראות אתכם עוזבים.</p>
          <a href="/" style="display: inline-block; margin-top: 20px; color: #3b82f6;">חזרה לדף הבית</a>
        </div>
      `);
    } catch (error: any) {
      res.status(500).send("שגיאה במחיקת החשבון: " + error.message);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite middleware integrated successfully.");
    } catch (err) {
      console.error("Failed to create Vite server:", err);
      // In case of failure, we might still want to serve static files or just fail
      process.exit(1);
    }
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  server.on('error', (err: any) => {
    console.error("Server failed to start:", err);
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use.`);
    }
    process.exit(1);
  });
}

startServer();
