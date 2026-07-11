import { cn } from "@/lib/utils";
import type { Store } from "@/lib/api";

const STORE_STYLES: Record<string, { glow: string; bg: string }> = {
  Costco: { glow: "rgba(245, 166, 35, 0.3)", bg: "rgba(245, 166, 35, 0.12)" },
  "Fred Meyer": { glow: "rgba(0, 163, 224, 0.3)", bg: "rgba(0, 163, 224, 0.12)" },
  "Indian Stores": { glow: "rgba(255, 107, 53, 0.3)", bg: "rgba(255, 107, 53, 0.12)" },
};

interface Props {
  stores: Store[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export default function StoreTabs({ stores, selectedId, onSelect }: Props) {
  return (
    <div className="flex gap-1 p-1 glass">
      {stores.map((store) => {
        const isActive = store.id === selectedId;
        const style = STORE_STYLES[store.name] || STORE_STYLES.Costco;

        return (
          <button
            key={store.id}
            onClick={() => onSelect(store.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg",
              "font-medium text-xs transition-all duration-300",
              isActive
                ? "text-white"
                : "text-white/40 hover:text-white/60"
            )}
            style={
              isActive
                ? {
                    background: style.bg,
                    boxShadow: `0 0 20px ${style.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`,
                    border: `1px solid ${style.glow}`,
                  }
                : undefined
            }
          >
            <span className="text-sm">{store.icon}</span>
            <span className="truncate">{store.name.split(" ")[0]}</span>
          </button>
        );
      })}
    </div>
  );
}
