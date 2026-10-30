import { CircleCheck } from "lucide-react";
import styles from "./ClientSpace.module.css";
import benefits from "./AuthBenefits.module.css";
export function AuthBenefits(){
 return <section className={`${styles.welcome} ${benefits.welcome}`} aria-label="Crédito directo en Óptica y Cristal">
  <span className={styles.pill}>Tu óptica, más cerca</span>
  <h2>Tu óptica con <em>crédito directo</em> en Chile.</h2>
  <ul className={benefits.list}>{["No consultamos DICOM.","No pedimos liquidaciones de sueldo.","No cobramos intereses."].map(text=><li key={text}><CircleCheck size={21} aria-hidden="true"/><span>{text}</span></li>)}</ul>
  <p className={benefits.confidence}>Porque confiamos en nuestros clientes.</p>
  <p className={benefits.conditions}>Siempre con pie y según las condiciones de tu categoría.</p>
 </section>;
}
