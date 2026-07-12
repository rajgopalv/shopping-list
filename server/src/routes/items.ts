import { Router } from "express";
import { getDb } from "../db/index.js";

const router = Router();
const db = () => getDb();

router.get("/stores", (_req, res) => {
  const stores = db().prepare(`
    SELECT s.*, (SELECT COUNT(*) FROM items WHERE store_id = s.id AND is_shopped = 0) as unshopped_count
    FROM stores s ORDER BY s.sort_order ASC, s.id ASC
  `).all();
  res.json(stores);
});

const COLORS = ["#6366F1", "#EC4899", "#14B8A6", "#F59E0B", "#8B5CF6", "#3B82F6", "#EF4444", "#10B981", "#F97316", "#06B6D4"];

const EMOJI_COLORS: Record<string, string> = {
  "🟡": "#F5A623", "🔵": "#00A3E0", "🟠": "#FF6B35",
  "🔴": "#EF4444", "🟢": "#10B981", "🟣": "#8B5CF6",
  "🟤": "#A0724A", "⚪": "#CCCCCC",
};

router.post("/stores", (req, res) => {
  const { name, icon, color } = req.body;
  if (!name || !name.trim()) {
    res.status(400).json({ error: "Store name is required" });
    return;
  }
  try {
    const autoColor =
      color ||
      EMOJI_COLORS[icon || ""] ||
      COLORS[(db().prepare("SELECT COUNT(*) as count FROM stores").get() as { count: number }).count % COLORS.length];
    const result = db()
      .prepare("INSERT INTO stores (name, icon, color) VALUES (?, ?, ?)")
      .run(name.trim(), icon || "🛒", autoColor);
    const store = db().prepare("SELECT * FROM stores WHERE id = ?").get(result.lastInsertRowid) as Record<string, unknown>;
    res.status(201).json({ ...store, unshopped_count: 0 });
  } catch (e: any) {
    if (e.code === "SQLITE_CONSTRAINT_UNIQUE") {
      res.status(409).json({ error: "Store already exists" });
    } else {
      throw e;
    }
  }
});

router.patch("/stores/reorder", (req, res) => {
  const { order } = req.body;
  if (!Array.isArray(order)) {
    res.status(400).json({ error: "order array required" });
    return;
  }
  const stmt = db().prepare("UPDATE stores SET sort_order = ? WHERE id = ?");
  const tx = db().transaction(() => {
    for (let i = 0; i < order.length; i++) {
      stmt.run(i, order[i]);
    }
  });
  tx();
  res.status(200).json({ success: true });
});

router.delete("/stores/:id", (req, res) => {
  const { id } = req.params;
  const result = db().prepare("DELETE FROM stores WHERE id = ?").run(id);
  if (result.changes === 0) {
    res.status(404).json({ error: "Store not found" });
    return;
  }
  res.status(204).send();
});

router.get("/stores/:id/items", (req, res) => {
  const { id } = req.params;
  const includeShopped = req.query.include_shopped === "true";

  let query = `
    SELECT i.*, c.name as category_name, c.icon as category_icon
    FROM items i
    LEFT JOIN categories c ON i.category_id = c.id
    WHERE i.store_id = ?
  `;
  if (!includeShopped) {
    query += " AND i.is_shopped = 0";
  }
  query += " ORDER BY i.is_shopped ASC, c.name ASC, i.created_at DESC";

  const items = db().prepare(query).all(id);
  res.json(items);
});

router.post("/stores/:id/items", (req, res) => {
  const { id } = req.params;
  let { name, quantity = 1, category_id } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ error: "Item name is required" });
    return;
  }

  name = name.trim();

  if (!category_id) {
    const known = db().prepare(
      "SELECT category_id FROM item_names WHERE name = ? COLLATE NOCASE"
    ).get(name) as { category_id: number | null } | undefined;
    if (known?.category_id) {
      category_id = known.category_id;
    }
  }

  const result = db()
    .prepare("INSERT INTO items (store_id, name, quantity, category_id) VALUES (?, ?, ?, ?)")
    .run(id, name, quantity, category_id || null);

  db().prepare(`
    INSERT INTO item_names (name, frequency, category_id, last_used_at)
    VALUES (?, 1, ?, datetime('now'))
    ON CONFLICT(name) DO UPDATE SET
      frequency = frequency + 1,
      category_id = COALESCE(?, category_id),
      last_used_at = datetime('now')
  `).run(name, category_id || null, category_id || null);

  const item = db().prepare(`
    SELECT i.*, c.name as category_name, c.icon as category_icon
    FROM items i
    LEFT JOIN categories c ON i.category_id = c.id
    WHERE i.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(item);
});

router.patch("/items/:id", (req, res) => {
  const { id } = req.params;
  const { is_shopped, name, quantity, category_id } = req.body;

  const item = db().prepare("SELECT * FROM items WHERE id = ?").get(id) as any;
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  const updates: string[] = [];
  const values: any[] = [];

  if (is_shopped !== undefined) {
    updates.push("is_shopped = ?");
    values.push(is_shopped ? 1 : 0);
    if (is_shopped) {
      updates.push("shopped_at = datetime('now')");
    } else {
      updates.push("shopped_at = NULL");
    }
  }
  if (name !== undefined) {
    updates.push("name = ?");
    values.push(name.trim());
  }
  if (quantity !== undefined) {
    updates.push("quantity = ?");
    values.push(quantity);
  }
  if (category_id !== undefined) {
    updates.push("category_id = ?");
    values.push(category_id);
  }

  if (updates.length === 0) {
    res.status(400).json({ error: "No updates provided" });
    return;
  }

  values.push(id);
  db().prepare(`UPDATE items SET ${updates.join(", ")} WHERE id = ?`).run(...values);

  const updated = db().prepare(`
    SELECT i.*, c.name as category_name, c.icon as category_icon
    FROM items i
    LEFT JOIN categories c ON i.category_id = c.id
    WHERE i.id = ?
  `).get(id);

  res.json(updated);
});

router.delete("/items/:id", (req, res) => {
  const { id } = req.params;
  const result = db().prepare("DELETE FROM items WHERE id = ?").run(id);
  if (result.changes === 0) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  res.status(204).send();
});

router.delete("/stores/:id/items/shopped", (req, res) => {
  const { id } = req.params;
  db().prepare("DELETE FROM items WHERE store_id = ? AND is_shopped = 1").run(id);
  res.status(204).send();
});

router.get("/item-names", (_req, res) => {
  const names = db().prepare(`
    SELECT n.name, n.frequency, n.category_id, c.name as category_name, c.icon as category_icon
    FROM item_names n
    LEFT JOIN categories c ON n.category_id = c.id
    ORDER BY n.frequency DESC, n.last_used_at DESC
  `).all();
  res.json(names);
});

router.get("/items/suggestions", (req, res) => {
  const q = req.query.q;
  const query = typeof q === "string" ? q.trim() : "";
  if (!query) {
    res.json([]);
    return;
  }

  const suggestions = db().prepare(`
    SELECT n.name, n.frequency, n.category_id, c.name as category_name, c.icon as category_icon
    FROM item_names n
    LEFT JOIN categories c ON n.category_id = c.id
    WHERE n.name LIKE ?
    ORDER BY n.frequency DESC, n.last_used_at DESC
    LIMIT 10
  `).all(`%${query}%`);

  res.json(suggestions);
});

router.get("/categories", (_req, res) => {
  const categories = db().prepare("SELECT * FROM categories ORDER BY is_preset DESC, name ASC").all();
  res.json(categories);
});

router.post("/categories", (req, res) => {
  const { name, icon } = req.body;
  if (!name || !name.trim()) {
    res.status(400).json({ error: "Category name is required" });
    return;
  }

  try {
    const result = db()
      .prepare("INSERT INTO categories (name, icon, is_preset) VALUES (?, ?, 0)")
      .run(name.trim(), icon || "📦");
    const category = db().prepare("SELECT * FROM categories WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(category);
  } catch (e: any) {
    if (e.code === "SQLITE_CONSTRAINT_UNIQUE") {
      res.status(409).json({ error: "Category already exists" });
    } else {
      throw e;
    }
  }
});

export default router;
