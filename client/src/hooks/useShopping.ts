import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Store, type Item, type Category } from "../lib/api";

export function useStores() {
  return useQuery<Store[]>({ queryKey: ["stores"], queryFn: api.getStores });
}

export function useCategories() {
  return useQuery<Category[]>({ queryKey: ["categories"], queryFn: api.getCategories });
}

export function useItems(storeId: number | null, includeShopped = true) {
  return useQuery<Item[]>({
    queryKey: ["items", storeId, includeShopped],
    queryFn: () => api.getItems(storeId!, includeShopped),
    enabled: storeId !== null,
  });
}

export function useAddItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ storeId, ...data }: { storeId: number; name: string; quantity?: number; category_id?: number | null }) =>
      api.addItem(storeId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["items", variables.storeId] });
    },
  });
}

export function useUpdateItem(storeId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, ...data }: { itemId: number; is_shopped?: number; name?: string; quantity?: number; category_id?: number | null }) =>
      api.updateItem(itemId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items", storeId] });
    },
  });
}

export function useDeleteItem(storeId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) => api.deleteItem(itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items", storeId] });
    },
  });
}

export function useClearShopped(storeId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.deleteShoppedItems(storeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items", storeId] });
    },
  });
}

export function useAddCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; icon?: string }) => api.addCategory(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}
