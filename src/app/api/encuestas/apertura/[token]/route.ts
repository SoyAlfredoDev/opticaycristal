import { markSurveyOpened } from '@/lib/surveys/service';
export const runtime = 'nodejs';
export async function GET(_r: Request, { params }: {
    params: Promise<{
        token: string;
    }>;
}) { try {
    await markSurveyOpened((await params).token);
}
catch { } return new Response(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'), { headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'private, no-store, max-age=0', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' } }); }
