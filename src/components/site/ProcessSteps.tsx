import styles from "./Views.module.css";
export type ProcessStep = Readonly<{ title: string; description: string }>;
export function ProcessSteps({ steps, vertical = false }: { steps: readonly ProcessStep[]; vertical?: boolean }) {
  return <ol className={`${styles.steps} ${vertical ? styles.verticalSteps : ""}`}>
    {steps.map((step, index) => <li key={step.title}><span className={styles.stepNumber} aria-hidden="true">{index + 1}</span>
      <div><h3>{step.title}</h3><p>{step.description}</p></div></li>)}
  </ol>;
}
