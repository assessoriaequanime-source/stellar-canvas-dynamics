import { useMemo } from "react";
import type { Profile } from "@/lib/avatar-engine";

export type StreamMsg = {
  id: number;
  role: "user" | "ai" | "typing";
  text?: string;
};

type Props = {
  messages: StreamMsg[];
  profile: Profile;
};

/**
 * Computes a trajectory transform per model, by message depth (0 = newest).
 * Older messages drift toward the particle core (center of the screen),
 * scaling down, blurring, fading — as if being absorbed.
 */
function trajectoryFor(profile: Profile, depth: number, fromUser: boolean) {
  // depth 0 = freshly posted (sits above chat bar). depth grows = older.
  // We define a continuous absorption curve up to MAX_VISIBLE messages.
  const MAX = 6;
  if (depth >= MAX) {
    return { opacity: 0, scale: 0.2, x: 0, y: -260, blur: 6, z: 0 };
  }

  // Normalized 0..1 progression toward absorption
  const t = depth / MAX;

  // Vertical lift toward viewport center where particles live
  const liftY = -t * 280; // px upward
  // Horizontal drift — model specific
  let driftX = 0;
  let extraY = 0;
  // Side bias for user vs AI bubble keeps the "fila" readable
  const sideBias = fromUser ? 60 * (1 - t) : -60 * (1 - t);

  switch (profile) {
    case "pedro": {
      // Fibonacci sphere — radial collapse straight to center, gentle spiral
      const angle = depth * 0.55;
      driftX = Math.sin(angle) * 14 * t + sideBias * (1 - t * 0.8);
      extraY = -Math.cos(angle) * 6 * t;
      break;
    }
    case "laura": {
      // Galaxy — orbital arc, swing outward then inward
      const angle = depth * 0.78;
      driftX = Math.sin(angle) * 80 * t * (1 - t * 0.5) + sideBias * (1 - t);
      extraY = Math.sin(angle * 1.4) * 14 * t;
      break;
    }
    case "leticia": {
      // Cubic grid — axonometric step-down, technical diagonal
      driftX = (fromUser ? -1 : 1) * 22 * t + sideBias * (1 - t);
      extraY = -t * 10;
      break;
    }
  }

  const scale = 1 - t * 0.62; // 1 → 0.38
  const opacity = Math.max(0, 1 - t * 1.15); // fade out before absorption
  const blur = t * 3.2;

  return {
    opacity,
    scale,
    x: driftX,
    y: liftY + extraY,
    blur,
    z: -t * 60, // perspective hint
  };
}

export default function ChatStream({ messages, profile }: Props) {
  // Reverse-index so newest = depth 0
  const indexed = useMemo(() => {
    const arr = [...messages];
    return arr.map((m, i) => ({ msg: m, depth: arr.length - 1 - i }));
  }, [messages]);

  return (
    <div id="chat-stream" aria-live="polite">
      {indexed.map(({ msg, depth }) => {
        const fromUser = msg.role === "user";
        const tr = trajectoryFor(profile, depth, fromUser);
        const style: React.CSSProperties = {
          transform: `translate(calc(-50% + ${tr.x}px), ${tr.y}px) scale(${tr.scale})`,
          opacity: tr.opacity,
          filter: tr.blur > 0.05 ? `blur(${tr.blur.toFixed(2)}px)` : undefined,
          zIndex: 100 - depth,
          pointerEvents: depth === 0 ? "auto" : "none",
        };
        return (
          <div
            key={msg.id}
            className={`stream-msg ${fromUser ? "from-user" : "from-ai"}`}
            data-depth={depth}
            style={style}
          >
            <div className={`bubble bubble-${fromUser ? "user" : "ai"}`}>
              {msg.role === "typing" ? (
                <div className="typing">
                  <div className="tdot" />
                  <div className="tdot" />
                  <div className="tdot" />
                </div>
              ) : (
                msg.text
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
