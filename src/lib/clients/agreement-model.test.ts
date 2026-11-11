import {describe,it,expect} from "vitest";
import {AGREEMENT_PROPOSAL,judicialReviewDate,judicialReviewCandidates,validateAgreementModel} from "./agreement-model";
import {calculateLateInterest} from "./loan-interest";
describe("Términos del compromiso revisado",()=>{
 it("no permite declarar CAE cero con cargos diferentes de cero",()=>{const d=structuredClone(AGREEMENT_PROPOSAL);expect(()=>validateAgreementModel(d)).not.toThrow();Object.assign(d.terms,{otherCosts:100});expect(()=>validateAgreementModel(d)).toThrow(/sin costos/);});
 it("cuenta seis meses calendario completos, incluidos meses cortos y años bisiestos",()=>{expect(judicialReviewDate("2026-01-31")).toBe("2026-08-01");expect(judicialReviewDate("2026-08-31")).toBe("2027-03-01");expect(judicialReviewDate("2027-08-31")).toBe("2028-03-01");expect(judicialReviewDate("2026-03-15")).toBe("2026-09-16");expect(()=>judicialReviewDate("2026-02-30")).toThrow();});
 it("cobra cero en el día 60 y solo un día en el 61, con tope inferior",()=>{const i=[{amount:20000,dueDate:"2026-01-01"}];expect(calculateLateInterest(i,[],"2026-03-02",18).due).toBe(0);expect(calculateLateInterest(i,[],"2026-03-03",18).due).toBe(10);expect(calculateLateInterest(i,[],"2026-03-03",9).due).toBe(5);});
 it("separa tramos por abonos y excluye días anteriores a la suscripción",()=>{const i=[{amount:20000,dueDate:"2026-01-01"}];expect(calculateLateInterest(i,[{amount:10000,paidOn:"2026-03-17"}],"2026-04-01",18,60,"2026-03-10").due).toBe(145);expect(calculateLateInterest(i,[],"2026-03-09",18,60,"2026-03-10").due).toBe(0);});
});

it("un abono no reinicia seis meses y pagar extingue la marca de revisión",()=>{
 const i=[{number:1,amount:20000,dueDate:"2026-01-31"},{number:2,amount:20000,dueDate:"2026-09-01"}];
 expect(judicialReviewCandidates(i,[{amount:5000,paidOn:"2026-07-30"}],"2026-07-31")[0]).toMatchObject({balance:15000,reviewFrom:"2026-08-01",eligibleForLegalReview:false});
 expect(judicialReviewCandidates(i,[{amount:5000,paidOn:"2026-07-30"}],"2026-08-01")[0]).toMatchObject({balance:15000,eligibleForLegalReview:true});
 expect(judicialReviewCandidates(i,[{amount:20000,paidOn:"2026-07-30"}],"2026-08-01").every(row=>!row.eligibleForLegalReview)).toBe(true);
});
