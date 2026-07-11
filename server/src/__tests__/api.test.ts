import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { getDb, resetDb } from "../db/index.js";
import type { Express } from "express";

let app: Express;

beforeEach(() => {
  resetDb();
  process.env.SHOPPING_DB_PATH = ":memory:";
  app = createApp();
});

afterAll(() => {
  resetDb();
});

describe("GET /api/stores", () => {
  it("returns the 3 seeded stores", async () => {
    const res = await request(app).get("/api/stores");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body.map((s: any) => s.name)).toEqual([
      "Costco",
      "Fred Meyer",
      "Indian Stores",
    ]);
  });
});

describe("GET /api/categories", () => {
  it("returns seeded preset categories", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(200);
    const names = res.body.map((c: any) => c.name);
    expect(names).toContain("Produce");
    expect(names).toContain("Dairy");
    expect(names).toContain("Snacks");
    // All presets should have is_preset=1
    for (const cat of res.body) {
      expect(cat.is_preset).toBe(1);
    }
  });
});

describe("POST /api/stores/:id/items", () => {
  it("adds an item to a store", async () => {
    const res = await request(app)
      .post("/api/stores/1/items")
      .send({ name: "Organic Milk", quantity: 2, category_id: 2 });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Organic Milk");
    expect(res.body.quantity).toBe(2);
    expect(res.body.category_id).toBe(2);
    expect(res.body.is_shopped).toBe(0);
  });

  it("returns 400 if name is empty", async () => {
    const res = await request(app)
      .post("/api/stores/1/items")
      .send({ name: "  " });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Item name is required");
  });
});

describe("GET /api/stores/:id/items", () => {
  beforeEach(async () => {
    await request(app).post("/api/stores/1/items").send({ name: "Milk" });
    await request(app).post("/api/stores/1/items").send({ name: "Eggs" });
  });

  it("lists active items for a store", async () => {
    const res = await request(app).get("/api/stores/1/items");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.map((i: any) => i.name).sort()).toEqual(["Eggs", "Milk"]);
  });

  it("excludes shopped items by default", async () => {
    await request(app).patch("/api/items/1").send({ is_shopped: 1 });
    const res = await request(app).get("/api/stores/1/items");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("Eggs");
  });

  it("includes shopped items when include_shopped=true", async () => {
    await request(app).patch("/api/items/1").send({ is_shopped: 1 });
    const res = await request(app).get("/api/stores/1/items?include_shopped=true");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

describe("PATCH /api/items/:id", () => {
  beforeEach(async () => {
    await request(app).post("/api/stores/1/items").send({ name: "Milk" });
  });

  it("marks an item as shopped", async () => {
    const res = await request(app)
      .patch("/api/items/1")
      .send({ is_shopped: 1 });
    expect(res.status).toBe(200);
    expect(res.body.is_shopped).toBe(1);
    expect(res.body.shopped_at).toBeTruthy();
  });

  it("unmarks a shopped item", async () => {
    await request(app).patch("/api/items/1").send({ is_shopped: 1 });
    const res = await request(app)
      .patch("/api/items/1")
      .send({ is_shopped: 0 });
    expect(res.status).toBe(200);
    expect(res.body.is_shopped).toBe(0);
    expect(res.body.shopped_at).toBeNull();
  });

  it("edits item name and quantity", async () => {
    const res = await request(app)
      .patch("/api/items/1")
      .send({ name: "Whole Milk", quantity: 3 });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Whole Milk");
    expect(res.body.quantity).toBe(3);
  });

  it("returns 404 for non-existent item", async () => {
    const res = await request(app)
      .patch("/api/items/999")
      .send({ is_shopped: 1 });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Item not found");
  });
});

describe("DELETE /api/items/:id", () => {
  beforeEach(async () => {
    await request(app).post("/api/stores/1/items").send({ name: "Milk" });
  });

  it("deletes an item", async () => {
    const res = await request(app).delete("/api/items/1");
    expect(res.status).toBe(204);
  });

  it("returns 404 for non-existent item", async () => {
    const res = await request(app).delete("/api/items/999");
    expect(res.status).toBe(404);
  });
});

describe("POST /api/categories", () => {
  it("creates a custom category", async () => {
    const res = await request(app)
      .post("/api/categories")
      .send({ name: "Spices", icon: "🌶️" });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Spices");
    expect(res.body.icon).toBe("🌶️");
    expect(res.body.is_preset).toBe(0);
  });

  it("returns 400 if name is empty", async () => {
    const res = await request(app)
      .post("/api/categories")
      .send({ name: "" });
    expect(res.status).toBe(400);
  });

  it("returns 409 for duplicate name", async () => {
    await request(app).post("/api/categories").send({ name: "Spices" });
    const res = await request(app).post("/api/categories").send({ name: "Spices" });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Category already exists");
  });
});

describe("GET /api/health", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
