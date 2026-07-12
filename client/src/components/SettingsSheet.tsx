import { useState, type FormEvent } from "react";
import { X, Layers, List, Plus, Trash2, ChevronUp, ChevronDown, Sun, Moon, Monitor, Github } from "lucide-react";
import { useAddStore, useDeleteStore, useReorderStores } from "@/hooks/useShopping";
import type { Theme } from "@/hooks/useTheme";
import type { Store } from "@/lib/api";
import { cn } from "@/lib/utils";

const EMOJIS = ["🟡", "🔵", "🟠", "🔴", "🟢", "🟣", "🟤", "⚪"];

interface Props {
  open: boolean;
  onClose: () => void;
  grouped: boolean;
  onToggleGroup: () => void;
  stores: Store[];
  theme: Theme;
  onThemeChange: (t: Theme) => void;
}

const THEME_OPTIONS: { key: Theme; label: string; icon: typeof Sun }[] = [
  { key: "light", label: "Light", icon: Sun },
  { key: "dark", label: "Dark", icon: Moon },
  { key: "system", label: "System", icon: Monitor },
];

export default function SettingsSheet({ open, onClose, grouped, onToggleGroup, stores, theme, onThemeChange }: Props) {
  const addStore = useAddStore();
  const deleteStore = useDeleteStore();
  const reorderStores = useReorderStores();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🛒");
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addStore.mutate(
      { name: name.trim(), icon },
      {
        onSuccess: () => {
          setName("");
          setIcon("🛒");
          setShowForm(false);
        },
      }
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div
        className="absolute inset-0"
        style={{ background: "var(--dialog-overlay)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg mx-auto bg-surface-raised backdrop-blur-2xl border-t border-raised rounded-t-3xl p-5 pb-8 animate-slide-up shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xs font-semibold text-dim uppercase tracking-wider">Settings</h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-xl text-dim hover:text-muted hover:bg-surface-hover transition-all cursor-pointer"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Theme */}
          <div>
            <label className="text-xs font-medium text-dim mb-2 block">Theme</label>
            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-surface w-fit">
              {THEME_OPTIONS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => onThemeChange(key)}
                  className={cn(
                    "flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer",
                    theme === key ? "bg-surface-raised text-muted shadow-sm" : "text-dim hover:text-muted"
                  )}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* View mode */}
          <div>
            <label className="text-xs font-medium text-dim mb-2 block">List view</label>
            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-surface w-fit">
              <button
                onClick={() => { if (!grouped) onToggleGroup(); }}
                className={cn(
                  "flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer",
                  grouped ? "bg-surface-raised text-muted shadow-sm" : "text-dim hover:text-muted"
                )}
              >
                <Layers size={13} />
                Grouped
              </button>
              <button
                onClick={() => { if (grouped) onToggleGroup(); }}
                className={cn(
                  "flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer",
                  !grouped ? "bg-surface-raised text-muted shadow-sm" : "text-dim hover:text-muted"
                )}
              >
                <List size={13} />
                Flat
              </button>
            </div>
          </div>

          {/* Add store */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-dim">Stores</label>
              <button
                onClick={() => setShowForm((v) => !v)}
                className="flex items-center gap-1 text-xs text-dim hover:text-muted transition-all cursor-pointer"
              >
                <Plus size={13} />
                Add store
              </button>
            </div>

            {showForm && (
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="w-10 h-10 rounded-xl bg-surface border border-subtle text-center text-lg outline-none focus:border-raised transition-all"
                    maxLength={2}
                  />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Store name"
                  className="flex-1 h-10 rounded-xl bg-surface border border-subtle px-3 text-sm text-default placeholder:text-faint outline-none focus:border-raised transition-all"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!name.trim() || addStore.isPending}
                  className="flex-shrink-0 flex items-center justify-center px-4 h-10 rounded-xl text-xs font-medium bg-surface-raised border border-raised text-muted hover:bg-surface-hover transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  {addStore.isPending ? "..." : "Add"}
                </button>
              </form>
            )}

            {showForm && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setIcon(e)}
                    className={cn(
                      "w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-all cursor-pointer",
                      icon === e ? "bg-surface-hover ring-1 ring-raised scale-110" : "bg-surface hover:bg-surface-raised"
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Store list */}
          {stores.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-dim mb-2 block">Reorder & delete</label>
              {stores.map((store, i) => (
                <div
                  key={store.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface"
                >
                  <span className="text-sm w-6 text-center">{store.icon}</span>
                  <span className="flex-1 text-sm text-secondary truncate">{store.name}</span>

                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => {
                        const next = [...stores];
                        const ids = next.map((s) => s.id);
                        [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
                        reorderStores.mutate(ids);
                      }}
                      disabled={i === 0}
                      className="flex items-center justify-center w-7 h-7 rounded-lg text-dim hover:text-muted hover:bg-surface-raised transition-all disabled:opacity-15 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronUp size={15} strokeWidth={2} />
                    </button>
                    <button
                      onClick={() => {
                        const next = [...stores];
                        const ids = next.map((s) => s.id);
                        [ids[i], ids[i + 1]] = [ids[i + 1], ids[i]];
                        reorderStores.mutate(ids);
                      }}
                      disabled={i === stores.length - 1}
                      className="flex items-center justify-center w-7 h-7 rounded-lg text-dim hover:text-muted hover:bg-surface-raised transition-all disabled:opacity-15 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronDown size={15} strokeWidth={2} />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      if (window.confirm(`Delete "${store.name}" and all its items?`)) {
                        deleteStore.mutate(store.id);
                      }
                    }}
                    className="flex items-center justify-center w-7 h-7 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-500/15 transition-all cursor-pointer"
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-1.5 pt-2 text-faint text-xs">
            <Github size={13} strokeWidth={1.5} />
            <span>@rajgopalv</span>
          </div>
      </div>
    </div>
  );
}
