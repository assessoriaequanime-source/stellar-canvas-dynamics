import * as THREE from "three";
import { gsap } from "gsap";

export type Profile = "pedro" | "laura" | "leticia";

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
  mat?: THREE.PointsMaterial;
  points?: THREE.Points;
  rafId = 0;
  disposed = false;

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
    const a = new Float32Array(this.N * 3),
      r = this.BR;
    for (let i = 0; i < this.N; i++) {
      const phi = Math.acos(-1 + (2 * i) / this.N);
      const theta = Math.sqrt(this.N * Math.PI) * phi;
      const rad = r + Math.random() * r * 0.12;
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
    const a = new Float32Array(this.N * 3);
    const sz = Math.floor(Math.cbrt(this.N));
    const sp = this.isMobile ? 22 : 30;
    const off = (sz * sp) / 2;
    for (let i = 0; i < this.N; i++) {
      a[i * 3] = (i % sz) * sp - off + (Math.random() - 0.5) * 4;
      a[i * 3 + 1] = (Math.floor(i / sz) % sz) * sp - off + (Math.random() - 0.5) * 4;
      a[i * 3 + 2] = Math.floor(i / (sz * sz)) * sp - off + (Math.random() - 0.5) * 4;
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
    const base = this.palettes[profile];
    for (let i = 0; i < this.N; i++) {
      const b = 0.55 + Math.random() * 0.45;
      col[i * 3] = base.r * b;
      col[i * 3 + 1] = base.g * b;
      col[i * 3 + 2] = base.b * b;
    }
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    this.mat = new THREE.PointsMaterial({
      size: this.isMobile ? 1.9 : 2.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.scene.add(this.points);
    this.profile = profile;
  }

  morphTo(profile: Profile) {
    if (!this.geo || profile === this.profile || this.morphing) return;
    this.morphing = true;
    const nextPos = this._gen(profile);
    const currPos = this.geo.attributes.position.array as Float32Array;
    const currCol = this.geo.attributes.color.array as Float32Array;
    const nextCol = this.palettes[profile];

    gsap.to(currPos, {
      endArray: nextPos,
      duration: 2.2,
      ease: "expo.inOut",
      onUpdate: () => {
        if (this.geo) this.geo.attributes.position.needsUpdate = true;
      },
      onComplete: () => {
        this.morphing = false;
      },
    });

    const geoRef = this.geo;
    gsap.to(
      {},
      {
        duration: 1.8,
        ease: "power2.inOut",
        onUpdate: function () {
          // @ts-expect-error gsap this
          const p = this.progress();
          for (let i = 0; i < currCol.length; i += 3) {
            const b = 0.55 + Math.random() * 0.45;
            currCol[i] = THREE.MathUtils.lerp(currCol[i], nextCol.r * b, p * 0.08);
            currCol[i + 1] = THREE.MathUtils.lerp(currCol[i + 1], nextCol.g * b, p * 0.08);
            currCol[i + 2] = THREE.MathUtils.lerp(currCol[i + 2], nextCol.b * b, p * 0.08);
          }
          if (geoRef) geoRef.attributes.color.needsUpdate = true;
        },
      }
    );

    this.profile = profile;
  }

  private _loop = () => {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this._loop);
    if (!this.points) return;
    const t = this.clock.getElapsedTime();
    this.points.rotation.y += 0.00075 + this.mouse.x * 0.00045;
    this.points.rotation.x += 0.00018 + this.mouse.y * 0.00028;
    const breathe = 1 + Math.sin(t * 0.75) * 0.013;
    this.points.scale.setScalar(breathe);
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
