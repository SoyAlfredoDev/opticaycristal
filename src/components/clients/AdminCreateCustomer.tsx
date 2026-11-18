"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { parseCustomerDocument, type DocumentFields } from "@/lib/clients/customer-document";
import { blankDocument, CustomerDocumentTypeFields } from "./CustomerDocumentFields";
import { salesAction } from "./sales-client";
import wizard from "./AdminSales.module.css";
import styles from "./ClientSpace.module.css";

type Saved = { customerId: string; created: boolean; invitationSent: boolean };
const fields = [
    ["firstName", "Nombre", "text", 80],
    ["lastName", "Apellido", "text", 80],
    ["email", "Correo electrónico", "email", 254],
    ["whatsapp", "WhatsApp", "tel", 24],
] as const;

export function AdminCreateCustomer({ initialDocument = blankDocument, requireEmailVerification = false, onCreated, onCancel }: {
    initialDocument?: DocumentFields;
    requireEmailVerification?: boolean;
    onCreated: (id: string, document: DocumentFields) => void | Promise<void>;
    onCancel: () => void;
}) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [saved, setSaved] = useState<Saved | null>(null);
    const [challenge, setChallenge] = useState("");
    const [document, setDocument] = useState(initialDocument);
    const [documentError, setDocumentError] = useState("");
    const [matchedId, setMatchedId] = useState<string | null>(null);
    const documentCheck = useRef(0);
    const lock = useRef(false);

    function changeDocument(value: DocumentFields) {
        documentCheck.current++;
        setDocument(value);
        setMatchedId(null);
        setDocumentError("");
        setError("");
        setChallenge("");
    }

    function validDocument() {
        try {
            parseCustomerDocument(document);
            setDocumentError("");
            return true;
        } catch (error) {
            setDocumentError((error as Error).message);
            return false;
        }
    }

    async function checkDocument() {
        if (lock.current || !document.documentNumber.trim() || !validDocument()) return;
        const check = ++documentCheck.current;
        try {
            const result = await salesAction({ action: "check-document", ...document });
            if (check === documentCheck.current) setMatchedId(result.customerId ?? null);
        } catch {
            // The server always verifies the document again before sending or saving.
        }
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (lock.current || matchedId || !validDocument()) return;
        const data = new FormData(event.currentTarget);
        const contact = {
            ...document,
            ...Object.fromEntries(fields.map(([name]) => [name, String(data.get(name) ?? "")])),
            privacyAccepted: data.get("privacyAccepted") === "on",
        };
        const resend = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "resend";
        const send = requireEmailVerification && (!challenge || resend);
        const body = requireEmailVerification
            ? send ? { ...contact, action: "send" }
                : { ...contact, action: "create", requestId: challenge, code: data.get("code") }
            : contact;

        lock.current = true;
        setBusy(true);
        setError("");
        try {
            const endpoint = requireEmailVerification ? "/api/admin/clientes/ventas/alta" : "/api/admin/clientes/crear";
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(20000),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "No pudimos guardar el cliente.");
            if (result.created === false) {
                setChallenge("");
                setMatchedId(result.customerId);
                return;
            }
            if (send) {
                setChallenge(result.requestId);
                return;
            }
            setSaved(result);
            await onCreated(result.customerId, document);
        } catch (error) {
            setError((error as Error).message);
        } finally {
            lock.current = false;
            setBusy(false);
        }
    }

    async function invite() {
        if (lock.current || !saved) return;
        lock.current = true;
        setBusy(true);
        setError("");
        try {
            const response = await fetch(`/api/admin/clientes/${encodeURIComponent(saved.customerId)}/invitacion`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: "{}",
                signal: AbortSignal.timeout(15000),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            setSaved({ ...saved, invitationSent: true });
        } catch (error) {
            setError((error as Error).message);
        } finally {
            lock.current = false;
            setBusy(false);
        }
    }

    return <section className={`${styles.panel} ${styles.section}`}>
        <h2>Crear cliente</h2>
        {saved ? <>
            <p role="status">Ficha guardada en categoría Start.</p>
            <p className={styles.small}>{saved.invitationSent ? "Enlace de acceso enviado." : "La ficha está guardada. No se pudo confirmar el envío del enlace."}</p>
            {!saved.invitationSent && <button className={styles.button} type="button" disabled={busy} onClick={() => void invite()}>Reenviar enlace de acceso</button>}
            {(!requireEmailVerification || error) && <Link className={styles.button} href={`/admin/clientes/${encodeURIComponent(saved.customerId)}`}>Ver ficha</Link>}
        </> : <form className={styles.form} onSubmit={submit} aria-label="Crear cliente">
            <p className={styles.small}>{requireEmailVerification
                ? "Verifica el correo para crear la ficha. Después podrás verificar el WhatsApp si el cliente lo desea."
                : "Los contactos pueden quedar pendientes. El cliente recibe un enlace para crear su contraseña."}</p>
            <CustomerDocumentTypeFields value={document} onChange={changeDocument} disabled={busy} />
            <label className={styles.field}>{document.documentType === "rut" ? "RUT" : "Número de documento"}
                <input className={styles.input} value={document.documentNumber} autoComplete="off"
                    maxLength={document.documentType === "rut" ? 20 : 32} required disabled={busy}
                    placeholder={document.documentType === "rut" ? "12.345.678-5" : undefined}
                    aria-invalid={!!documentError} aria-describedby={documentError ? "new-customer-document-error" : undefined}
                    onChange={event => changeDocument({ ...document, documentNumber: event.target.value })}
                    onBlur={() => void checkDocument()} />
            </label>
            {documentError && <p role="alert" id="new-customer-document-error" className={styles.error}>{documentError}</p>}
            {matchedId && <div className={wizard.documentMatch}>
                <p role="status">Este documento ya tiene una ficha registrada.</p>
                {requireEmailVerification
                    ? <button type="button" className={styles.button} disabled={busy} onClick={async () => {
                        if (lock.current) return;
                        lock.current = true;
                        setBusy(true);
                        setError("");
                        try { await onCreated(matchedId, document); onCancel(); }
                        catch (error) { setError((error as Error).message); }
                        finally { lock.current = false; setBusy(false); }
                    }}>Usar ficha existente</button>
                    : <Link className={styles.button} href={`/admin/clientes/${encodeURIComponent(matchedId)}`}>Ver ficha existente</Link>}
            </div>}
            <fieldset hidden={!!matchedId} disabled={!!matchedId} className={wizard.registrationFields}>
            {fields.map(([name, label, type, maxLength]) => <label className={styles.field} key={name}>{label}
                <input className={styles.input} name={name} type={type} maxLength={maxLength} required disabled={busy}
                    onChange={name === "email" ? () => { setChallenge(""); setError(""); } : undefined} />
            </label>)}
            <label><input type="checkbox" name="privacyAccepted" required disabled={busy} /> El cliente autorizó el registro de sus datos.</label>
            {challenge && <>
                <p role="status" className={styles.small}>Código enviado al correo. Vence en 10 minutos.</p>
                <label className={styles.field}>Código del correo
                    <input key={challenge} className={styles.input} name="code" inputMode="numeric" autoComplete="one-time-code"
                        maxLength={4} pattern="[0-9]{4}" required disabled={busy} />
                </label>
            </>}
            <div className={styles.actions}>
                <button className={`${styles.button} ${styles.primary}`} disabled={busy}>
                    {busy ? "Procesando…" : challenge ? "Validar correo y crear cliente" : requireEmailVerification ? "Enviar código al correo" : "Guardar cliente"}
                </button>
                {challenge && <button className={styles.button} type="submit" value="resend" formNoValidate disabled={busy}>Reenviar código al correo</button>}
            </div>
            </fieldset>
        </form>}
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <button type="button" className={styles.button} disabled={busy} onClick={onCancel}>{saved ? "Cerrar" : "Cancelar"}</button>
    </section>;
}
