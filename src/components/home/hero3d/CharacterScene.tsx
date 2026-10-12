"use client";

import { Suspense, useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { gsap } from "gsap";
import { MathUtils, type Group } from "three";
import { Pause, Play } from "lucide-react";
import { type HeroCharacter } from "./characters";
import { useCharacterPlayback } from "./useCharacterPlayback";
import { PreparedPortrait } from "./PreparedPortrait";
import styles from "./Hero3D.module.css";

function Cast({ characters, active, reduced, target, onReady }: {
  characters: readonly HeroCharacter[]; active: number; reduced: boolean;
  target: RefObject<number>; onReady: () => void;
}) {
  const groups = useRef<(Group | null)[]>([]);
  const rig = useRef<Group>(null);
  const previous = useRef<number | null>(null);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => { onReady(); }, [onReady]);
  useEffect(() => {
    const incoming = groups.current[active];
    if (!incoming) return;
    const outgoing = previous.current === null ? null : groups.current[previous.current];
    groups.current.forEach((group, index) => {
      if (group) group.visible = index === active || group === outgoing;
    });
    previous.current = active;
    if (reduced) {
      if (outgoing && outgoing !== incoming) outgoing.visible = false;
      incoming.visible = true;
      incoming.position.set(0, 0, 0);
      incoming.rotation.set(0, 0, 0);
      incoming.scale.setScalar(1);
      invalidate();
      return;
    }
    const timeline = gsap.timeline({ onUpdate: invalidate });
    incoming.visible = false;
    if (outgoing && outgoing !== incoming) {
      timeline.to(outgoing.scale, { x: 0, y: 0, z: 0, duration: .32, ease: "power2.in" }, 0)
        .to(outgoing.rotation, { y: -.22, duration: .32 }, 0)
        .set(outgoing, { visible: false });
    }
    timeline.set(incoming, { visible: true })
      .fromTo(incoming.scale, { x: .86, y: .86, z: .86 }, { x: 1, y: 1, z: 1, duration: .85, ease: "power3.out" })
      .fromTo(incoming.position, { y: -.18 }, { y: 0, duration: .85, ease: "power3.out" }, "<")
      .fromTo(incoming.rotation, { y: .3 }, { y: 0, duration: .85, ease: "power3.out" }, "<");
    return () => { timeline.kill(); };
  }, [active, reduced, invalidate]);

  useFrame((_, delta) => {
    if (!rig.current) return;
    const next = reduced ? 0 : target.current;
    rig.current.rotation.y = MathUtils.damp(rig.current.rotation.y, next, 7, Math.min(delta, .05));
    if (Math.abs(rig.current.rotation.y - next) > .0001) invalidate();
  });

  return <group ref={rig}>
    {characters.map((character, index) => <group key={character.id}
      ref={(node) => { groups.current[index] = node; }} visible={index === active}>
      <PreparedPortrait url={character.model!} />
    </group>)}
  </group>;
}

export default function CharacterScene({ characters }: { characters: readonly HeroCharacter[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [economy, setEconomy] = useState(true);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const target = useRef(0);
  const invalidate = useRef<() => void>(() => {});
  const onReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const narrow = matchMedia("(max-width: 899px)");
    const update = () => {
      setReduced(motion.matches);
      setEconomy(narrow.matches || navigator.hardwareConcurrency <= 4);
    };
    update();
    motion.addEventListener("change", update);
    narrow.addEventListener("change", update);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .1 });
    if (host.current) observer.observe(host.current);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", update);
      narrow.removeEventListener("change", update);
    };
  }, []);

  const advance = useCallback(() => setActive((index) => (index + 1) % characters.length), [characters.length]);
  useCharacterPlayback(ready && !paused && !reduced && visible, advance);

  const resetRotation = () => { target.current = 0; invalidate.current(); };

  return <div ref={host} className={styles.canvas}>
    <div className={styles.canvas} role="img" aria-label={`${characters[active].label} con lentes ópticos, modelo tridimensional`}
      onPointerDown={(event) => { if (event.pointerType !== "mouse") setPaused(true); }}
      onPointerMove={(event) => {
        if (reduced || (event.pointerType !== "mouse" && !event.buttons)) return;
        const box = event.currentTarget.getBoundingClientRect();
        target.current = MathUtils.clamp(((event.clientX - box.left) / box.width - .5) * .44, -.22, .22);
        invalidate.current();
      }} onPointerLeave={resetRotation} onPointerUp={resetRotation} onPointerCancel={resetRotation}>
      <Canvas camera={{ position: [0, .03, 3.8], fov: 35 }} dpr={economy ? 1 : [1, 1.5]}
        frameloop={visible ? "demand" : "never"} gl={{ antialias: economy, powerPreference: "low-power" }}
        onCreated={({ invalidate: redraw }) => { invalidate.current = redraw; }}
        fallback={<div className={styles.loading}>Tu mirada, nuestra prioridad.</div>}>
        <color attach="background" args={["#efe4d9"]} />
        <mesh position={[0, -.94, 0]}>
          <cylinderGeometry args={[.54, .57, .24, 64]} />
          <meshStandardMaterial color="#e9d8c8" roughness={.6} metalness={.08} />
        </mesh>
        <mesh position={[0, -1.075, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[200, 200]} />
          <meshBasicMaterial color="#efe4d9" />
        </mesh>
        {!economy && <ContactShadows key={active} position={[0, -1.06, 0]} opacity={.22} scale={4} blur={2.5} far={3} resolution={256} frames={2} />}
        <ambientLight intensity={.7} />
        <directionalLight position={[3, 4, 5]} intensity={2.2} color="#fff5ea" />
        <directionalLight position={[-3, 1, -2]} intensity={1.5} color="#e9d8c8" />
        <Environment resolution={128} frames={1}>
          <Lightformer position={[0, 3, 2]} scale={[5, 3, 1]} intensity={2} color="#fff5ea" />
          <Lightformer position={[-3, 1, 2]} rotation={[0, Math.PI / 4, 0]} scale={[2, 5, 1]} intensity={2} />
        </Environment>
        <Suspense fallback={null}>
          <Cast characters={characters} active={active} reduced={reduced} target={target} onReady={onReady} />
        </Suspense>
        <PerformanceMonitor onDecline={() => setEconomy(true)} />
        {!economy && <EffectComposer multisampling={2}>
          <Bloom intensity={.12} luminanceThreshold={1.2} mipmapBlur />
          <Vignette offset={.25} darkness={.12} />
        </EffectComposer>}
      </Canvas>
    </div>
    {!ready && <div className={styles.loading} role="status">Preparando los personajes…</div>}
    <div className={styles.controls} role="group" aria-label="Personajes de la experiencia 3D">
      {characters.map((character, index) => <button key={character.id} type="button" disabled={!ready}
        aria-pressed={active === index} onClick={() => { setPaused(true); setActive(index); }}>{character.label}</button>)}
      {!reduced && <button type="button" disabled={!ready} onClick={() => setPaused((value) => !value)}
        aria-label={paused ? "Reanudar personajes" : "Pausar personajes"}>
        {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
      </button>}
    </div>
  </div>;
}
