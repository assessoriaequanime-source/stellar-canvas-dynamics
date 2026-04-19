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
};

/**
 * ActionRail — progressive curved-path side modal.
 * Starts narrow at top-right and unfolds along a gentle diagonal curve toward
 * the lower-middle of the viewport as the user reveals more options.
 * Buttons are draggable to reorder by logical priority.
 */
export default function ActionRail({ actions, onReorder }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [revealed, setRevealed] = useState(2); // initial visible items
  const [dragId, setDragId] = useState<string | null>(null);
  const overIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (expanded) setRevealed(actions.length);
  }, [expanded, actions.length]);

  const showCount = expanded ? actions.length : Math.min(revealed, actions.length);

  const onDragStart = (id: string) => (e: React.DragEvent) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (id: string) => (e: React.DragEvent) => {
    e.preventDefault();
    overIdRef.current = id;
  };
  const onDragEnd = () => {
    if (!dragId || !overIdRef.current || !onReorder) return setDragId(null);
    const from = actions.findIndex((a) => a.id === dragId);
    const to = actions.findIndex((a) => a.id === overIdRef.current);
    if (from < 0 || to < 0 || from === to) return setDragId(null);
    const next = [...actions];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    onReorder(next);
    setDragId(null);
    overIdRef.current = null;
  };

  return (
    <div className={`rail ${expanded ? "rail-expanded" : ""}`} aria-label="Trilha de ações">
      <svg className="rail-path" viewBox="0 0 100 600" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="railGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(var(--accent-rgb),0.55)" />
            <stop offset="100%" stopColor="rgba(var(--accent-rgb),0.05)" />
          </linearGradient>
        </defs>
        {/* Diagonal curve from top-right narrow → bottom-mid wider */}
        <path
          d="M 78 0 C 90 140, 30 280, 50 600"
          stroke="url(#railGrad)"
          strokeWidth="1.2"
          fill="none"
          opacity="0.7"
        />
        <path
          d="M 78 0 C 90 140, 30 280, 50 600"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="22"
          fill="none"
          strokeLinecap="round"
        />
      </svg>

      <ul className="rail-list">
        {actions.slice(0, showCount).map((a, i) => {
          // Progressive geometry: each step grows in width and shifts left along the curve
          const t = i / Math.max(actions.length - 1, 1);
          const offsetX = t * 18; // shifts toward center
          const width = 132 + t * 64; // grows progressively
          return (
            <li
              key={a.id}
              className={`rail-item ${dragId === a.id ? "rail-dragging" : ""}`}
              style={{
                transform: `translateX(${-offsetX}px)`,
                width: `${width}px`,
                animationDelay: `${i * 60}ms`,
              }}
              draggable
              onDragStart={onDragStart(a.id)}
              onDragOver={onDragOver(a.id)}
              onDragEnd={onDragEnd}
              onDrop={onDragEnd}
            >
              <button
                className="rail-btn"
                onClick={a.onClick}
                title={a.hint ?? a.label}
              >
                <span className="rail-ico">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                    {a.svg}
                  </svg>
                </span>
                <span className="rail-label">{a.label}</span>
              </button>
            </li>
          );
        })}

        {showCount < actions.length && (
          <li className="rail-item rail-more-li" style={{ transform: `translateX(-${(showCount / Math.max(actions.length - 1, 1)) * 18}px)` }}>
            <button
              className="rail-more"
              onClick={() => setRevealed((r) => Math.min(r + 2, actions.length))}
              title="Mais opções"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
              <span>Mais</span>
            </button>
          </li>
        )}
      </ul>

      <button
        className="rail-toggle"
        onClick={() => setExpanded((v) => !v)}
        aria-pressed={expanded}
        title={expanded ? "Recolher trilha" : "Expandir trilha"}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
          {expanded ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
        </svg>
      </button>
    </div>
  );
}
