import { useState, useEffect } from "react";
import { Settings } from "lucide-react";
import { useStores } from "./hooks/useShopping";
import StoreTabs from "./components/StoreTabs";
import ItemList from "./components/ItemList";
import SettingsSheet from "./components/SettingsSheet";

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
  const [grouped, setGrouped] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  useEffect(() => {
    if (selectedStoreId !== null && stores.length > 0 && !stores.find((s) => s.id === selectedStoreId)) {
      setSelectedStoreId(stores[0].id);
    }
  }, [stores, selectedStoreId]);

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
        <header className="px-5 pt-6 pb-3 flex items-center gap-3">
          <h1 className="text-xl shrink-0">🛒</h1>
          <div className="flex-1 min-w-0">
            <StoreTabs
              stores={stores}
              selectedId={selectedStoreId}
              onSelect={setSelectedStoreId}
            />
          </div>

          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center justify-center w-8 h-8 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/10 transition-all cursor-pointer"
          >
            <Settings size={16} strokeWidth={1.5} />
          </button>
        </header>

        <div className="flex-1 px-5 pb-6">
          {selectedStoreId && <ItemList storeId={selectedStoreId} grouped={grouped} />}
        </div>
      </div>

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        grouped={grouped}
        onToggleGroup={() => setGrouped((g) => !g)}
        stores={stores}
      />
    </div>
  );
}
