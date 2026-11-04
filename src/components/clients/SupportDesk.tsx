"use client";
import {CrisTicketReceipt} from "./CrisTicketReceipt";
import {useAdminMemory} from "@/components/admin/AdminMemory";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { TicketDetail, TicketList, TicketSummary } from "@/lib/clients/support-types";
import { ticketLabels } from "@/lib/clients/support-types";
import ui from "./ClientSpace.module.css";
import styles from "./SupportDesk.module.css";
class RequestError extends Error { constructor(message:string,public status:number){super(message);} }
async function api<T>(url:string,init:RequestInit={}):Promise<T>{
  const response=await fetch(url,{...init,cache:"no-store",...(init.body?{headers:{"Content-Type":"application/json"}}:{})});
  const result=await response.json().catch(()=>null);
  if(!response.ok)throw new RequestError(result?.error||"No pudimos completar la solicitud. Inténtalo nuevamente.",response.status);
  return result as T;
}
const date=(value:string)=>new Intl.DateTimeFormat("es-CL",{timeZone:"America/Santiago",dateStyle:"short",timeStyle:"short"}).format(new Date(value));
export function SupportDesk({admin=false,initialTicketId=""}:{admin?:boolean;initialTicketId?:string}){
  const base=admin?"/api/admin/clientes/soporte":"/api/clientes/soporte";
  const memory=useAdminMemory(),remember=admin?memory?.rememberSupport:undefined;
  const [tickets,setTickets]=useState<TicketSummary[]>([]),[status,setStatus]=useState(admin?(memory?.support.status??"abierto"):"todos"),[query,setQuery]=useState(admin?(memory?.support.query??""):""),[offset,setOffset]=useState(0),[hasMore,setHasMore]=useState(false),[refresh,setRefresh]=useState(0);
  const [selectedId,setSelectedId]=useState(initialTicketId||(admin?memory?.support.selectedId:"")||""),[selected,setSelected]=useState<TicketDetail|null>(null),[loading,setLoading]=useState(true),[loadingThread,setLoadingThread]=useState(Boolean(initialTicketId||(admin?memory?.support.selectedId:null))),[threadRefresh,setThreadRefresh]=useState(0);
  const [creating,setCreating]=useState(false),[subject,setSubject]=useState(""),[message,setMessage]=useState(""),[reply,setReply]=useState("");
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[login,setLogin]=useState(false);
  const createKey=useRef(""),replyKey=useRef(""),resolveKey=useRef(""),inFlight=useRef(false);
  const formRef=useRef<HTMLInputElement>(null),threadRef=useRef<HTMLHeadingElement>(null),threadPanelRef=useRef<HTMLElement>(null);
  useEffect(()=>{remember?.({status,query,selectedId:selectedId||null});},[status,query,selectedId,remember]);
  function showError(value:unknown){if(value instanceof RequestError&&value.status===401)setLogin(true);setError(value instanceof Error?value.message:"No pudimos conectar. Inténtalo nuevamente.");}
  useEffect(()=>{
    const controller=new AbortController();
    const params=new URLSearchParams({status,q:query,offset:String(offset)});
    api<TicketList>(`${base}?${params}`,{signal:controller.signal}).then(result=>{setTickets(old=>offset?[...new Map([...old,...result.tickets].map(t=>[t.id,t])).values()]:result.tickets);setHasMore(result.hasMore);setLoading(false);}).catch(error=>{if(controller.signal.aborted)return;showError(error);setLoading(false);});
    return()=>controller.abort();
  },[base,status,query,offset,refresh]);
  useEffect(()=>{
    if(!selectedId)return;
    const controller=new AbortController();
    api<{ticket:TicketDetail}>(`${base}/${selectedId}`,{signal:controller.signal}).then(result=>{setSelected(result.ticket);setLoadingThread(false);}).catch(error=>{if(controller.signal.aborted)return;showError(error);setLoadingThread(false);});
    return()=>controller.abort();
  },[base,selectedId,threadRefresh]);
  useEffect(()=>{threadRef.current?.focus({preventScroll:true});if(window.matchMedia("(max-width: 999px)").matches)threadPanelRef.current?.scrollIntoView?.({block:"start"});},[selected?.id]);
  useEffect(()=>{if(creating)formRef.current?.focus();},[creating]);
  function reload(){setLoading(true);setOffset(0);setRefresh(value=>value+1);}
  function selectTicket(id:string){if(id===selectedId)return;setSelected(null);setLoadingThread(true);setReply("");replyKey.current="";resolveKey.current="";setSelectedId(id);}
  function begin(){setCreating(true);setNotice("");setError("");}
  async function create(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(inFlight.current)return;inFlight.current=true;setBusy(true);setError("");setNotice("");createKey.current ||= crypto.randomUUID();
    try{const result=await api<{ticket:TicketDetail}>(base,{method:"POST",body:JSON.stringify({subject,message,requestKey:createKey.current})});setCreating(false);setSubject("");setMessage("");createKey.current="";selectTicket(result.ticket.id);setNotice(`Ticket ${result.ticket.folio} creado.`);reload();}catch(error){showError(error);}finally{inFlight.current=false;setBusy(false);}
  }
  async function update(action:"reply"|"resolve",event?:FormEvent<HTMLFormElement>){
    event?.preventDefault();if(inFlight.current||!selected)return;inFlight.current=true;setBusy(true);setError("");setNotice("");
    const key=action==="reply"?replyKey:resolveKey;key.current ||= crypto.randomUUID();
    try{const result=await api<{ticket:TicketDetail}>(`${base}/${selected.id}`,{method:"POST",body:JSON.stringify({action,message:reply,lastMessageId:selected.messages.at(-1)?.id,requestKey:key.current})});setSelected(result.ticket);setReply("");key.current="";setNotice(action==="reply"?"Mensaje enviado.":"Ticket resuelto.");reload();}catch(error){showError(error);if(error instanceof RequestError&&error.status===409){resolveKey.current="";}}finally{inFlight.current=false;setBusy(false);}
  }
  function search(event:FormEvent<HTMLFormElement>){event.preventDefault();const data=new FormData(event.currentTarget);setLoading(true);setOffset(0);setQuery(String(data.get("search")||"").trim());setRefresh(value=>value+1);}
  return <div className={styles.desk}>
    <div className={styles.toolbar}>
      {!admin&&!creating&&<button type="button" className={`${ui.button} ${ui.primary}`} onClick={begin} disabled={busy}>Nuevo ticket</button>}
      <label className={ui.field}><span>Estado</span><select className={ui.input} value={status} disabled={busy} onChange={event=>{setLoading(true);setTickets([]);setError("");setOffset(0);setStatus(event.target.value);}}><option value="todos">Todos</option><option value="abierto">Pendientes</option><option value="respondido">Respondidos</option><option value="resuelto">Resueltos</option></select></label>
      {admin&&<form className={styles.adminSearch} onSubmit={search}><label className={ui.field}><span>Buscar tickets</span><input className={ui.input} name="search" defaultValue={query} maxLength={100} placeholder="Folio, nombre o correo"/></label><button className={ui.button} disabled={busy}>Buscar</button></form>}
      <button type="button" className={ui.button} disabled={loading||busy} onClick={()=>{setError("");reload();if(selectedId){setLoadingThread(true);setThreadRefresh(value=>value+1);resolveKey.current="";}}}>Actualizar</button>
    </div>
    {error&&<p role="alert" className={ui.error}>{error}</p>}{login&&<Link href={admin?"/admin/login":"/mi-cuenta/ingresar"} className={ui.textLink}>Volver a ingresar</Link>}
    {notice&&<p role="status" className={styles.notice}>{notice}</p>}
    {creating&&<section className={`${ui.panel} ${styles.formPanel}`}><h2>Nuevo ticket</h2><form className={styles.form} aria-label="Nuevo ticket" onSubmit={create}>
      <label className={ui.field}><span>Asunto</span><input ref={formRef} className={ui.input} value={subject} onChange={e=>{setSubject(e.target.value);createKey.current="";}} required maxLength={100} disabled={busy}/></label>
      <label className={ui.field}><span>¿En qué podemos ayudarte?</span><textarea className={ui.input} value={message} onChange={e=>{setMessage(e.target.value);createKey.current="";}} required maxLength={2000} disabled={busy}/></label>
      <div className={styles.formActions}><button className={`${ui.button} ${ui.primary}`} disabled={busy}>{busy?"Enviando…":"Enviar ticket"}</button><button type="button" className={ui.button} disabled={busy} onClick={()=>setCreating(false)}>Cancelar</button></div>
    </form></section>}
    <div className={styles.layout}>
      <section className={ui.panel} aria-label="Lista de tickets"><div className={styles.listHead}><h2>{admin?"Tickets de clientes":"Mis tickets"}</h2><span className={ui.small}>{tickets.length}</span></div>
        {loading&&<p role="status" className={styles.empty}>Cargando tickets…</p>}
        {!loading&&tickets.length===0&&<p className={styles.empty}>{admin?"No hay tickets en esta vista.":"Aún no tienes tickets. Si necesitas ayuda, crea una solicitud."}</p>}
        <div className={styles.list}>{tickets.map(ticket=><button type="button" className={styles.ticket} key={ticket.id} aria-pressed={selectedId===ticket.id} disabled={busy} onClick={()=>{selectTicket(ticket.id);setError("");setNotice("");}}>
          <span className={styles.meta}><span>{ticket.folio}</span><span className={styles.badge} data-status={ticket.status}>{ticketLabels[ticket.status]}</span></span><strong>{ticket.subject}</strong>{ticket.customer&&<p>{ticket.customer.name}</p>}<span className={styles.meta}>{date(ticket.updatedAt)}</span>
        </button>)}</div>
        {hasMore&&<button className={`${ui.button} ${ui.section}`} type="button" disabled={loading||busy} onClick={()=>{setLoading(true);setOffset(value=>value+50);}}>Ver más tickets</button>}
      </section>
      <section ref={threadPanelRef} className={`${ui.panel} ${styles.thread}`} aria-label="Conversación del ticket">
        {loadingThread?<p role="status">Cargando conversación…</p>:!selected?<p className={styles.empty}>Selecciona un ticket para ver la conversación.</p>:<>
          <div className={styles.meta}><strong>{selected.folio}</strong><span className={styles.badge} data-status={selected.status}>{ticketLabels[selected.status]}</span></div>
          <h2 ref={threadRef} tabIndex={-1}>{selected.subject}</h2>
          {selected.customer&&<p className={styles.customer}><Link className={ui.textLink} href={`/admin/clientes/${encodeURIComponent(selected.customer.id)}`}>{selected.customer.name}</Link><br/>{selected.customer.email}</p>}
          {admin&&selected.notification&&<p className={ui.small} role="status">Aviso {selected.notification.kind==="staff_reply"?"al cliente":"al equipo"}: {({pending:"pendiente de envío",processing:"enviando",sent:"enviado",failed:"sin confirmar; requiere revisión",unverified:"correo sin verificar; la respuesta está disponible en el portal"})[selected.notification.state]}.</p>}
          {admin&&<CrisTicketReceipt ticketId={selected.id} ticketStatus={selected.status}/>}
          <div className={styles.messages}>{selected.messages.map(item=><article className={styles.message} data-role={item.role} key={item.id}><div className={styles.meta}><strong>{item.role==="admin"?"Equipo Óptica & Cristal":admin?"Cliente":"Tú"}</strong><time dateTime={item.createdAt}>{date(item.createdAt)}</time></div><p>{item.body}</p></article>)}</div>
          {selected.status==="resuelto"&&<p className={ui.small}>Si respondes, el ticket se reabrirá.</p>}
          <form className={styles.form} aria-label="Responder ticket" onSubmit={event=>update("reply",event)}><label className={ui.field}><span>{admin?"Respuesta al cliente":"Tu respuesta"}</span><textarea className={ui.input} value={reply} onChange={e=>{setReply(e.target.value);replyKey.current="";}} maxLength={2000} required disabled={busy}/></label><div className={styles.formActions}><button className={`${ui.button} ${ui.primary}`} disabled={busy}>{busy?"Guardando…":"Enviar respuesta"}</button>{selected.status!=="resuelto"&&<button type="button" className={ui.button} disabled={busy} onClick={()=>update("resolve")}>Marcar resuelto</button>}</div></form>
        </>}
      </section>
    </div>
  </div>;
}
