import { ChevronDown } from "lucide-react";
import { CUSTOMER_CREDIT_FAQ } from "@/lib/clients/customer-help";
import styles from "./CustomerCreditFaq.module.css";
export function CustomerCreditFaq(){return <section className={styles.faq} aria-labelledby="customer-credit-faq-title"><h2 id="customer-credit-faq-title">Preguntas frecuentes</h2>{CUSTOMER_CREDIT_FAQ.map(item=><details key={item.id}><summary>{item.question}<ChevronDown size={18} aria-hidden="true"/></summary><p>{item.answer}</p></details>)}</section>;}
