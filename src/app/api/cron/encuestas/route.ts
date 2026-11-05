import { createHash, timingSafeEqual } from 'node:crypto';
import { privateJson } from '@/lib/clients/http';
import { dispatchSurvey } from '@/lib/surveys/service';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(r: Request) { const secret = process.env.CRON_SECRET, token = r.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1]; if (!secret || !token || !timingSafeEqual(createHash('sha256').update(secret).digest(), createHash('sha256').update(token).digest()))
    return privateJson({ error: 'Acceso restringido.' }, 401); try {
    const started = Date.now();
    let sent = 0, processed = 0;
    while (processed < 50 && Date.now() - started < 40000) {
        const result = await dispatchSurvey();
        if (result.disabled || result.empty)
            break;
        sent += result.sent;
        processed++;
    }
    return privateJson({ sent, processed });
}
catch {
    return privateJson({ error: 'No se pudo completar la cola de encuestas.' }, 503);
} }
