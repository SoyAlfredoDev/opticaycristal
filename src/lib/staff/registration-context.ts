import "server-only";
import {AsyncLocalStorage} from "node:async_hooks";
/** Server-only evidence. It can never be populated from Better Auth's public signup body. */
export const staffRegistration=new AsyncLocalStorage<{id:string;email:string;rutCipher:string;rutHash:string;role?:"administrator"|"seller"}>();
