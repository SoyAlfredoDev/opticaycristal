import { AuthForm } from "@/components/clients/AuthForm";
export default async function CustomerReset({searchParams}: {searchParams:Promise<{token?:string;error?:string}>}) {const {token}=await searchParams;return <AuthForm mode="reset" token={typeof token==="string"?token:undefined} />;}
