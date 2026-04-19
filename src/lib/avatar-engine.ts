import * as THREE from "three";
import { gsap } from "gsap";

export type Profile = "pedro" | "laura" | "leticia";

/**
 * AvatarEngine — particle field with morphing + "knowledge absorption".
 *
 * Absorption model:
 *  - Each particle has an `absorbed` flag (0 or 1).
 *  - When the chat stream calls `absorbAt(x, y)` with a screen point:
 *      1) We find the nearest NOT-absorbed particle whose projected screen
 *         position is closest to (x, y).
 *      2) That particle is flagged absorbed: it animates toward the field
 *         center, turns white and flares brighter — that's the "knowledge"
 *         entering the avatar.
 *      3) To keep the structure organized, a previously-absorbed center
 *         particle is "promoted" outward to fill the empty slot, OR if none
 *         exists yet, the absorbed particle stays at center and the field
 *         reorganizes naturally over future absorptions. This produces a
 *         growing white core surrounded by colored shell — visually coherent
 *         with the alignment of learning.
 */
export class AvatarEngine {
  container: HTMLElement;
  isMobile: boolean;
  isTablet: boolean;
  N: number;
  BR: number;
  mouse: THREE.Vector2;
  clock: THREE.Clock;
  profile: Profile;
  morphing: boolean;
  palettes: Record<Profile, THREE.Color>;
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  geo?: THREE.BufferGeometry;
  mat?: THREE.ShaderMaterial;
  points?: THREE.Points;
  rafId = 0;
  disposed = false;

  // Absorption bookkeeping
  private absorbed!: Uint8Array;          // 0 = free, 1 = absorbed (white/center)
  private homePos!: Float32Array;         // original "shell" position per particle
  private baseColor!: Float32Array;       // base colored color per particle
  private sizes!: Float32Array;           // per-particle render size
  private alphas!: Float32Array;          // per-particle render alpha
  private projVec = new THREE.Vector3();

  private onMouse = (e: MouseEvent) => {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  };
  private onResize = () => {
    if (!this.renderer) return;
    this.camera.aspect = this._aspect();
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  };

  constructor(container: HTMLElement) {
    this.container = container;
    this.isMobile = window.innerWidth < 768;
    this.isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
    this.N = this.isMobile ? 3500 : this.isTablet ? 5500 : 7500;
    this.BR = this.isMobile ? 115 : this.isTablet ? 145 : 168;
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();
    this.profile = "pedro";
    this.morphing = false;
    this.palettes = {
      pedro: new THREE.Color("#3b82f6"),
      laura: new THREE.Color("#ec4899"),
      leticia: new THREE.Color("#eab308"),
    };

    if (!this._checkWGL()) {
      this._fallback();
      return;
    }

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, this._aspect(), 0.1, 2000);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this._setup();
  }

  private _aspect() {
    return this.container.clientWidth / Math.max(this.container.clientHeight, 1);
  }
  private _checkWGL() {
    try {
      const c = document.createElement("canvas");
      return !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
    } catch {
      return false;
    }
  }
  private _fallback() {
    this.container.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center"><div style="width:180px;height:180px;border-radius:50%;border:1px solid rgba(59,130,246,.3);animation:pulseDot 2.4s ease infinite"></div></div>`;
  }
  private _setup() {
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);
    this.camera.position.z = this.isMobile ? 370 : 450;
    this._createParticles("pedro");
    window.addEventListener("mousemove", this.onMouse, { passive: true });
    window.addEventListener("resize", this.onResize, { passive: true });
    this._loop();
  }

  private _genPedro() {
    // Globo coeso e sólido: distribuição Fibonacci na superfície + leve preenchimento INTERNO,
    // jamais externo. Garante uma borda nítida e estável (sem partículas saltando para fora).
    const a = new Float32Array(this.N * 3),
      r = this.BR;
    for (let i = 0; i < this.N; i++) {
      const phi = Math.acos(-1 + (2 * i) / this.N);
      const theta = Math.sqrt(this.N * Math.PI) * phi;
      // 78% das partículas formam a casca firme; 22% preenchem o interior (densidade central).
      const isShell = i % 100 < 78;
      const rad = isShell
        ? r * (0.985 + Math.random() * 0.015) // casca: ±1.5% para coesão sem rigidez
        : r * (0.35 + Math.random() * 0.55);  // interior: protegido pela borda
      a[i * 3] = rad * Math.cos(theta) * Math.sin(phi);
      a[i * 3 + 1] = rad * Math.sin(theta) * Math.sin(phi);
      a[i * 3 + 2] = rad * Math.cos(phi);
    }
    return a;
  }
  private _genLaura() {
    const a = new Float32Array(this.N * 3),
      s = this.BR / 168;
    for (let i = 0; i < this.N; i++) {
      const r = 265 * s * Math.pow(Math.random(), 0.5);
      const th = Math.random() * Math.PI * 2;
      const ph = Math.random() * Math.PI * 2;
      a[i * 3] = r * Math.cos(th) * Math.sin(ph) + (Math.random() - 0.5) * 72 * s;
      a[i * 3 + 1] = (Math.random() - 0.5) * 345 * s;
      a[i * 3 + 2] = r * Math.sin(th) * Math.sin(ph) + (Math.random() - 0.5) * 36 * s;
    }
    return a;
  }
  private _genLeticia() {
    // Cubo perfeitamente alinhado: grade regular sem jitter — expertise = precisão.
    const a = new Float32Array(this.N * 3);
    const sz = Math.floor(Math.cbrt(this.N));
    const sp = this.isMobile ? 22 : 30;
    const off = ((sz - 1) * sp) / 2;
    const total = sz * sz * sz;
    for (let i = 0; i < this.N; i++) {
      const idx = i % total;
      const x = idx % sz;
      const y = Math.floor(idx / sz) % sz;
      const z = Math.floor(idx / (sz * sz));
      a[i * 3]     = x * sp - off;
      a[i * 3 + 1] = y * sp - off;
      a[i * 3 + 2] = z * sp - off;
    }
    return a;
  }

  private _gen(p: Profile) {
    return p === "pedro" ? this._genPedro() : p === "laura" ? this._genLaura() : this._genLeticia();
  }

  private _createParticles(profile: Profile) {
    if (this.points) {
      this.scene.remove(this.points);
      this.geo?.dispose();
      this.mat?.dispose();
    }
    const pos = this._gen(profile);
    const col = new Float32Array(this.N * 3);
    const sizes = new Float32Array(this.N);
    const alphas = new Float32Array(this.N);
    const base = this.palettes[profile];
    const baseSize = this.isMobile ? 2.1 : 2.7;
    for (let i = 0; i < this.N; i++) {
      const b = 0.55 + Math.random() * 0.45;
      col[i * 3] = base.r * b;
      col[i * 3 + 1] = base.g * b;
      col[i * 3 + 2] = base.b * b;
      sizes[i] = baseSize;
      alphas[i] = 0.92;
    }
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    this.geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    this.geo.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));

    this.mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute float aAlpha;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uPixelRatio;
        void main() {
          vColor = color;
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uPixelRatio * (300.0 / -mv.z);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          float core = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vColor, vAlpha * core);
        }
      `,
      vertexColors: true,
    });

    this.points = new THREE.Points(this.geo, this.mat);
    this.scene.add(this.points);
    this.profile = profile;

    // Bookkeeping arrays
    this.absorbed = new Uint8Array(this.N);
    this.homePos = new Float32Array(pos);
    this.baseColor = new Float32Array(col);
    this.sizes = sizes;
    this.alphas = alphas;
  }

  morphTo(profile: Profile) {
    if (!this.geo || profile === this.profile || this.morphing) return;
    this.morphing = true;
    const nextPos = this._gen(profile);
    const currPos = this.geo.attributes.position.array as Float32Array;
    const currCol = this.geo.attributes.color.array as Float32Array;
    const nextCol = this.palettes[profile];

    gsap.to(currPos as unknown as number[], {
      endArray: nextPos as unknown as number[],
      duration: 2.2,
      ease: "expo.inOut",
      onUpdate: () => {
        if (this.geo) this.geo.attributes.position.needsUpdate = true;
      },
      onComplete: () => {
        this.morphing = false;
        // Update home positions to new shape (absorbed particles keep their absorbed home = center)
        for (let i = 0; i < this.N; i++) {
          if (!this.absorbed[i]) {
            this.homePos[i * 3] = nextPos[i * 3];
            this.homePos[i * 3 + 1] = nextPos[i * 3 + 1];
            this.homePos[i * 3 + 2] = nextPos[i * 3 + 2];
          }
        }
      },
    });

    const geoRef = this.geo;
    const baseColRef = this.baseColor;
    const absorbedRef = this.absorbed;
    gsap.to(
      {},
      {
        duration: 1.8,
        ease: "power2.inOut",
        onUpdate: function (this: gsap.core.Tween) {
          const p = this.progress();
          for (let i = 0; i < currCol.length; i += 3) {
            const idx = i / 3;
            const b = 0.55 + Math.random() * 0.45;
            const tr = nextCol.r * b;
            const tg = nextCol.g * b;
            const tb = nextCol.b * b;
            // Update base color regardless (so future re-colorings know the palette)
            baseColRef[i] = THREE.MathUtils.lerp(baseColRef[i], tr, p * 0.08);
            baseColRef[i + 1] = THREE.MathUtils.lerp(baseColRef[i + 1], tg, p * 0.08);
            baseColRef[i + 2] = THREE.MathUtils.lerp(baseColRef[i + 2], tb, p * 0.08);
            // Only recolor non-absorbed ones; absorbed stay white
            if (!absorbedRef[idx]) {
              currCol[i] = baseColRef[i];
              currCol[i + 1] = baseColRef[i + 1];
              currCol[i + 2] = baseColRef[i + 2];
            }
          }
          if (geoRef) geoRef.attributes.color.needsUpdate = true;
        },
      }
    );

    this.profile = profile;
  }

  /**
   * Called by ChatStream when a message bubble reaches the absorption depth.
   * (sx, sy) is the screen point where the bubble visually disappears.
   * Returns true if a particle was successfully absorbed.
   */
  absorbAt(sx: number, sy: number): boolean {
    if (!this.geo || !this.points || this.disposed) return false;

    // Convert screen coords to NDC
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndcX = ((sx - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((sy - rect.top) / rect.height) * 2 + 1;

    const positions = this.geo.attributes.position.array as Float32Array;
    const colors = this.geo.attributes.color.array as Float32Array;

    // Find nearest non-absorbed particle in projected screen space
    let bestIdx = -1;
    let bestDist = Infinity;
    const matrix = new THREE.Matrix4().multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse,
    );
    // Apply current world transform of the points object
    const worldM = this.points.matrixWorld;
    const v = this.projVec;

    // Sample subset for performance
    const stride = Math.max(1, Math.floor(this.N / 1500));
    for (let i = 0; i < this.N; i += stride) {
      if (this.absorbed[i]) continue;
      v.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      v.applyMatrix4(worldM).applyMatrix4(matrix);
      // v is now NDC
      const dx = v.x - ndcX;
      const dy = v.y - ndcY;
      // Bias toward outer particles (further from origin in NDC)
      const radial = Math.sqrt(v.x * v.x + v.y * v.y);
      const d = dx * dx + dy * dy - radial * 0.05;
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    if (bestIdx < 0) return false;

    // Mark absorbed
    this.absorbed[bestIdx] = 1;

    const ci = bestIdx * 3;
    const fromX = positions[ci];
    const fromY = positions[ci + 1];
    const fromZ = positions[ci + 2];

    // Animate this particle: flare bright white, then drift to center & dim slightly
    const sizeRef = this.sizes;
    const alphaRef = this.alphas;
    const accent = this.palettes[this.profile];

    // Flash to accent color first, then to white
    gsap
      .timeline()
      .to(
        { r: colors[ci], g: colors[ci + 1], b: colors[ci + 2], s: sizeRef[bestIdx], a: alphaRef[bestIdx] },
        {
          r: accent.r * 1.4,
          g: accent.g * 1.4,
          b: accent.b * 1.4,
          s: (this.isMobile ? 1.9 : 2.4) * 3.4,
          a: 1.0,
          duration: 0.28,
          ease: "power2.out",
          onUpdate: function (this: gsap.core.Tween) {
            const t = this.targets()[0] as { r: number; g: number; b: number; s: number; a: number };
            colors[ci] = t.r;
            colors[ci + 1] = t.g;
            colors[ci + 2] = t.b;
            sizeRef[bestIdx] = t.s;
            alphaRef[bestIdx] = t.a;
          },
        },
      )
      .to(
        { r: accent.r * 1.4, g: accent.g * 1.4, b: accent.b * 1.4, s: (this.isMobile ? 1.9 : 2.4) * 3.4, a: 1.0 },
        {
          r: 1.0,
          g: 1.0,
          b: 1.0,
          s: (this.isMobile ? 1.9 : 2.4) * 1.55,
          a: 0.92,
          duration: 0.9,
          ease: "power2.inOut",
          onUpdate: function (this: gsap.core.Tween) {
            const t = this.targets()[0] as { r: number; g: number; b: number; s: number; a: number };
            colors[ci] = t.r;
            colors[ci + 1] = t.g;
            colors[ci + 2] = t.b;
            sizeRef[bestIdx] = t.s;
            alphaRef[bestIdx] = t.a;
          },
        },
        "-=0.05",
      );

    // Drift the absorbed particle toward field center (with mild randomization to form a growing core)
    const absorbedCount = this._absorbedCount();
    const coreR = 18 + Math.min(absorbedCount, 60) * 0.6; // core grows as more memories absorbed
    const angle1 = Math.random() * Math.PI * 2;
    const angle2 = Math.acos(2 * Math.random() - 1);
    const cr = Math.random() * coreR;
    const targetX = cr * Math.sin(angle2) * Math.cos(angle1);
    const targetY = cr * Math.sin(angle2) * Math.sin(angle1);
    const targetZ = cr * Math.cos(angle2);

    // Update home position so morphing/idle motion keeps it near center
    this.homePos[ci] = targetX;
    this.homePos[ci + 1] = targetY;
    this.homePos[ci + 2] = targetZ;

    gsap.to({ x: fromX, y: fromY, z: fromZ }, {
      x: targetX,
      y: targetY,
      z: targetZ,
      duration: 1.4,
      ease: "expo.inOut",
      onUpdate: function (this: gsap.core.Tween) {
        const t = this.targets()[0] as { x: number; y: number; z: number };
        positions[ci] = t.x;
        positions[ci + 1] = t.y;
        positions[ci + 2] = t.z;
      },
      onComplete: () => {
        if (this.geo) this.geo.attributes.position.needsUpdate = true;
      },
    });

    // PROMOTE: pick a free particle currently near the center and push it OUT
    // toward the empty shell slot, keeping the field organized.
    let promoteIdx = -1;
    let bestRSq = Infinity;
    for (let i = 0; i < this.N; i += stride) {
      if (this.absorbed[i] || i === bestIdx) continue;
      const px = positions[i * 3];
      const py = positions[i * 3 + 1];
      const pz = positions[i * 3 + 2];
      const r2 = px * px + py * py + pz * pz;
      if (r2 < bestRSq) {
        bestRSq = r2;
        promoteIdx = i;
      }
    }
    if (promoteIdx >= 0 && promoteIdx !== bestIdx) {
      const pi = promoteIdx * 3;
      const pFromX = positions[pi];
      const pFromY = positions[pi + 1];
      const pFromZ = positions[pi + 2];
      // The empty slot is the shell position previously held by bestIdx
      // Use original (pre-absorption) home as the shell anchor
      // (we updated homePos for bestIdx already, so reconstruct from fromX/Y/Z)
      this.homePos[pi] = fromX;
      this.homePos[pi + 1] = fromY;
      this.homePos[pi + 2] = fromZ;

      gsap.to({ x: pFromX, y: pFromY, z: pFromZ }, {
        x: fromX,
        y: fromY,
        z: fromZ,
        duration: 1.6,
        ease: "expo.inOut",
        onUpdate: function (this: gsap.core.Tween) {
          const t = this.targets()[0] as { x: number; y: number; z: number };
          positions[pi] = t.x;
          positions[pi + 1] = t.y;
          positions[pi + 2] = t.z;
        },
      });
    }

    return true;
  }

  private _absorbedCount(): number {
    let c = 0;
    for (let i = 0; i < this.N; i++) if (this.absorbed[i]) c++;
    return c;
  }

  private _loop = () => {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this._loop);
    if (!this.points || !this.geo) return;
    const t = this.clock.getElapsedTime();
    this.points.rotation.y += 0.00075 + this.mouse.x * 0.00045;
    this.points.rotation.x += 0.00018 + this.mouse.y * 0.00028;
    const breathe = 1 + Math.sin(t * 0.75) * 0.013;
    this.points.scale.setScalar(breathe);
    // Push attribute updates each frame (cheap; flagged dirty by absorbAt animations)
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
    (this.geo.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
    (this.geo.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener("mousemove", this.onMouse);
    window.removeEventListener("resize", this.onResize);
    this.geo?.dispose();
    this.mat?.dispose();
    this.renderer?.dispose();
    if (this.renderer?.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
