export function normalizeIntegrationWhatsapp(input:unknown){
 if(typeof input!=="string"||input.length>32)throw new Error("Ingresa un número internacional válido.");
 let value=input.trim().replace(/[\s()-]/g,"");
 if(/^9\d{8}$/.test(value))value="+56"+value;
 else if(/^569\d{8}$/.test(value))value="+"+value;
 else if(/^[1-9]\d{7,14}$/.test(value))value="+"+value; // WhatsApp sender IDs omit '+'.
 if(!/^\+[1-9]\d{7,14}$/.test(value)||value.startsWith("+56")&&!/^\+569\d{8}$/.test(value))throw new Error("Ingresa un número internacional válido.");
 return value;
}
