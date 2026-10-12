export type FieldEvidence={field:string;value:string;url:string;fetchedAt:string;excerpt?:string};
export type CompanyResult={providerId:string;name:string;address:string|null;website:string|null;phone:string|null;mapsUrl:string|null;categories:string[];source:string;fetchedAt:string;employeeEstimate?:number|null;employeeEstimateSource?:string|null;region?:string|null;emails?:string[];socialLinks?:string[];evidence?:FieldEvidence[];webCheckedAt?:string|null;webStatus?:string|null};
export type CommercialFit="convenio_bajo"|"convenio"|"jornada"|"ambas"|"por_clasificar";
export function getCommercialFit(workers:number|null|undefined):CommercialFit{return workers==null||!Number.isFinite(workers)||workers<1?"por_clasificar":workers<5?"convenio_bajo":workers>20?"ambas":"convenio"}
export type ProspectStage="nuevo"|"contactado"|"oportunidad"|"ganado"|"descartado";
export type Prospect=CompanyResult&{id:string;stage:ProspectStage;notes:string;commercialFit:CommercialFit;createdAt:string;rut?:string|null;legalName?:string|null;economicActivities?:string[];economicDescription?:string|null;officialSource?:string|null;officialFetchedAt?:string|null};
export type Activity={id:string;prospectId:string;kind:"llamada"|"correo"|"reunion"|"nota";note:string;createdAt:string};
