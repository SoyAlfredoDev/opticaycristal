"use client";

import { useSyncExternalStore } from "react";
import styles from "./MonthlyNotice.module.css";

const monthFormat = new Intl.DateTimeFormat("es-CL", { month: "long", timeZone: "America/Santiago" });
function currentMonth() {
  return monthFormat.format(new Date());
}

function subscribeMonth(onChange: () => void) {
  const timer = window.setInterval(onChange, 60_000);
  document.addEventListener("visibilitychange", onChange);
  window.addEventListener("focus", onChange);
  return () => {
    clearInterval(timer);
    document.removeEventListener("visibilitychange", onChange);
    window.removeEventListener("focus", onChange);
  };
}

// A cached server page must never hard-code a month that can become stale.
const serverMonth = () => "";

export function MonthlyNotice() {
  const month = useSyncExternalStore(subscribeMonth, currentMonth, serverMonth);
  const message = `Este ${month || "mes"}, encuentra tu próxima mirada · Visítanos en Óptica & Cristal, Huérfanos 713, local 18.`;
  return <div className={styles.notice} role="note" aria-label="Novedades del mes">
    <p className={styles.srOnly}>{message}</p>
    <div className={styles.track} aria-hidden="true">
      {[0, 1].map(group => <div className={styles.group} key={group}>
        {[0, 1, 2, 3].map(copy => <span className={styles.unit} key={copy}>{message}<span className={styles.separator}>✦</span></span>)}
      </div>)}
    </div>
  </div>;
}
