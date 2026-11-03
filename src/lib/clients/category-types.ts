import type { CustomerProfile } from "./types";
export type CategorySettings = {
 currentCategory:string;
 mailDeliveryEnabled?:boolean;
 tiers:CustomerProfile["tier"][];
 history:Array<{id:string;from:string;to:string;actor:string;createdAt:string;source?:"manual"|"automatic";mailState?:import("./level-mail").LevelMailState|null}>;
};
