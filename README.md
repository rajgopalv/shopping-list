# 🛒 Shopping List

A full-stack shopping list app with multiple store support, category organization, autocomplete suggestions, dark/light theme, and an MCP server for AI assistant integration.

## Features

- **Multiple Stores** — Manage separate lists for Costco, Fred Meyer, Indian Stores, or any store you add
- **Categories** — Items auto-categorize into Produce, Dairy, Meat, etc. — custom categories supported
- **Autocomplete** — Suggests items from past entries with frequency ranking
- **Grouped or Flat View** — Toggle between category-grouped and flat list views
- **Dark & Light Themes** — System-aware with manual override
- **Store Management** — Add, delete, and drag-to-reorder stores
- **Swipe Actions** — Swipe to complete or delete items
- **Quick Add** — Fast item entry with category detection
- **MCP Server** — AI assistants (Claude, etc.) can manage your shopping list via the Model Context Protocol
- **Docker** — One-command deployment

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| UI | Radix UI, TanStack Query, Lucide icons, class-variance-authority |
| Backend | Express, TypeScript, better-sqlite3 |
| Database | SQLite (WAL mode, zero config) |
| MCP | Model Context Protocol SDK |
| Testing | Vitest, Supertest |
| DevOps | Docker, docker-compose |

## Quick Start

```bash
# Install dependencies
npm install

# Run both client and server in dev mode
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:3456

### Docker

```bash
docker compose up --build
```

App runs at http://localhost:3456.

## Project Structure

```
shopping-list/
├── client/               # React frontend (Vite)
│   └── src/
│       ├── components/   # UI components
│       ├── hooks/        # React Query hooks
│       └── lib/          # API client & utils
├── server/               # Express backend
│   └── src/
│       ├── db/           # SQLite schema & seed data
│       ├── routes/       # REST API routes
│       └── __tests__/    # API tests
├── mcp-server/           # MCP server for AI assistants
└── docker-compose.yml
```

## API

All endpoints are under `/api`:

### Stores
- `GET /api/stores` — List all stores with unshopped counts
- `POST /api/stores` — Create a store
- `PATCH /api/stores/reorder` — Reorder stores
- `DELETE /api/stores/:id` — Delete a store

### Items
- `GET /api/stores/:id/items?include_shopped=true` — List items
- `POST /api/stores/:id/items` — Add an item
- `PATCH /api/items/:id` — Update item (mark shopped, edit name/quantity, change category)
- `DELETE /api/items/:id` — Delete an item
- `DELETE /api/stores/:id/items/shopped` — Clear all shopped items

### Categories
- `GET /api/categories` — List categories
- `POST /api/categories` — Create a category

### Suggestions
- `GET /api/items/suggestions?q=...` — Search past item names
- `GET /api/item-names` — All known item names with frequency

## MCP Server

The MCP server lets AI assistants (Claude Desktop, Claude Code, etc.) interact with your shopping list.

```bash
# Start the MCP server (requires the main server running on :3456)
npm run mcp
```

### Available Tools

| Tool | Description |
|------|-------------|
| `list_stores` | List all stores with unshopped counts |
| `list_items` | View items in a store (optionally include shopped) |
| `add_item` | Add an item (auto-categorizes from history) |
| `mark_shopped` | Mark an item as completed |
| `remove_item` | Delete an item |
| `update_item` | Change quantity or un-mark an item |
| `clear_shopped` | Remove all completed items from a store |
| `add_store` | Create a new store |
| `delete_store` | Remove a store and all its items |
| `reorder_stores` | Reorder stores by name |
| `list_categories` | List all categories |
| `add_category` | Add a custom category |
| `suggest_items` | Search past item names |

### Claude Desktop Config

```json
{
  "mcpServers": {
    "shopping-list": {
      "command": "node",
      "args": ["path/to/mcp-server/dist/index.js"],
      "env": {
        "SHOPPING_API_URL": "http://localhost:3456/api"
      }
    }
  }
}
```

## Testing

```bash
npm test
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3456` | Server port |
| `SHOPPING_DB_PATH` | `server/data/shopping.db` | SQLite database path |
| `SHOPPING_API_URL` | `http://localhost:3456/api` | API base URL (MCP server only) |
| `NODE_ENV` | — | Set to `production` for production mode |
