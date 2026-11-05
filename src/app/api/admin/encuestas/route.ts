import { customerAdminSession } from '@/lib/clients/admin';
import { privateJson } from '@/lib/clients/http';
import { listSurveys, SurveyError } from '@/lib/surveys/service';
export async function GET(r: Request) { if (!await customerAdminSession())
    return privateJson({ error: 'Acceso restringido.' }, 401); try {
    return privateJson(await listSurveys(Number(new URL(r.url).searchParams.get('offset') || 0)));
}
catch (e) {
    return privateJson({ error: e instanceof SurveyError ? e.message : 'No pudimos cargar las encuestas.' }, e instanceof SurveyError ? e.status : 503);
} }
