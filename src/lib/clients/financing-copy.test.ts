import {expect,it} from 'vitest';
import {financingExample} from './financing-copy';
it('un cupo de 80 mil y 60% no financia el precio completo de unos lentes de 80 mil',()=>{expect(financingExample({maxAmount:80000,maxPercent:60,maxInstallments:3})).toEqual({price:80000,credit:48000,deposit:32000});});
it('también respeta el tope si el porcentaje permite financiar un monto mayor',()=>{expect(financingExample({maxAmount:40000,maxPercent:70,maxInstallments:1})).toEqual({price:80000,credit:40000,deposit:40000});});
