import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.SHOPPING_DB_PATH || path.join(__dirname, "../../server/data/shopping.db");

if (DB_PATH !== ":memory:") {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma("foreign_keys = ON");

const server = new McpServer({
  name: "shopping-list",
  version: "1.0.0",
});

// Helper: find store by name (fuzzy match)
function findStore(name: string) {
  const lower = name.toLowerCase();
  return db.prepare("SELECT * FROM stores WHERE lower(name) LIKE ?").get(`%${lower}%`) as any;
}

// Helper: find category by name
function findCategory(name: string) {
  const lower = name.toLowerCase();
  return db.prepare("SELECT * FROM categories WHERE lower(name) LIKE ?").get(`%${lower}%`) as any;
}

server.tool("list_stores", "List all available stores", {}, async () => {
  const stores = db.prepare("SELECT * FROM stores ORDER BY id").all();
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(stores, null, 2),
      },
    ],
  };
});

server.tool(
  "add_item",
  "Add an item to a store's shopping list",
  {
    store_name: z.string().describe("Name of the store (e.g., Costco, Fred Meyer, Indian Stores)"),
    item_name: z.string().describe("Name of the item to add"),
    quantity: z.number().optional().default(1).describe("Quantity of the item"),
    category: z.string().optional().describe("Category name (e.g., Produce, Dairy, Snacks)"),
  },
  async ({ store_name, item_name, quantity, category }) => {
    const store = findStore(store_name);
    if (!store) {
      return {
        content: [{ type: "text", text: `Store "${store_name}" not found. Available: Costco, Fred Meyer, Indian Stores` }],
        isError: true,
      };
    }

    let categoryId = null;
    if (category) {
      const cat = findCategory(category);
      if (cat) categoryId = cat.id;
    }

    const result = db
      .prepare("INSERT INTO items (store_id, name, quantity, category_id) VALUES (?, ?, ?, ?)")
      .run(store.id, item_name.trim(), quantity || 1, categoryId);

    const item = db.prepare(`
      SELECT i.*, c.name as category_name, c.icon as category_icon
      FROM items i LEFT JOIN categories c ON i.category_id = c.id
      WHERE i.id = ?
    `).get(result.lastInsertRowid);

    return {
      content: [
        {
          type: "text",
          text: `✅ Added "${item_name}" (x${quantity || 1}) to ${store.name}${category ? ` in ${category}` : ""}`,
        },
      ],
    };
  }
);

server.tool(
  "list_items",
  "List items in a store's shopping list",
  {
    store_name: z.string().describe("Name of the store"),
    include_shopped: z.boolean().optional().default(false).describe("Include already shopped items"),
  },
  async ({ store_name, include_shopped }) => {
    const store = findStore(store_name);
    if (!store) {
      return {
        content: [{ type: "text", text: `Store "${store_name}" not found.` }],
        isError: true,
      };
    }

    let query = `
      SELECT i.*, c.name as category_name, c.icon as category_icon
      FROM items i LEFT JOIN categories c ON i.category_id = c.id
      WHERE i.store_id = ?
    `;
    if (!include_shopped) {
      query += " AND i.is_shopped = 0";
    }
    query += " ORDER BY i.is_shopped ASC, c.name ASC, i.created_at DESC";

    const items = db.prepare(query).all(store.id) as any[];

    if (items.length === 0) {
      return {
        content: [{ type: "text", text: `No${include_shopped ? "" : " unshopped"} items in ${store.name}'s list.` }],
      };
    }

    const grouped: Record<string, any[]> = {};
    for (const item of items) {
      const cat = item.category_name || "Uncategorized";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    }

    let text = `📋 **${store.name}** (${items.length} items)\n\n`;
    for (const [cat, catItems] of Object.entries(grouped)) {
      text += `**${cat}:**\n`;
      for (const item of catItems) {
        const check = item.is_shopped ? "✅" : "⬜";
        text += `  ${check} ${item.name} (x${item.quantity})\n`;
      }
      text += "\n";
    }

    return { content: [{ type: "text", text }] };
  }
);

server.tool(
  "mark_shopped",
  "Mark an item as shopped in a store",
  {
    store_name: z.string().describe("Name of the store"),
    item_name: z.string().describe("Name of the item to mark as shopped"),
  },
  async ({ store_name, item_name }) => {
    const store = findStore(store_name);
    if (!store) {
      return { content: [{ type: "text", text: `Store "${store_name}" not found.` }], isError: true };
    }

    const item = db
      .prepare("SELECT * FROM items WHERE store_id = ? AND lower(name) LIKE ? AND is_shopped = 0")
      .get(store.id, `%${item_name.toLowerCase()}%`) as any;

    if (!item) {
      return {
        content: [{ type: "text", text: `Item "${item_name}" not found or already shopped in ${store.name}.` }],
        isError: true,
      };
    }

    db.prepare("UPDATE items SET is_shopped = 1, shopped_at = datetime('now') WHERE id = ?").run(item.id);

    return {
      content: [{ type: "text", text: `✅ Marked "${item.name}" as shopped in ${store.name}.` }],
    };
  }
);

server.tool(
  "remove_item",
  "Remove an item from a store's list",
  {
    store_name: z.string().describe("Name of the store"),
    item_name: z.string().describe("Name of the item to remove"),
  },
  async ({ store_name, item_name }) => {
    const store = findStore(store_name);
    if (!store) {
      return { content: [{ type: "text", text: `Store "${store_name}" not found.` }], isError: true };
    }

    const item = db
      .prepare("SELECT * FROM items WHERE store_id = ? AND lower(name) LIKE ?")
      .get(store.id, `%${item_name.toLowerCase()}%`) as any;

    if (!item) {
      return { content: [{ type: "text", text: `Item "${item_name}" not found in ${store.name}.` }], isError: true };
    }

    db.prepare("DELETE FROM items WHERE id = ?").run(item.id);

    return {
      content: [{ type: "text", text: `🗑️ Removed "${item.name}" from ${store.name}.` }],
    };
  }
);

server.tool(
  "add_category",
  "Add a custom category",
  {
    name: z.string().describe("Category name"),
    icon: z.string().optional().describe("Emoji icon for the category"),
  },
  async ({ name, icon }) => {
    try {
      db.prepare("INSERT INTO categories (name, icon, is_preset) VALUES (?, ?, 0)").run(name.trim(), icon || "📦");
      return { content: [{ type: "text", text: `✅ Added category "${name}" ${icon || "📦"}` }] };
    } catch (e: any) {
      if (e.code === "SQLITE_CONSTRAINT_UNIQUE") {
        return { content: [{ type: "text", text: `Category "${name}" already exists.` }] };
      }
      throw e;
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🛒 Shopping List MCP server running");
}

main().catch(console.error);
