import { describe, expect, it } from "vitest";
import { assessPhotoQuality, enhancePhotoPixels, type PixelImage } from "./photo-quality";
const pixels=(value:number):PixelImage=>({width:256,height:256,data:new Uint8ClampedArray(Array.from({length:256*256*4},(_,i)=>i%4===3?255:value))});
describe("preparación conservadora de fotos",()=>{
  it("pide una nueva toma si no existe detalle, o si está casi negra o quemada",()=>{
    expect(assessPhotoQuality(pixels(120))).toMatchObject({action:"retake",reason:"blur"});
    expect(assessPhotoQuality(pixels(4))).toMatchObject({action:"retake",reason:"light"});
    expect(assessPhotoQuality(pixels(252))).toMatchObject({action:"retake",reason:"light"});
  });
  it("detecta detalle real sin depender del brillo medio del rostro",()=>{
    for(const base of [45,115,185]){
      const photo=pixels(base);
      for(let y=0;y<256;y++)for(let x=0;x<256;x++)for(let c=0;c<3;c++)photo.data[(y*256+x)*4+c]+=Math.floor(x/8)%2?20:-20;
      expect(assessPhotoQuality(photo).action).not.toBe("retake");
    }
  });
  it("no modifica la entrada ni la geometría, conserva transparencia y limita cada cambio",()=>{
    const photo=pixels(120);
    for(let y=0;y<256;y++)for(let x=0;x<256;x++)photo.data[(y*256+x)*4]=x%8<4?70:170;
    const original=new Uint8ClampedArray(photo.data),output=enhancePhotoPixels(photo);
    expect(photo.data).toEqual(original);expect(output.length).toBe(original.length);
    expect(output.some((value,i)=>value!==original[i])).toBe(true);
    for(let i=0;i<output.length;i++){
      expect(Math.abs(output[i]-original[i])).toBeLessThanOrEqual(5);
      if(i%4===3)expect(output[i]).toBe(original[i]);
    }
  });
  it("no inventa textura en una zona uniforme ni amplifica diferencias mínimas",()=>{
    const photo=pixels(100);photo.data[(128*256+128)*4]=101;
    expect(enhancePhotoPixels(photo)).toEqual(photo.data);
  });
  it("rechaza dimensiones inválidas",()=>{
    expect(()=>assessPhotoQuality({width:256,height:256,data:new Uint8ClampedArray(4)})).toThrow();
    expect(()=>enhancePhotoPixels({width:256,height:256,data:new Uint8ClampedArray(4)})).toThrow();
  });
});
