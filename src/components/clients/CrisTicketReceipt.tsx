'use client';
import {useEffect,useState} from 'react';
export function CrisTicketReceipt({ticketId,ticketStatus}:{ticketId:string;ticketStatus:"abierto"|"respondido"|"resuelto"}){
 const [data,setData]=useState<{ticketId:string;receipt:{kind:string;state:string}|null;attachments:{id:string;mime:string;size:number;href:string}[]}|null>(null);
 useEffect(()=>{const controller=new AbortController();void fetch(`/api/admin/integraciones/cris/tickets/${ticketId}`,{signal:controller.signal,cache:'no-store'}).then(r=>r.ok?r.json():null).then(value=>{if(!controller.signal.aborted)setData(value?{...value,ticketId}:null);}).catch(()=>{});return()=>controller.abort();},[ticketId]);
 if(data?.ticketId!==ticketId||!data?.receipt)return null;
 return <aside aria-label="Recepción de Cris"><p><strong>{ticketStatus==="resuelto"?"Recepción registrada por Cris":"Pendiente de revisión humana"}</strong> · {data.receipt.kind}</p><p>La recepción no acredita pagos ni confirma reservas, créditos o convenios.</p>{data.attachments.length>0&&<><p>Adjuntos sin análisis de malware. Descarga y revisa solo en un entorno seguro.</p><ul>{data.attachments.map(file=><li key={file.id}><a href={file.href} download>Descargar {file.mime} ({Math.ceil(file.size/1024)} KB)</a></li>)}</ul></>}</aside>;
}
