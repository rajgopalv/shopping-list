import { useState, useRef, useEffect } from "react";
import { Trash2, Check, Minus, Plus } from "lucide-react";
import { useUpdateItem, useDeleteItem } from "@/hooks/useShopping";
import type { Item } from "@/lib/api";

const SWIPE_THRESHOLD = 80;

interface Props {
  item: Item;
  storeId: number;
}

export default function ItemCard({ item, storeId }: Props) {
  const [completing, setCompleting] = useState(false);
  const [qtyOpen, setQtyOpen] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const pillRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const updateItem = useUpdateItem(storeId);
  const deleteItem = useDeleteItem(storeId);

  const isShopped = item.is_shopped === 1;

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

  const handleToggleShop = () => {
    if (!isShopped) {
      setCompleting(true);
      setTimeout(() => {
        setCompleting(false);
        updateItem.mutate({ itemId: item.id, is_shopped: 1 });
      }, 500);
    } else {
      setCompleting(false);
      updateItem.mutate({ itemId: item.id, is_shopped: 0 });
    }
  };

  const handleDelete = () => {
    setCompleting(true);
    setTimeout(() => {
      deleteItem.mutate(item.id);
    }, 350);
  };

  const adjustQty = (delta: number) => {
    const next = Math.max(1, item.quantity + delta);
    if (next !== item.quantity) {
      updateItem.mutate({ itemId: item.id, quantity: next });
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.touches[0].clientX - touchStart.current.x;
    const dy = e.touches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      setSwipeOffset(dx);
    }
  };

  const onTouchEnd = () => {
    if (!touchStart.current) return;
    const dx = swipeOffset;
    touchStart.current = null;

    if (dx > SWIPE_THRESHOLD && !isShopped) {
      navigator.vibrate?.(10);
      handleToggleShop();
    } else if (dx < -SWIPE_THRESHOLD) {
      if (window.confirm("Delete this item?")) {
        navigator.vibrate?.(10);
        handleDelete();
      }
    }
    setSwipeOffset(0);
  };

  return (
    <div className="relative rounded-2xl">
      {/* Swipe hint icons */}
      {swipeOffset > 20 && !isShopped && (
        <div
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-100"
          style={{ opacity: Math.min(1, swipeOffset / SWIPE_THRESHOLD) }}
        >
          <Check size={22} strokeWidth={3} className="text-green-400" />
        </div>
      )}
      {swipeOffset < -20 && (
        <div
          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-100"
          style={{ opacity: Math.min(1, -swipeOffset / SWIPE_THRESHOLD) }}
        >
          <Trash2 size={22} strokeWidth={3} className="text-red-400" />
        </div>
      )}

      <div
        ref={cardRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className={`item-card glass-strong relative p-4 flex items-center gap-3 ${
          completing ? "completing" : ""
        } ${isShopped ? "shopped" : ""}`}
        style={{
          zIndex: qtyOpen ? 10 : undefined,
          transform: swipeOffset ? `translateX(${swipeOffset}px)` : undefined,
          transition: swipeOffset ? "none" : undefined,
        }}
      >
      {/* Quantity pill — always visible, tap for +/- */}
      <div ref={pillRef} className="relative flex-shrink-0 w-9 h-7">
        <button
          onClick={() => setQtyOpen((v) => !v)}
          className="flex items-center justify-center w-9 h-7 rounded-lg text-xs font-bold tabular-nums bg-white/10 border border-white/15 text-white/70 transition-all duration-150 cursor-pointer"
        >
          ×{item.quantity}
        </button>
        {qtyOpen && (
          <div className="absolute left-1/2 -translate-x-1/2 -top-8 flex flex-col items-center bg-white/10 backdrop-blur-xl border border-white/15 rounded-xl p-1 z-50 shadow-lg">
            <button
              onClick={(e) => { e.stopPropagation(); adjustQty(1); }}
              className="w-9 h-7 flex items-center justify-center rounded-lg active:bg-white/15 text-white/80 cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} />
            </button>
            <div className="w-9 h-7 flex items-center justify-center rounded-lg text-xs font-bold tabular-nums text-white/70">
              ×{item.quantity}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (item.quantity > 1) {
                  adjustQty(-1);
                } else if (window.confirm("Delete this item?")) {
                  handleDelete();
                }
              }}
              className="w-9 h-7 flex items-center justify-center rounded-lg active:bg-white/15 text-white/80 cursor-pointer"
            >
              {item.quantity > 1 ? <Minus size={14} strokeWidth={2.5} /> : <Trash2 size={14} strokeWidth={2.5} />}
            </button>
            </div>
          )}

        </div>

      {/* Item info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-medium text-sm ${isShopped || completing ? "strike-through text-white/40" : "text-white"}`}>
            {item.name}
          </span>
        </div>
        {item.category_name && (
          <span className="category-pill mt-1.5">
            {item.category_icon} {item.category_name}
          </span>
        )}
      </div>

      {/* Checkbox — right side for thumb reach */}
      <button
        onClick={handleToggleShop}
        className={`shop-checkbox ${isShopped ? "checked" : ""}`}
        aria-label={isShopped ? "Mark as not shopped" : "Mark as shopped"}
      >
        {isShopped && <Check size={16} strokeWidth={3} />}
      </button>

      </div>
    </div>
  );
}
