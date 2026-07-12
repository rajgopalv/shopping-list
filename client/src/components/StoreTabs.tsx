import { useRef, useEffect } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (stores.length === 0) return;
    const container = containerRef.current;
    const active = activeRef.current;
    if (!container || !active) return;

    const containerWidth = container.offsetWidth;
    const buttonLeft = active.offsetLeft;
    const buttonWidth = active.offsetWidth;
    const target = buttonLeft - containerWidth / 2 + buttonWidth / 2;

    container.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [selectedId, stores.length > 0]);

  return (
    <div ref={containerRef} className="flex gap-1 p-1 overflow-x-auto flex-nowrap scrollbar-none glass">
      {stores.map((store) => {
        const isActive = store.id === selectedId;
        const style = STORE_STYLES[store.name] || STORE_STYLES.Costco;

        return (
          <button
            key={store.id}
            ref={isActive ? activeRef : undefined}
            onClick={() => onSelect(store.id)}
            className={cn(
              "flex-shrink-0 flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg whitespace-nowrap",
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
            <span className="truncate max-w-[72px]">{store.name.split(" ")[0]}</span>
            <span className="text-[10px] font-semibold text-white/50 bg-white/10 rounded-full px-1.5 py-[1px] leading-none">
              {store.unshopped_count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
