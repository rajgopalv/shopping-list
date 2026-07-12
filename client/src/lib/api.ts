const API_BASE = "/api";

export interface Store {
  id: number;
  name: string;
  icon: string;
  color: string;
  unshopped_count: number;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
  is_preset: number;
}

export interface Item {
  id: number;
  store_id: number;
  category_id: number | null;
  name: string;
  quantity: number;
  is_shopped: number;
  created_at: string;
  shopped_at: string | null;
  category_name: string | null;
  category_icon: string | null;
}

export interface Suggestion {
  name: string;
  frequency: number;
  category_id: number | null;
  category_name: string | null;
  category_icon: string | null;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  getStores: () => request<Store[]>("/stores"),
  getCategories: () => request<Category[]>("/categories"),
  getItems: (storeId: number, includeShopped = false) =>
    request<Item[]>(`/stores/${storeId}/items?include_shopped=${includeShopped}`),
  addItem: (storeId: number, data: { name: string; quantity?: number; category_id?: number | null }) =>
    request<Item>(`/stores/${storeId}/items`, { method: "POST", body: JSON.stringify(data) }),
  updateItem: (itemId: number, data: Partial<Pick<Item, "is_shopped" | "name" | "quantity" | "category_id">>) =>
    request<Item>(`/items/${itemId}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteItem: (itemId: number) =>
    request<void>(`/items/${itemId}`, { method: "DELETE" }),
  deleteShoppedItems: (storeId: number) =>
    request<void>(`/stores/${storeId}/items/shopped`, { method: "DELETE" }),
  addCategory: (data: { name: string; icon?: string }) =>
    request<Category>("/categories", { method: "POST", body: JSON.stringify(data) }),
  getSuggestions: (q: string) =>
    request<Suggestion[]>(`/items/suggestions?q=${encodeURIComponent(q)}`),
  getItemNames: () => request<Suggestion[]>("/item-names"),
  addStore: (data: { name: string; icon?: string }) =>
    request<Store>("/stores", { method: "POST", body: JSON.stringify(data) }),
  deleteStore: (id: number) =>
    request<void>(`/stores/${id}`, { method: "DELETE" }),
  reorderStores: (order: number[]) =>
    request<void>("/stores/reorder", { method: "PATCH", body: JSON.stringify({ order }) }),
};
