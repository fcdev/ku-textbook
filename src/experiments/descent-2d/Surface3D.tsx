"use client";
/**
 * 损失曲面的 3D 视图（three.js，只有这个实验懒加载，其他页面不下载）。
 * 风格跟着坐标纸走：浅色曲面 + 墨线网格，小球是荧光笔黄，轨迹是墨线。
 * 按需渲染：只有拖动视角、参数变化或小球动画时才画，不跑常驻循环。
 */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { SURFACES } from "./model";

const SIZE = 6, HEIGHT = 2.4, N = 72;

interface Props { surface: number; pts: [number, number][]; showTrail: boolean; still: boolean; onPick?: (x: number, y: number) => void; label: string }

function cssColor(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return new THREE.Color(v || fallback);
}

export default function Surface3D({ surface, pts, showTrail, still, onPick, label }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{
    render: () => void;
    setSurface: (i: number) => void;
    setPath: (p: [number, number][], animate: boolean) => void;
    setTrail: (v: boolean) => void;
    setStill: (v: boolean) => void;
  } | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(4.2, 7.4, 5.6);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.4, 0);
    controls.enablePan = false;
    controls.minDistance = 5;
    controls.maxDistance = 18;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.update();

    scene.add(new THREE.HemisphereLight(0xffffff, 0x888877, 2.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(4, 10, 6);
    scene.add(sun);

    const surfMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    const gridMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.35 });
    const pathMat = new THREE.LineBasicMaterial({ linewidth: 2 });
    const dotMat = new THREE.MeshLambertMaterial();
    const ballMat = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.05 });
    const minMat = new THREE.MeshBasicMaterial({ depthTest: false });

    let mesh: THREE.Mesh | null = null, grid: THREE.LineSegments | null = null;
    const minGroup = new THREE.Group();
    scene.add(minGroup);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.24, 32, 16), ballMat);
    // 小球永远画在最上层，落进谷底也看得见
    ballMat.depthTest = false;
    ball.renderOrder = 10;
    scene.add(ball);
    const pathGeo = new THREE.BufferGeometry();
    const pathLine = new THREE.Line(pathGeo, pathMat);
    pathMat.depthTest = false;
    pathLine.renderOrder = 5;
    scene.add(pathLine);
    const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.065, 10, 6), dotMat, 130);
    dotMat.depthTest = false;
    dots.renderOrder = 6;
    dots.count = 0;
    scene.add(dots);

    let cur = SURFACES[0], hmax = 1, stillMode = false;
    const toWorld = (x: number, y: number, lift = 0) => {
      const [x0, x1, y0, y1] = cur.box;
      const cx = Math.max(x0, Math.min(x1, x)), cy = Math.max(y0, Math.min(y1, y));
      const h = Math.log1p(Math.max(0, cur.loss(cx, cy))) / hmax * HEIGHT;
      return new THREE.Vector3(((cx - x0) / (x1 - x0) - 0.5) * SIZE, h + lift, -((cy - y0) / (y1 - y0) - 0.5) * SIZE);
    };

    let colors = { low: new THREE.Color(), mid: new THREE.Color(), high: new THREE.Color(), ink: new THREE.Color() };
    const readTheme = () => {
      colors = {
        low: cssColor("--color-surface", "#ffffff"),
        mid: cssColor("--color-accent-soft", "#FBEDB8"),
        high: cssColor("--color-test", "#D9530F"),
        ink: cssColor("--color-ink", "#17181C"),
      };
      gridMat.color.copy(colors.ink);
      pathMat.color.copy(colors.ink);
      dotMat.color.copy(colors.ink);
      ballMat.color.copy(cssColor("--color-accent", "#F4C430"));
      minMat.color.copy(cssColor("--color-good", "#1A7F37"));
    };

    const buildSurface = (i: number) => {
      cur = SURFACES[i] ?? SURFACES[0];
      const [x0, x1, y0, y1] = cur.box;
      hmax = 0;
      for (let j = 0; j <= N; j++) for (let k = 0; k <= N; k++) hmax = Math.max(hmax, Math.log1p(cur.loss(x0 + ((x1 - x0) * k) / N, y0 + ((y1 - y0) * j) / N)));
      const geo = new THREE.PlaneGeometry(SIZE, SIZE, N, N);
      geo.rotateX(-Math.PI / 2);
      const pos = geo.attributes.position as THREE.BufferAttribute;
      const col = new Float32Array(pos.count * 3);
      const c = new THREE.Color();
      for (let v = 0; v < pos.count; v++) {
        const wx = pos.getX(v), wz = pos.getZ(v);
        const x = x0 + (wx / SIZE + 0.5) * (x1 - x0), y = y0 + (-wz / SIZE + 0.5) * (y1 - y0);
        const t = Math.log1p(cur.loss(x, y)) / hmax;
        pos.setY(v, t * HEIGHT);
        if (t < 0.5) c.copy(colors.low).lerp(colors.mid, t * 2);
        else c.copy(colors.mid).lerp(colors.high, (t - 0.5) * 1.6);
        col.set([c.r, c.g, c.b], v * 3);
      }
      geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      geo.computeVertexNormals();
      if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); }
      mesh = new THREE.Mesh(geo, surfMat);
      scene.add(mesh);

      // 墨线网格：每隔 6 格一条，像坐标纸
      const seg: number[] = [];
      const step = 6;
      for (let a = 0; a <= N; a += step) {
        for (let b = 0; b < N; b++) {
          const p = (r: number, q: number) => { const i0 = r * (N + 1) + q; return [pos.getX(i0), pos.getY(i0) + 0.004, pos.getZ(i0)]; };
          seg.push(...p(a, b), ...p(a, b + 1), ...p(b, a), ...p(b + 1, a));
        }
      }
      if (grid) { scene.remove(grid); grid.geometry.dispose(); }
      const gg = new THREE.BufferGeometry();
      gg.setAttribute("position", new THREE.Float32BufferAttribute(seg, 3));
      grid = new THREE.LineSegments(gg, gridMat);
      scene.add(grid);

      minGroup.clear();
      for (const [mx, my] of cur.minima) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 32), minMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.copy(toWorld(mx, my, 0.07));
        ring.renderOrder = 4;
        minGroup.add(ring);
      }
    };

    let pathPts: [number, number][] = [];
    let showTrail = true;
    let anim = 0;
    const placePath = (upto: number, frac: number) => {
      const visible = pathPts.slice(0, upto + 1).map(([x, y]) => toWorld(x, y, 0.05));
      const a = pathPts[upto], b = pathPts[Math.min(upto + 1, pathPts.length - 1)];
      const bx = a[0] + (b[0] - a[0]) * frac, by = a[1] + (b[1] - a[1]) * frac;
      const bp = toWorld(bx, by, 0.24);
      if (frac > 0) visible.push(toWorld(bx, by, 0.05));
      pathGeo.setFromPoints(visible);
      pathLine.visible = showTrail;
      const m = new THREE.Matrix4();
      dots.count = showTrail ? Math.min(upto + 1, 130) : 0;
      for (let i = 0; i < dots.count; i++) dots.setMatrixAt(i, m.makeTranslation(toWorld(pathPts[i][0], pathPts[i][1], 0.05)));
      dots.instanceMatrix.needsUpdate = true;
      ball.position.copy(bp);
      const [x0, x1, y0, y1] = cur.box;
      ball.visible = bx >= x0 && bx <= x1 && by >= y0 && by <= y1;
    };

    const render = () => renderer.render(scene, camera);
    controls.addEventListener("change", render);

    const resize = () => {
      const w = el.clientWidth, h = Math.round(w * 0.62);
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      render();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    // 点一下曲面（不是拖动）就把起点放到那里
    const ray = new THREE.Raycaster();
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY }; };
    const onUp = (e: PointerEvent) => {
      if (!down || !mesh || !pickRef.current) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 5) return;
      const r = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
      const hit = ray.intersectObject(mesh)[0];
      if (!hit) return;
      const [x0, x1, y0, y1] = cur.box;
      pickRef.current(x0 + (hit.point.x / SIZE + 0.5) * (x1 - x0), y0 + (-hit.point.z / SIZE + 0.5) * (y1 - y0));
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);

    // 切换亮 / 暗主题时重新取色
    const retheme = () => { readTheme(); buildSurface(SURFACES.indexOf(cur)); placePath(pathPts.length - 1, 0); render(); };
    const themeObs = new MutationObserver(retheme);
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", retheme);

    readTheme();
    api.current = {
      render,
      setSurface: (i) => { buildSurface(i); },
      setTrail: (v) => { showTrail = v; },
      setStill: (v) => { stillMode = v; },
      setPath: (p, animate) => {
        cancelAnimationFrame(anim);
        const prevLen = pathPts.length;
        pathPts = p.length ? p : [[0, 0]];
        const last = pathPts.length - 1;
        // 只走了一步时做一个 220ms 的滚动动画；其他情况（重置、换参数、静止模式）直接画结果
        if (!animate || stillMode || last !== prevLen || last === 0) { placePath(last, 0); render(); return; }
        const t0 = performance.now();
        const tick = (now: number) => {
          const f = Math.min(1, (now - t0) / 220);
          const e = 1 - (1 - f) ** 3;
          placePath(last - 1, e);
          render();
          if (f < 1) anim = requestAnimationFrame(tick);
          else { placePath(last, 0); render(); }
        };
        anim = requestAnimationFrame(tick);
      },
    };
    return () => {
      cancelAnimationFrame(anim);
      ro.disconnect();
      themeObs.disconnect();
      mq.removeEventListener("change", retheme);
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); });
      renderer.dispose();
      el.removeChild(renderer.domElement);
      api.current = null;
    };
  }, []);

  useEffect(() => { api.current?.setStill(still); }, [still]);
  useEffect(() => { api.current?.setSurface(surface); api.current?.setPath(pts, false); }, [surface]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { api.current?.setTrail(showTrail); api.current?.setPath(pts, true); }, [pts, showTrail]);

  return <div ref={host} role="img" aria-label={label} className="w-full overflow-hidden rounded-lg" style={{ cursor: onPick ? "pointer" : "grab" }} />;
}
