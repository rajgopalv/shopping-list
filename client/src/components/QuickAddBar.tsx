import { useState, useRef, useEffect } from "react";
import { Plus, Minus, X } from "lucide-react";
import { useCategories, useAddItem } from "@/hooks/useShopping";

interface Props {
  storeId: number;
}

export default function QuickAddBar({ storeId }: Props) {
  const { data: categories = [] } = useCategories();
  const addItem = useAddItem();
  const inputRef = useRef<HTMLInputElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const [raw, setRaw] = useState("");
  const [qty, setQty] = useState(1);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [qtyOpen, setQtyOpen] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pillRef.current && !pillRef.current.contains(e.target as Node)) {
        setQtyOpen(false);
      }
    };
    if (qtyOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [qtyOpen]);

  const handleSubmit = () => {
    const name = raw.trim();
    if (!name) return;

    addItem.mutate(
      { storeId, name, quantity: qty, category_id: selectedCategoryId },
      {
        onSuccess: () => {
          setRaw("");
          setQty(1);
          setSelectedCategoryId(null);
          setQtyOpen(false);
          inputRef.current?.focus();
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      setRaw("");
      setQty(1);
      setQtyOpen(false);
      setSelectedCategoryId(null);
      inputRef.current?.blur();
    }
  };

  const adjustQty = (delta: number) => {
    setQty((q) => Math.max(1, q + delta));
  };

  const canAdd = raw.trim().length > 0;

  return (
    <div className="glass-strong p-3 rounded-2xl mb-5 animate-fade-up">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Add item…"
          className="flex-1 min-w-0 bg-transparent text-base text-white placeholder-white/30 outline-none py-1.5"
        />

        {/* Quantity pill — always visible, tap for +/- */}
        <div ref={pillRef} className="relative flex-shrink-0 w-10 h-7">
          <button
            onClick={() => setQtyOpen((v) => !v)}
            className="flex items-center justify-center w-10 h-7 rounded-lg text-xs font-bold tabular-nums bg-white/10 border border-white/15 text-white/70 transition-all duration-150 cursor-pointer"
          >
            ×{qty}
          </button>
          {qtyOpen && (
            <div className="absolute left-1/2 -translate-x-1/2 -top-8 flex flex-col items-center bg-white/10 backdrop-blur-xl border border-white/15 rounded-xl p-1 z-10 shadow-lg">
              <button
                onClick={(e) => { e.stopPropagation(); adjustQty(1); }}
                className="w-10 h-7 flex items-center justify-center rounded-lg active:bg-white/15 text-white/80 cursor-pointer"
              >
                <Plus size={14} strokeWidth={2.5} />
              </button>
              <div className="w-10 h-7 flex items-center justify-center rounded-lg text-xs font-bold tabular-nums text-white/70">
                ×{qty}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (qty > 1) {
                    adjustQty(-1);
                  } else if (canAdd) {
                    setRaw("");
                    setQty(1);
                  }
                }}
                disabled={qty <= 1 && !canAdd}
                className="w-10 h-7 flex items-center justify-center rounded-lg disabled:opacity-20 disabled:cursor-not-allowed active:bg-white/15 text-white/80 cursor-pointer"
              >
                {qty > 1 ? <Minus size={14} strokeWidth={2.5} /> : <X size={14} strokeWidth={2.5} />}
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canAdd}
          className="flex-shrink-0 flex items-center justify-center px-5 h-10 rounded-xl transition-all duration-200 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
          style={{
            background: canAdd
              ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              : "rgba(255,255,255,0.06)",
          }}
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* Category emoji row — show only when focused or has input */}
      {(focused || raw.length > 0) && (
        <div className="flex gap-1.5 mt-2 overflow-x-auto scrollbar-none">
        {categories.map((cat) => (
          <CategoryEmoji
            key={cat.id}
            category={cat}
            selected={selectedCategoryId === cat.id}
            onClick={() => {
              setSelectedCategoryId(selectedCategoryId === cat.id ? null : cat.id);
              inputRef.current?.focus();
            }}
          />
        ))}
        </div>
      )}

    </div>
  );
}

function CategoryEmoji({
  category,
  selected,
  onClick,
}: {
  category: { id: number; icon: string; name: string };
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-1.5 rounded-full transition-all duration-300 cursor-pointer flex-shrink-0
        ${selected
          ? "bg-purple-500/25 border border-purple-500/40 px-3 py-1"
          : "w-8 h-8 justify-center hover:bg-white/10 border border-transparent"
        }
      `}
      title={category.name}
    >
      <span className="text-sm leading-none">{category.icon}</span>
      {selected && (
        <span className="text-[11px] font-medium whitespace-nowrap text-white/80 leading-none">
          {category.name}
        </span>
      )}
    </button>
  );
}


