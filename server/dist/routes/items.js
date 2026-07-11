import { Router } from "express";
import { getDb } from "../db/index.js";
const router = Router();
const db = () => getDb();
router.get("/stores", (_req, res) => {
    const stores = db().prepare("SELECT * FROM stores ORDER BY id").all();
    res.json(stores);
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
    const { name, quantity = 1, category_id } = req.body;
    if (!name || !name.trim()) {
        res.status(400).json({ error: "Item name is required" });
        return;
    }
    const result = db()
        .prepare("INSERT INTO items (store_id, name, quantity, category_id) VALUES (?, ?, ?, ?)")
        .run(id, name.trim(), quantity, category_id || null);
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
    const item = db().prepare("SELECT * FROM items WHERE id = ?").get(id);
    if (!item) {
        res.status(404).json({ error: "Item not found" });
        return;
    }
    const updates = [];
    const values = [];
    if (is_shopped !== undefined) {
        updates.push("is_shopped = ?");
        values.push(is_shopped ? 1 : 0);
        if (is_shopped) {
            updates.push("shopped_at = datetime('now')");
        }
        else {
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
    }
    catch (e) {
        if (e.code === "SQLITE_CONSTRAINT_UNIQUE") {
            res.status(409).json({ error: "Category already exists" });
        }
        else {
            throw e;
        }
    }
});
export default router;
