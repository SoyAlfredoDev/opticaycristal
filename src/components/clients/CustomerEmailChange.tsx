"use client";

import { useRef, useState, type FormEvent } from "react";
import type { EditableCustomer } from "@/lib/clients/customer-edit";
import styles from "./ClientSpace.module.css";

export function CustomerEmailChange({ customerId, onSave, onCancel }: {
    customerId: string;
    onSave: (customer: EditableCustomer) => void;
    onCancel: () => void;
}) {
    const [email, setEmail] = useState("");
    const [requestId, setRequestId] = useState("");
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const lock = useRef(false);

    async function run(action: "send" | "confirm") {
        if (lock.current) return;
        lock.current = true;
        setBusy(true);
        setError("");
        try {
            const response = await fetch(`/api/admin/clientes/${encodeURIComponent(customerId)}/cambiar-correo`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(action === "send" ? { action, email } : { action, email, requestId, code }),
                signal: AbortSignal.timeout(15000),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "No pudimos completar el cambio.");
            if (action === "confirm") onSave(data.customer);
            else {
                setRequestId(data.requestId);
                setCode("");
            }
        } catch (error) {
            setError((error as Error).message);
        } finally {
            lock.current = false;
            setBusy(false);
        }
    }

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        void run(requestId ? "confirm" : "send");
    }

    return <form className={styles.form} aria-label="Cambiar correo de ingreso" onSubmit={submit}>
        <h3>Cambiar correo de ingreso</h3>
        <p className={styles.small}>El correo actual seguirá activo hasta verificar el nuevo.</p>
        <label className={styles.field}>Nuevo correo electrónico
            <input className={styles.input} type="email" value={email} maxLength={254} required disabled={busy}
                onChange={event => { setEmail(event.target.value); setRequestId(""); setCode(""); setError(""); }} />
        </label>
        {requestId && <>
            <p role="status" className={styles.small}>Código enviado. Vence en 10 minutos.</p>
            <label className={styles.field}>Código del nuevo correo
                <input className={styles.input} inputMode="numeric" autoComplete="one-time-code" value={code}
                    maxLength={4} pattern="[0-9]{4}" required disabled={busy}
                    onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 4))} />
            </label>
        </>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.actions}>
            <button className={`${styles.button} ${styles.primary}`} disabled={busy}>
                {busy ? "Procesando…" : requestId ? "Validar y cambiar correo" : "Enviar código al nuevo correo"}
            </button>
            {requestId && <button className={styles.button} type="button" disabled={busy} onClick={() => void run("send")}>Reenviar código</button>}
            <button type="button" className={styles.button} disabled={busy} onClick={onCancel}>Cancelar</button>
        </div>
    </form>;
}
