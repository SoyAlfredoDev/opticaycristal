import type { CustomerProfile } from "./types";
export type CategorySettings = {
 currentCategory:string;
 tiers:CustomerProfile["tier"][];
 history:Array<{id:string;from:string;to:string;actor:string;createdAt:string}>;
};
