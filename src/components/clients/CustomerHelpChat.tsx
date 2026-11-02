"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp, MessageCircle, X } from "lucide-react";
import { store, whatsappUrl } from "@/components/site/content";
import { CREDIT_REQUIREMENTS } from "@/lib/clients/customer-help";
import styles from "./ClientSpace.module.css";

type Topic = "requirements" | "credit" | "verification" | "purchases" | "contact";
type Message = { id: number; role: "assistant" | "user"; text: string; topic?: Topic };
const answers: Record<Topic, { label: string; text: string; href: string; action: string }> = {
  requirements: {label:"Requisitos del crédito",text:CREDIT_REQUIREMENTS,href:"/mi-cuenta/ayuda",action:"Ver requisitos y preguntas frecuentes"},
  credit: { label: "Mi cupo", text: "En Inicio puedes ver el cupo de tu nivel y el saldo utilizado. Para usar el crédito necesitas correo verificado. Pagando al día, el interés es 0 % y no consultamos DICOM. Solo los contratos nuevos pueden incluir mora simple de hasta 1,5 % mensual desde el día 61, sujeta al máximo legal y a tu compromiso; los anteriores conservan sus condiciones. El crédito respeta el cupo, porcentaje y cuotas de tu nivel. El precio de los lentes puede ser mayor: pagas la diferencia como pie.", href: "/mi-cuenta", action: "Ver mi crédito" },
  verification: { label: "Verificar mi correo", text: "Desde Perfil puedes solicitar el correo de verificación. Revisa también spam. Verificar el correo es obligatorio para usar tu crédito. La verificación de WhatsApp todavía no está implementada y no es obligatoria por ahora.", href: "/mi-cuenta/perfil", action: "Ir a mi perfil" },
  purchases: { label: "Compras y cuotas", text: "Consulta tus compras y el compromiso de pago en Compras, y tus pagos en Cuotas. Al registrar la venta en la óptica generamos el compromiso con el pie, crédito, cuotas mensuales y fechas para revisarlo y firmarlo contigo.", href: "/mi-cuenta/cuotas", action: "Ver mis cuotas" },
  contact: { label: "Hablar con la óptica", text: `Estamos en ${store.fullAddress}. Para consultas sobre una compra, corregir tus datos o presentar un reclamo, puedes contactar a nuestro equipo por WhatsApp. Abrir el enlace no envía ningún mensaje automáticamente.`, href: whatsappUrl("Hola, necesito ayuda con mi cuenta de cliente."), action: "Abrir WhatsApp" },
};

export function CustomerHelpChat() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ id: 0, role: "assistant", text: "¡Hola! Soy tu asistente de ayuda. Elige un tema o escribe tu consulta para ver una respuesta rápida." }]);
  const dialog = useRef<HTMLDialogElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const counter = useRef(0);

  useEffect(() => {
    const element = dialog.current;
    if (open && !element?.open) element?.showModal();
    if (!open && element?.open) element.close();
  }, [open]);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [messages, open]);

  function reply(topic: Topic | null, text: string) {
    const userId = ++counter.current, replyId = ++counter.current;
    setMessages(previous => [...previous, { id: userId, role: "user" as const, text }, {
      id: replyId, role: "assistant" as const,
      text: topic ? answers[topic].text : "Puedo orientarte sobre tu cupo, las verificaciones, tus compras y cómo contactar a la óptica. Para revisar un caso particular, nuestro equipo puede ayudarte por WhatsApp.",
      topic: topic || "contact",
    }].slice(-10));
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const normalized = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const topic: Topic | null = /requisit|que.*necesit|necesit.*credito|compromiso|firmar|firma|cedula|documento/.test(normalized) ? "requirements"
      : /verific|correo|email|activar|whatsapp.*(?:oblig|valid)|(?:oblig|valid).*whatsapp/.test(normalized) ? "verification"
      : /cupo|credito|financia|nivel|interes|mora|atraso|dicom/.test(normalized) ? "credit"
        : /cuota|compra|pago|comprobante/.test(normalized) ? "purchases"
          : /contact|direccion|horario|reclamo|whatsapp|persona|hablar/.test(normalized) ? "contact" : null;
    reply(topic, text);
    setDraft("");
  }

  return <>
    <button type="button" className={styles.helpFab} aria-label="Abrir chat de ayuda" aria-haspopup="dialog" aria-expanded={open} aria-controls="customer-help-chat" onClick={() => setOpen(true)}><MessageCircle size={24} aria-hidden="true" /><span>¿Te ayudamos?</span></button>
    <dialog id="customer-help-chat" ref={dialog} className={styles.helpDialog} aria-labelledby="customer-help-title" onClose={() => setOpen(false)} onCancel={() => setOpen(false)}>
      <header className={styles.chatHeader}><span className={styles.chatAvatar}><MessageCircle size={22} aria-hidden="true" /></span><div><h2 id="customer-help-title">Estamos para ayudarte</h2><p>Asistente virtual · respuestas rápidas</p></div><button type="button" className={styles.chatClose} aria-label="Cerrar chat de ayuda" onClick={() => setOpen(false)} autoFocus><X size={20} aria-hidden="true" /></button></header>
      <div ref={log} className={styles.chatLog} role="log" aria-label="Conversación de ayuda" aria-live="polite" aria-relevant="additions">
        {messages.map(message => <div key={message.id} className={`${styles.chatMessage} ${message.role === "user" ? styles.chatUser : styles.chatAssistant}`}><span className={styles.srOnly}>{message.role === "user" ? "Tú: " : "Asistente: "}</span><p>{message.text}</p>{message.topic && (message.topic === "contact" ? <a className={styles.textLink} href={answers.contact.href} target="_blank" rel="noopener noreferrer">{answers.contact.action}</a> : <Link className={styles.textLink} href={answers[message.topic].href} onClick={() => setOpen(false)}>{answers[message.topic].action}</Link>)}</div>)}
      </div>
      <div className={styles.chatTopics} aria-label="Temas de ayuda">{(Object.keys(answers) as Topic[]).map(topic => <button key={topic} type="button" onClick={() => reply(topic, answers[topic].label)}>{answers[topic].label}</button>)}</div>
      <form onSubmit={submit} className={styles.chatForm}><label className={styles.srOnly} htmlFor="customer-help-query">Escribe tu consulta</label><input id="customer-help-query" value={draft} onChange={event => setDraft(event.target.value)} placeholder="Escribe tu consulta…" maxLength={300} autoComplete="off" /><button type="submit" aria-label="Consultar al asistente" disabled={!draft.trim()}><ArrowUp size={20} aria-hidden="true" /></button></form>
      <p className={styles.chatPrivacy}>No escribas contraseñas ni datos bancarios. La conversación no se guarda.</p>
    </dialog>
  </>;
}
