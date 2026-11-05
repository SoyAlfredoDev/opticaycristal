import { Suspense } from 'react';
import { WebpayPayments } from '@/components/clients/WebpayPayments';
export default function Page() { return <><h1>Mis pagos</h1><p>Compras confirmadas y cuotas con Webpay Plus.</p><Suspense fallback={<p>Cargando pagos…</p>}><WebpayPayments /></Suspense></>; }
