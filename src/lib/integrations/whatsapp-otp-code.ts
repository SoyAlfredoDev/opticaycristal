import 'server-only';
import {randomInt} from 'node:crypto';
// Avoid visually ambiguous I, O, 0 and 1. Rejection sampling gives an even
// distribution over codes containing at least one letter and one number.
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function generateWhatsappOtp(){
 let code:string;
 do{code=Array.from({length:4},()=>alphabet[randomInt(alphabet.length)]).join('');}while(!/[A-Z]/.test(code)||!/[0-9]/.test(code));
 return code;
}
export function normalizeWhatsappOtp(value:unknown){
 if(typeof value!=='string')return null;
 const trimmed=value.trim();
 // Check ASCII before uppercasing: Unicode folding must not change the length.
 return /^[A-Za-z0-9]{4}$/.test(trimmed)?trimmed.toUpperCase():null;
}
