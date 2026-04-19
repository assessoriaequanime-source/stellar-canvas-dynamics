import { useEffect, useMemo, useRef } from "react";
import type { Profile } from "@/lib/avatar-engine";
import type { AvatarEngine } from "@/lib/avatar-engine";

export type StreamMsg = {
  id: number;
  role: "user" | "ai" | "typing";
  text?: string;
};

type Props = {
  messages: StreamMsg[];
  profile: Profile;
  engineRef?: React.MutableRefObject<AvatarEngine | null>;
};

const MAX = 6; // visible depth before full absorption

/**
 * Trajectory per profile, parameterized by depth t = depth/MAX in [0,1].
 * Sharper readability at low depth; quicker ofuscation as depth grows.
 */
function trajectoryFor(profile: Profile, depth: number, fromUser: boolean) {
  if (depth >= MAX) {
    return { opacity: 0, scale: 0.18, x: 0, y: -300, blur: 8, absorbed: true };
  }
  const t = depth / MAX;

  // Vertical lift toward the particle core (screen center area)
  const liftY = -t * 320;

  // Side bias so user/AI lanes stay readable
  const sideBias = fromUser ? 70 * Math.pow(1 - t, 1.4) : -70 * Math.pow(1 - t, 1.4);

  let driftX = 0;
  let extraY = 0;
  switch (profile) {
    case "pedro": {
      const angle = depth * 0.55;
      driftX = Math.sin(angle) * 16 * t + sideBias;
      extraY = -Math.cos(angle) * 6 * t;
      break;
    }
    case "laura": {
      const angle = depth * 0.78;
      driftX = Math.sin(angle) * 90 * t * (1 - t * 0.5) + sideBias;
      extraY = Math.sin(angle * 1.4) * 14 * t;
      break;
    }
    case "leticia": {
      driftX = (fromUser ? -1 : 1) * 26 * t + sideBias;
      extraY = -t * 12;
      break;
    }
  }

  // Sharp at top of stack, ofuscated quickly as it recedes
  // depth 0: opacity 1.0, blur 0
  // depth 1: opacity ~0.78, blur ~0.6  (still legível)
  // depth 2: opacity ~0.55, blur ~1.4
  // depth 3: opacity ~0.34, blur ~2.6
  // depth 4: opacity ~0.18, blur ~4.0
  // depth 5: opacity ~0.07, blur ~5.8
  const scale = 1 - Math.pow(t, 1.2) * 0.66; // slower shrink early, faster late
  const opacity = Math.max(0, Math.pow(1 - t, 1.55));
  const blur = Math.pow(t, 1.35) * 6;

  return { opacity, scale, x: driftX, y: liftY + extraY, blur, absorbed: false };
}

export default function ChatStream({ messages, profile, engineRef }: Props) {
  const indexed = useMemo(() => {
    const arr = [...messages];
    return arr.map((m, i) => ({ msg: m, depth: arr.length - 1 - i }));
  }, [messages]);

  // Track which message ids have already triggered absorption to avoid duplicate calls
  const absorbedIdsRef = useRef<Set<number>>(new Set());
  const elRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());

  useEffect(() => {
    if (!engineRef?.current) return;
    // For each message at depth >= MAX-1, fire absorbAt once at its current screen position.
    // We trigger right when it's about to vanish (depth reaches MAX-1), giving particle
    // burst coherence with the bubble's last visible spot.
    indexed.forEach(({ msg, depth }) => {
      if (msg.role === "typing") return;
      if (absorbedIdsRef.current.has(msg.id)) return;
      if (depth < MAX - 1) return;
      const el = elRefs.current.get(msg.id);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      // Slight delay so it lines up with the trajectory finishing its motion
      window.setTimeout(() => {
        engineRef.current?.absorbAt(cx, cy);
      }, 400);
      absorbedIdsRef.current.add(msg.id);
    });
  }, [indexed, engineRef]);

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
            ref={(el) => {
              if (el) elRefs.current.set(msg.id, el);
              else elRefs.current.delete(msg.id);
            }}
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
