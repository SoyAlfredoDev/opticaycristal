import { privateJson, readClientBody, sameClientOrigin } from '@/lib/clients/http';
import { surveyView, answerSurvey, SurveyError, limitSurvey } from '@/lib/surveys/service';
export const runtime = 'nodejs';
const failure = (e: unknown) => privateJson({ error: e instanceof SurveyError ? e.message : 'No pudimos procesar la encuesta. Intenta nuevamente.' }, e instanceof SurveyError ? e.status : 503);
export async function GET(_r: Request, { params }: {
    params: Promise<{
        token: string;
    }>;
}) { try {
    return privateJson(await surveyView((await params).token));
}
catch (e) {
    return failure(e);
} }
export async function POST(r: Request, { params }: {
    params: Promise<{
        token: string;
    }>;
}) { if (!sameClientOrigin(r))
    return privateJson({ error: 'Origen no permitido.' }, 403); try {
    const { token } = await params;
    await limitSurvey(token, r.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown');
    await answerSurvey(token, await readClientBody(r));
    return privateJson({ ok: true });
}
catch (e) {
    return failure(e);
} }
