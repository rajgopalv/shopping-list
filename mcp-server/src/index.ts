import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE = process.env.SHOPPING_API_URL || "http://localhost:3456/api";

async function api<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error: string }).error || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

interface StoreItem {
  id: number;
  name: string;
  icon: string;
  color: string;
  unshopped_count: number;
}

interface ListItem {
  id: number;
  store_id: number;
  category_id: number | null;
  name: string;
  quantity: number;
  is_shopped: number;
  category_name: string | null;
  category_icon: string | null;
}

interface Suggestion {
  name: string;
  frequency: number;
  category_id: number | null;
  category_name: string | null;
  category_icon: string | null;
}

async function findStore(name: string): Promise<StoreItem | null> {
  const stores = await api<StoreItem[]>("/stores");
  const lower = name.toLowerCase();
  return stores.find((s) => s.name.toLowerCase().includes(lower)) || null;
}

async function findItem(storeId: number, name: string): Promise<ListItem | null> {
  const items = await api<ListItem[]>(`/stores/${storeId}/items?include_shopped=true`);
  const lower = name.toLowerCase();
  return items.find((i) => i.name.toLowerCase().includes(lower)) || null;
}

const server = new McpServer({
  name: "shopping-list",
  version: "2.0.0",
});

server.tool(
  "list_stores",
  "List all stores with their unshopped item counts",
  {},
  async () => {
    const stores = await api<StoreItem[]>("/stores");
    const text = stores
      .map((s) => `${s.icon || "🛒"} **${s.name}** — ${s.unshopped_count} unshopped`)
      .join("\n");
    return { content: [{ type: "text", text: text || "No stores found." }] };
  }
);

server.tool(
  "add_item",
  "Add an item to a store's shopping list. Category is auto-detected from past entries if not provided.",
  {
    store_name: z.string().describe("Name of the store (e.g., Costco, Fred Meyer, Indian Stores)"),
    item_name: z.string().describe("Name of the item to add"),
    quantity: z.number().optional().default(1).describe("Quantity (default 1)"),
    category: z.string().optional().describe("Optional category name (e.g., Produce, Dairy)"),
  },
  async ({ store_name, item_name, quantity, category }) => {
    const store = await findStore(store_name);
    if (!store) {
      return {
        content: [{ type: "text", text: `Store "${store_name}" not found.` }],
        isError: true,
      };
    }

    let categoryId: number | null = null;
    if (category) {
      const cats = await api<{ id: number; name: string }[]>("/categories");
      const match = cats.find((c) => c.name.toLowerCase().includes(category.toLowerCase()));
      if (match) categoryId = match.id;
    }

    try {
      const item = await api<ListItem>(`/stores/${store.id}/items`, {
        method: "POST",
        body: JSON.stringify({ name: item_name, quantity, category_id: categoryId }),
      });
      const catTag = item.category_name ? ` in ${item.category_icon || ""} ${item.category_name}` : "";
      return {
        content: [{ type: "text", text: `✅ Added "${item.name}" (×${item.quantity}) to ${store.name}${catTag}` }],
      };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Failed to add item: ${e instanceof Error ? e.message : "unknown error"}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "list_items",
  "List all items in a store, optionally including already-shopped items",
  {
    store_name: z.string().describe("Name of the store"),
    include_shopped: z.boolean().optional().default(false).describe("Include shopped items"),
  },
  async ({ store_name, include_shopped }) => {
    const store = await findStore(store_name);
    if (!store) {
      return { content: [{ type: "text", text: `Store "${store_name}" not found.` }], isError: true };
    }

    const items = await api<ListItem[]>(`/stores/${store.id}/items?include_shopped=${include_shopped}`);

    if (items.length === 0) {
      return {
        content: [{ type: "text", text: `No${include_shopped ? "" : " unshopped"} items in ${store.name}.` }],
      };
    }

    const grouped: Record<string, ListItem[]> = {};
    for (const item of items) {
      const cat = item.category_name || "Uncategorized";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    }

    let text = `📋 **${store.name}** (${items.length} item${items.length !== 1 ? "s" : ""})\n\n`;
    for (const [cat, catItems] of Object.entries(grouped)) {
      const icon = catItems[0]?.category_icon || "";
      text += `**${icon} ${cat}:**\n`;
      for (const item of catItems) {
        const check = item.is_shopped ? "✅" : "⬜";
        text += `  ${check} ${item.name} (×${item.quantity})\n`;
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
    const store = await findStore(store_name);
    if (!store) {
      return { content: [{ type: "text", text: `Store "${store_name}" not found.` }], isError: true };
    }

    const item = await findItem(store.id, item_name);
    if (!item) {
      return {
        content: [{ type: "text", text: `Item "${item_name}" not found in ${store.name}.` }],
        isError: true,
      };
    }
    if (item.is_shopped) {
      return {
        content: [{ type: "text", text: `"${item.name}" is already marked as shopped in ${store.name}.` }],
      };
    }

    await api(`/items/${item.id}`, { method: "PATCH", body: JSON.stringify({ is_shopped: 1 }) });

    return { content: [{ type: "text", text: `✅ Marked "${item.name}" as shopped in ${store.name}.` }] };
  }
);

server.tool(
  "remove_item",
  "Delete an item from a store's list",
  {
    store_name: z.string().describe("Name of the store"),
    item_name: z.string().describe("Name of the item to remove"),
  },
  async ({ store_name, item_name }) => {
    const store = await findStore(store_name);
    if (!store) {
      return { content: [{ type: "text", text: `Store "${store_name}" not found.` }], isError: true };
    }

    const item = await findItem(store.id, item_name);
    if (!item) {
      return {
        content: [{ type: "text", text: `Item "${item_name}" not found in ${store.name}.` }],
        isError: true,
      };
    }

    await api(`/items/${item.id}`, { method: "DELETE" });

    return { content: [{ type: "text", text: `🗑️ Removed "${item.name}" from ${store.name}.` }] };
  }
);

server.tool(
  "add_category",
  "Add a custom category for organizing items",
  {
    name: z.string().describe("Category name (e.g., Spices, International)"),
    icon: z.string().optional().describe("Emoji icon (e.g., 🌶️)"),
  },
  async ({ name, icon }) => {
    try {
      const cat = await api<{ id: number; name: string; icon: string }>("/categories", {
        method: "POST",
        body: JSON.stringify({ name, icon }),
      });
      return { content: [{ type: "text", text: `✅ Added category "${cat.name}" ${cat.icon || "📦"}` }] };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Failed to add category: ${e instanceof Error ? e.message : "unknown error"}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "suggest_items",
  "Search for item name suggestions based on past entries. Returns matching names with their categories and how often they've been added.",
  {
    query: z.string().describe("Partial item name to search for"),
  },
  async ({ query }) => {
    const suggestions = await api<Suggestion[]>(`/items/suggestions?q=${encodeURIComponent(query)}`);

    if (suggestions.length === 0) {
      return { content: [{ type: "text", text: `No suggestions found for "${query}".` }] };
    }

    const text = suggestions
      .map((s) => {
        const cat = s.category_icon ? `${s.category_icon} ` : "";
        return `  ${cat}${s.name} (×${s.frequency})`;
      })
      .join("\n");

    return { content: [{ type: "text", text: `Suggestions for "${query}":\n${text}` }] };
  }
);

server.tool(
  "clear_shopped",
  "Remove all shopped/completed items from a store's list",
  {
    store_name: z.string().describe("Name of the store"),
  },
  async ({ store_name }) => {
    const store = await findStore(store_name);
    if (!store) {
      return { content: [{ type: "text", text: `Store "${store_name}" not found.` }], isError: true };
    }

    const items = await api<ListItem[]>(`/stores/${store.id}/items?include_shopped=true`);
    const shopped = items.filter((i) => i.is_shopped);

    if (shopped.length === 0) {
      return { content: [{ type: "text", text: `No shopped items to clear in ${store.name}.` }] };
    }

    await api(`/stores/${store.id}/items/shopped`, { method: "DELETE" });

    return {
      content: [{ type: "text", text: `🗑️ Cleared ${shopped.length} shopped item${shopped.length > 1 ? "s" : ""} from ${store.name}.` }],
    };
  }
);

server.tool(
  "add_store",
  "Add a new store to the shopping list",
  {
    name: z.string().describe("Store name"),
    icon: z.string().optional().describe("Emoji icon (will auto-assign a matching color)"),
  },
  async ({ name, icon }) => {
    try {
      const store = await api<StoreItem>("/stores", {
        method: "POST",
        body: JSON.stringify({ name, icon }),
      });
      return { content: [{ type: "text", text: `✅ Added store "${store.name}" ${store.icon || "🛒"}` }] };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Failed to add store: ${e instanceof Error ? e.message : "unknown error"}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "delete_store",
  "Delete a store and all its items permanently",
  {
    name: z.string().describe("Name of the store to delete"),
  },
  async ({ name }) => {
    const store = await findStore(name);
    if (!store) {
      return { content: [{ type: "text", text: `Store "${name}" not found.` }], isError: true };
    }

    await api(`/stores/${store.id}`, { method: "DELETE" });

    return { content: [{ type: "text", text: `🗑️ Deleted "${store.name}" and all its items.` }] };
  }
);

server.tool(
  "reorder_stores",
  "Reorder stores by providing store names in the desired order",
  {
    store_names: z.array(z.string()).describe("Store names in the new order (e.g., [\"Indian Stores\", \"Costco\", \"Fred Meyer\"])"),
  },
  async ({ store_names }) => {
    const stores = await api<StoreItem[]>("/stores");
    const order: number[] = [];
    for (const name of store_names) {
      const lower = name.toLowerCase();
      const match = stores.find((s) => s.name.toLowerCase().includes(lower));
      if (!match) {
        return { content: [{ type: "text", text: `Store "${name}" not found.` }], isError: true };
      }
      order.push(match.id);
    }

    if (order.length !== stores.length) {
      return { content: [{ type: "text", text: `Expected ${stores.length} stores, got ${order.length}.` }], isError: true };
    }

    await api("/stores/reorder", { method: "PATCH", body: JSON.stringify({ order }) });
    return { content: [{ type: "text", text: `✅ Reordered stores: ${store_names.join(" → ")}` }] };
  }
);

server.tool(
  "list_categories",
  "List all categories used for grouping items",
  {},
  async () => {
    const cats = await api<{ id: number; name: string; icon: string; is_preset: number }[]>("/categories");
    const text = cats
      .map((c) => `${c.icon || "📦"} **${c.name}**${c.is_preset ? " (preset)" : ""}`)
      .join("\n");
    return { content: [{ type: "text", text: text || "No categories found." }] };
  }
);

server.tool(
  "update_item",
  "Update an item's quantity or un-mark it as shopped",
  {
    store_name: z.string().describe("Name of the store"),
    item_name: z.string().describe("Current name of the item"),
    quantity: z.number().optional().describe("New quantity"),
    mark_unshopped: z.boolean().optional().describe("Set to true to un-mark a shopped item"),
  },
  async ({ store_name, item_name, quantity, mark_unshopped }) => {
    const store = await findStore(store_name);
    if (!store) {
      return { content: [{ type: "text", text: `Store "${store_name}" not found.` }], isError: true };
    }

    const item = await findItem(store.id, item_name);
    if (!item) {
      return { content: [{ type: "text", text: `Item "${item_name}" not found in ${store.name}.` }], isError: true };
    }

    const updates: Record<string, unknown> = {};
    if (quantity !== undefined) updates.quantity = quantity;
    if (mark_unshopped) updates.is_shopped = 0;

    if (Object.keys(updates).length === 0) {
      return { content: [{ type: "text", text: "No updates provided. Specify quantity or mark_unshopped." }] };
    }

    await api(`/items/${item.id}`, { method: "PATCH", body: JSON.stringify(updates) });

    const parts: string[] = [];
    if (quantity !== undefined) parts.push(`quantity → ${quantity}`);
    if (mark_unshopped) parts.push("un-shopped");
    return { content: [{ type: "text", text: `✅ Updated "${item.name}": ${parts.join(", ")}` }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🛒 Shopping List MCP server v2 running (API proxy mode)");
}

main().catch(console.error);
