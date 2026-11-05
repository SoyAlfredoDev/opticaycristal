import { SurveyForm } from '@/components/surveys/SurveyForm';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tu opinión · Óptica & Cristal', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default async function Page({ params }: {
    params: Promise<{
        token: string;
    }>;
}) { return <SurveyForm token={(await params).token}/>; }
