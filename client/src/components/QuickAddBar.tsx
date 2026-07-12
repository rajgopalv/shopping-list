import { useState, useRef, useEffect } from "react";
import { Plus, Minus, X } from "lucide-react";
import { useAddItem, useSuggestions } from "@/hooks/useShopping";
import type { Suggestion } from "@/lib/api";

interface Props {
  storeId: number;
}

export default function QuickAddBar({ storeId }: Props) {
  const addItem = useAddItem();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [raw, setRaw] = useState("");
  const [qty, setQty] = useState(1);
  const [qtyOpen, setQtyOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hideTimeout, setHideTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const suggestions = useSuggestions(raw);

  useEffect(() => {
    if (!raw.trim() || suggestions.length === 0) {
      setShowSuggestions(false);
    } else {
      if (hideTimeout) clearTimeout(hideTimeout);
      setShowSuggestions(true);
    }
  }, [raw, suggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setQtyOpen(false);
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const clearInput = () => {
    setRaw("");
    setQty(1);
    setQtyOpen(false);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleSubmit = (suggestion?: Suggestion) => {
    const name = suggestion?.name || raw.trim();
    if (!name) return;

    addItem.mutate(
      { storeId, name, quantity: qty, category_id: suggestion?.category_id ?? null },
      { onSuccess: clearInput }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      if (showSuggestions) {
        setShowSuggestions(false);
      } else {
        clearInput();
        inputRef.current?.blur();
      }
    }
    if (e.key === "ArrowDown" && showSuggestions && suggestions.length > 0) {
      e.preventDefault();
    }
  };

  const handleFocus = () => {
    if (hideTimeout) clearTimeout(hideTimeout);
    if (raw.trim() && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    const t = setTimeout(() => setShowSuggestions(false), 200);
    setHideTimeout(t);
  };

  const handleSuggestionMouseDown = (suggestion: Suggestion) => {
    if (hideTimeout) clearTimeout(hideTimeout);
    handleSubmit(suggestion);
  };

  const adjustQty = (delta: number) => {
    setQty((q) => Math.max(1, q + delta));
  };

  const canAdd = raw.trim().length > 0;

  return (
    <div ref={containerRef} className="glass-strong p-3 rounded-2xl mb-5 animate-fade-up relative">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Add item…"
          autoComplete="off"
          className="flex-1 min-w-0 bg-transparent text-base text-default placeholder:text-faint outline-none py-1.5"
        />

        <div className="relative flex-shrink-0 w-10 h-7">
          <button
            onClick={() => setQtyOpen((v) => !v)}
            disabled={!canAdd}
            className="flex items-center justify-center w-10 h-7 rounded-lg text-xs font-bold tabular-nums bg-surface-raised border border-raised text-muted transition-all duration-150 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
          >
            ×{qty}
          </button>
          {qtyOpen && (
            <div className="absolute left-1/2 -translate-x-1/2 -top-8 flex flex-col items-center bg-surface-raised backdrop-blur-xl border border-raised rounded-xl p-1 z-20 shadow-lg">
              <button
                onClick={(e) => { e.stopPropagation(); adjustQty(1); }}
                className="w-10 h-7 flex items-center justify-center rounded-lg active:bg-surface-hover text-secondary cursor-pointer"
              >
                <Plus size={14} strokeWidth={2.5} />
              </button>
              <div className="w-10 h-7 flex items-center justify-center rounded-lg text-xs font-bold tabular-nums text-muted">
                ×{qty}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (qty > 1) {
                    adjustQty(-1);
                  } else if (canAdd) {
                    clearInput();
                  }
                }}
                disabled={qty <= 1 && !canAdd}
                className="w-10 h-7 flex items-center justify-center rounded-lg disabled:opacity-20 disabled:cursor-not-allowed active:bg-surface-hover text-secondary cursor-pointer"
              >
                {qty > 1 ? <Minus size={14} strokeWidth={2.5} /> : <X size={14} strokeWidth={2.5} />}
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => handleSubmit()}
          disabled={!canAdd}
          className="flex-shrink-0 flex items-center justify-center px-5 h-10 rounded-xl transition-all duration-200 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
          style={{
            background: canAdd
              ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              : "var(--surface)",
          }}
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </div>

      {showSuggestions && (
        <div className="mt-2 border-t border-subtle pt-2 max-h-48 overflow-y-auto space-y-0.5">
          {suggestions.map((s) => (
            <button
              key={s.name}
              onMouseDown={() => handleSuggestionMouseDown(s)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted hover:bg-surface-raised hover:text-default transition-all duration-150 cursor-pointer text-left"
            >
              {s.category_icon && (
                <span className="flex-shrink-0 text-sm w-5 text-center">{s.category_icon}</span>
              )}
              <span className="flex-1 truncate">{s.name}</span>
              <span className="text-[11px] text-fainter tabular-nums flex-shrink-0">×{s.frequency}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
