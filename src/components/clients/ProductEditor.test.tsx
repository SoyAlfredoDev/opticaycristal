import {fireEvent,render,screen,waitFor} from "@testing-library/react";
import {afterEach,expect,it,vi} from "vitest";
import {ProductEditor} from "./ProductEditor";
afterEach(()=>vi.unstubAllGlobals());
it("permite crear un producto variable sin inventar un costo fijo",async()=>{
 const saved=vi.fn(),fetcher=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({id:"variable"}))).mockResolvedValueOnce(new Response(JSON.stringify({products:[{id:"variable",name:"Lente óptico",protectedCost:null}]})));
 vi.stubGlobal("fetch",fetcher);render(<ProductEditor products={[]} onSaved={saved}/>);
 fireEvent.click(screen.getByText("Productos y costos"));fireEvent.change(screen.getByLabelText("Nombre del producto"),{target:{value:"Lente óptico"}});fireEvent.click(screen.getByLabelText("El costo varía en cada venta"));
 expect(screen.queryByLabelText("Costo protegido por unidad")).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole("button",{name:"Revisar cambio"}));expect(fetcher).not.toHaveBeenCalled();fireEvent.click(screen.getByRole("button",{name:"Confirmar producto"}));
 await waitFor(()=>expect(saved).toHaveBeenCalledWith([{id:"variable",name:"Lente óptico",protectedCost:null}]));expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({action:"product",protectedCost:null});
});
