import { useEffect, useRef, useState } from "react";

export type RailAction = {
  id: string;
  label: string;
  hint?: string;
  svg: React.ReactNode;
  onClick?: () => void;
};

type Props = {
  actions: RailAction[];
  onReorder?: (next: RailAction[]) => void;
  onClose?: () => void;
};

/**
 * ActionRail — refined vertical rail anchored to the right edge.
 * Premium spacing, two-line buttons (label + hint), draggable to reorder.
 * On mobile, parent shell turns this into a bottom sheet.
 */
export default function ActionRail({ actions, onReorder, onClose }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const overIdRef = useRef<string | null>(null);

  useEffect(() => {
    overIdRef.current = overId;
  }, [overId]);

  const onDragStart = (id: string) => (e: React.DragEvent) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (id: string) => (e: React.DragEvent) => {
    e.preventDefault();
    setOverId(id);
  };
  const commitDrop = () => {
    const targetId = overIdRef.current;
    if (!dragId || !targetId || !onReorder || dragId === targetId) {
      setDragId(null);
      setOverId(null);
      return;
    }
    const from = actions.findIndex((a) => a.id === dragId);
    const to = actions.findIndex((a) => a.id === targetId);
    if (from < 0 || to < 0) {
      setDragId(null);
      setOverId(null);
      return;
    }
    const next = [...actions];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    onReorder(next);
    setDragId(null);
    setOverId(null);
  };

  const filtered = query
    ? actions.filter((a) =>
        (a.label + " " + (a.hint ?? "")).toLowerCase().includes(query.toLowerCase()),
      )
    : actions;

  return (
    <aside className="rail" aria-label="Menu de ações">
      <header className="rail-head">
        <div className="rail-head-titles">
          <span className="rail-eyebrow">Menu</span>
          <h2 className="rail-title">Ações</h2>
        </div>
        {onClose && (
          <button className="rail-close" onClick={onClose} aria-label="Fechar menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </header>

      <div className="rail-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar ação…"
          spellCheck={false}
        />
      </div>

      <ul className="rail-list">
        {filtered.map((a) => (
          <li
            key={a.id}
            className={`rail-item ${dragId === a.id ? "is-dragging" : ""} ${overId === a.id && dragId && dragId !== a.id ? "is-over" : ""}`}
            draggable
            onDragStart={onDragStart(a.id)}
            onDragOver={onDragOver(a.id)}
            onDragEnd={commitDrop}
            onDrop={commitDrop}
          >
            <button
              className="rail-btn"
              onClick={a.onClick}
              title={a.hint ?? a.label}
            >
              <span className="rail-grip" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <circle cx="9" cy="6" r="1" />
                  <circle cx="15" cy="6" r="1" />
                  <circle cx="9" cy="12" r="1" />
                  <circle cx="15" cy="12" r="1" />
                  <circle cx="9" cy="18" r="1" />
                  <circle cx="15" cy="18" r="1" />
                </svg>
              </span>
              <span className="rail-ico">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                  {a.svg}
                </svg>
              </span>
              <span className="rail-text">
                <span className="rail-label">{a.label}</span>
                {a.hint && <span className="rail-hint">{a.hint}</span>}
              </span>
              <span className="rail-chev" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </span>
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="rail-empty">Nenhuma ação encontrada</li>
        )}
      </ul>

      <footer className="rail-foot">
        <span className="rail-foot-hint">Arraste para reordenar</span>
      </footer>
    </aside>
  );
}
