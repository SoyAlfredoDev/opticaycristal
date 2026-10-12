"use client";

import dynamic from "next/dynamic";
import { Component, type ReactNode } from "react";
import { availableCharacters } from "./characters";
import styles from "./Hero3D.module.css";

const CharacterScene = dynamic(() => import("./CharacterScene"), {
  ssr: false,
  loading: () => <div className={styles.loading} role="status">Preparando la experiencia…</div>,
});

function Editorial() {
  return <div className={styles.editorial}>
    <p>Tu mirada,<br />nuestra prioridad.</p>
    <span>Óptica &amp; Cristal</span>
  </div>;
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <Editorial /> : this.props.children; }
}

export function HeroExperience() {
  return <div className={styles.stage}>
    {availableCharacters.length > 0
      ? <SceneBoundary><CharacterScene characters={availableCharacters} /></SceneBoundary>
      : <Editorial />}
  </div>;
}
