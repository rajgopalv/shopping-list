import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

let db: Database.Database;

export function getDb(dbPath?: string): Database.Database {
  if (db) return db;

  const resolvedPath = dbPath || process.env.SHOPPING_DB_PATH || defaultPath();

  if (resolvedPath !== ":memory:") {
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(resolvedPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

function defaultPath() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  return path.join(__dirname, "../../data/shopping.db");
}

export function initDB(dbPath?: string) {
  const d = getDb(dbPath);
  d.exec(`
    CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      icon TEXT,
      color TEXT
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      icon TEXT,
      is_preset INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id),
      name TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      is_shopped INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      shopped_at TEXT
    );
  `);

  const storeCount = d.prepare("SELECT COUNT(*) as count FROM stores").get() as { count: number };
  if (storeCount.count === 0) {
    seedData(d);
  }

  return d;
}

export function resetDb() {
  db?.close();
  db = undefined as unknown as Database.Database;
}

function seedData(d: Database.Database) {
  const insertStore = d.prepare("INSERT INTO stores (name, icon, color) VALUES (?, ?, ?)");
  insertStore.run("Costco", "🟡", "#F5A623");
  insertStore.run("Fred Meyer", "🔵", "#00A3E0");
  insertStore.run("Indian Stores", "🟠", "#FF6B35");

  const insertCategory = d.prepare("INSERT INTO categories (name, icon, is_preset) VALUES (?, ?, 1)");
  const presets = [
    ["Produce", "🥬"],
    ["Dairy", "🥛"],
    ["Meat & Seafood", "🥩"],
    ["Bakery", "🍞"],
    ["Snacks", "🍿"],
    ["Beverages", "🥤"],
    ["Frozen", "🧊"],
    ["Pantry", "🥫"],
    ["Household", "🏠"],
    ["Personal Care", "🧴"],
  ];
  for (const [name, icon] of presets) {
    insertCategory.run(name, icon);
  }
}
