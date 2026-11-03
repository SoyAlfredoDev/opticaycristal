import "server-only";
import {createHmac,timingSafeEqual} from "node:crypto";
export function kapsoVerificationEnabled(){return process.env.WHATSAPP_VERIFICATION_ENABLED==="true"&&Boolean(process.env.KAPSO_WEBHOOK_SECRET&&process.env.KAPSO_WEBHOOK_SECRET.length>=32)&&/^\d{8,25}$/.test(process.env.KAPSO_PHONE_NUMBER_ID||"");}
export function verifyKapsoSignature(raw:Buffer,signature:string|null){const secret=process.env.KAPSO_WEBHOOK_SECRET;if(!secret||secret.length<32||!signature||!/^[a-f0-9]{64}$/i.test(signature))return false;return timingSafeEqual(createHmac("sha256",secret).update(raw).digest(),Buffer.from(signature,"hex"));}
