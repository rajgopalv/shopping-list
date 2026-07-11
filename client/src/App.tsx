import { useState, useEffect } from "react";
import { useStores } from "./hooks/useShopping";
import StoreTabs from "./components/StoreTabs";
import ItemList from "./components/ItemList";

const STORE_COLORS: Record<string, { color1: string; color2: string }> = {
  Costco: { color1: "#F5A623", color2: "#E8930C" },
  "Fred Meyer": { color1: "#00A3E0", color2: "#0077B6" },
  "Indian Stores": { color1: "#FF6B35", color2: "#E85D2C" },
};

function getInitialStoreId(): number | null {
  const stored = localStorage.getItem("selectedStoreId");
  return stored ? Number(stored) : null;
}

export default function App() {
  const { data: stores = [] } = useStores();
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(getInitialStoreId);

  useEffect(() => {
    if (stores.length > 0 && !selectedStoreId) {
      setSelectedStoreId(stores[0].id);
    }
  }, [stores, selectedStoreId]);

  useEffect(() => {
    if (selectedStoreId !== null) {
      localStorage.setItem("selectedStoreId", String(selectedStoreId));
    }
  }, [selectedStoreId]);

  const selectedStore = stores.find((s) => s.id === selectedStoreId);
  const colors = selectedStore ? STORE_COLORS[selectedStore.name] : STORE_COLORS.Costco;

  return (
    <div
      className="relative min-h-dvh bg-blobs"
      style={{
        "--blob-color-1": colors?.color1 || "#F5A623",
        "--blob-color-2": colors?.color2 || "#00A3E0",
      } as React.CSSProperties}
    >
      <div className="relative z-10 mx-auto max-w-lg min-h-dvh flex flex-col">
        {/* Header + Store Tabs */}
        <header className="px-5 pt-6 pb-3 flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight shrink-0">
            <span className="mr-1.5">🛒</span>List
          </h1>
          <div className="flex-1 min-w-0">
            <StoreTabs
              stores={stores}
              selectedId={selectedStoreId}
              onSelect={setSelectedStoreId}
            />
          </div>
        </header>

        {/* Item List */}
        <div className="flex-1 px-5 pb-6">
          {selectedStoreId && <ItemList storeId={selectedStoreId} />}
        </div>
      </div>
    </div>
  );
}
