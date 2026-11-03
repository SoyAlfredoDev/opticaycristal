"use client";
import { useLinkStatus } from "next/link";
import { LoaderCircle } from "lucide-react";
import styles from "./CustomerLoading.module.css";

/** Follow the router's actual transition, including cancellation by a newer click. */
export function CustomerNavigationHint() {
  const { pending } = useLinkStatus();
  return <span aria-hidden="true" className={`${styles.navigationHint} ${pending ? styles.pending : ""}`}>
    <LoaderCircle size={15} className={styles.spinner} />
  </span>;
}
