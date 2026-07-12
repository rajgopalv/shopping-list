import { useMemo } from "react";
import { Trash2 } from "lucide-react";
import { useItems, useClearShopped } from "@/hooks/useShopping";
import ItemCard from "./ItemCard";
import QuickAddBar from "./QuickAddBar";
import type { Item } from "@/lib/api";

interface Props {
  storeId: number;
  grouped: boolean;
}

export default function ItemList({ storeId, grouped }: Props) {
  const { data: items = [], isLoading } = useItems(storeId, true);
  const clearShopped = useClearShopped(storeId);

  const groupedMap = useMemo(() => groupByCategory(items), [items]);

  const shoppedCount = useMemo(() => items.filter((i) => i.is_shopped).length, [items]);

  return (
    <div className="space-y-5">
      <QuickAddBar storeId={storeId} />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div
            className="w-8 h-8 rounded-full animate-spin"
            style={{ border: "2px solid var(--border)", borderTopColor: "var(--text-muted)" }}
          />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-4xl mb-3 animate-float">🛒</div>
          <p className="text-sm text-faint">Type an item above to get started</p>
        </div>
      ) : (
        <>
          {grouped ? (
            <>
              {Object.entries(groupedMap).map(([category, catItems]) => (
                <CategoryGroup key={category} category={category} items={catItems} storeId={storeId} />
              ))}
            </>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <ItemCard key={item.id} item={item} storeId={storeId} showCategoryIcon />
              ))}
            </div>
          )}

          {shoppedCount > 0 && (
            <div className="flex justify-center">
              <button
                onClick={() => { if (window.confirm(`Clear ${shoppedCount} completed item${shoppedCount > 1 ? "s" : ""}?`)) clearShopped.mutate(); }}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-subtle text-xs font-medium text-dim hover:text-muted hover:border-raised transition-all cursor-pointer"
              >
                <Trash2 size={14} />
                Clear all ({shoppedCount})
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CategoryGroup({
  category,
  items,
  storeId,
}: {
  category: string;
  items: Item[];
  storeId: number;
}) {
  const hasActive = items.some((i) => !i.is_shopped);

  return (
    <div>
      {hasActive && (
        <h3 className="text-xs font-semibold text-faint uppercase tracking-wider mb-2 px-1">
          {items[0]?.category_icon} {category}
        </h3>
      )}
      <div className="space-y-2">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} storeId={storeId} />
        ))}
      </div>
    </div>
  );
}

function groupByCategory(items: Item[]): Record<string, Item[]> {
  const groups: Record<string, Item[]> = {};
  for (const item of items) {
    const cat = item.category_name || "Other";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  }
  return groups;
}
