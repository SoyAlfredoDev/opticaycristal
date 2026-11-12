// Conservative, local-only quality checks. These thresholds are pilot heuristics,
// not a biometric score or a guarantee that missing detail can be recovered.
export type PixelImage = { data: Uint8ClampedArray; width: number; height: number };
export type PhotoQuality = { detail: number; dark: number; bright: number; action: "ready" | "enhance" | "retake"; reason?: "blur" | "light" };
const luminance = (data: Uint8ClampedArray, i: number) => .2126 * data[i] + .7152 * data[i+1] + .0722 * data[i+2];

// Call on a 256px face crop, never on the background: sharp scenery must not
// conceal a blurred face. Light prefilter reduces noise and JPEG edge effects.
export function assessPhotoQuality({ data, width, height }: PixelImage): PhotoQuality {
  if (width < 8 || height < 8 || data.length !== width * height * 4) throw new Error("Invalid pixels");
  const gray = new Float32Array(width * height), smooth = new Float32Array(width * height);
  let dark = 0, bright = 0;
  for (let i=0; i<gray.length; i++) { gray[i]=luminance(data,i*4); dark+=gray[i]<12?1:0; bright+=gray[i]>246?1:0; }
  for(let y=1;y<height-1;y++) for(let x=1;x<width-1;x++) {
    const i=y*width+x;
    smooth[i]=(gray[i]*4+(gray[i-1]+gray[i+1]+gray[i-width]+gray[i+width])*2+gray[i-width-1]+gray[i-width+1]+gray[i+width-1]+gray[i+width+1])/16;
  }
  let sum=0,squares=0,count=0;
  for(let y=2;y<height-2;y++) for(let x=2;x<width-2;x++) {
    const i=y*width+x, lap=smooth[i-1]+smooth[i+1]+smooth[i-width]+smooth[i+width]-4*smooth[i];
    sum+=lap;squares+=lap*lap;count++;
  }
  const detail=Math.max(0,squares/count-(sum/count)**2);
  dark/=gray.length;bright/=gray.length;
  if(dark>.55 || bright>.55) return {detail,dark,bright,action:"retake",reason:"light"};
  if(detail<3) return {detail,dark,bright,action:"retake",reason:"blur"};
  return {detail,dark,bright,action:detail<35?"enhance":"ready"};
}

// Bounded unsharp mask of luminance only. No synthesis, warping, smoothing,
// enlargement or changes to the photo's geometry. Do not run on severe blur.
export function enhancePhotoPixels({data,width,height}:PixelImage):Uint8ClampedArray {
  if(data.length!==width*height*4) throw new Error("Invalid pixels");
  const result=new Uint8ClampedArray(data), gray=new Float32Array(width*height);
  for(let i=0;i<gray.length;i++)gray[i]=luminance(data,i*4);
  for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
    const i=y*width+x;
    const blur=(gray[i]*4+(gray[i-1]+gray[i+1]+gray[i-width]+gray[i+width])*2+gray[i-width-1]+gray[i-width+1]+gray[i+width-1]+gray[i+width+1])/16;
    const edge=gray[i]-blur;
    // Ignore tiny differences so noise and skin texture are not amplified.
    const sharpen=Math.abs(edge)<1?0:Math.max(-5,Math.min(5,edge*.45));
    for(let channel=0;channel<3;channel++)result[i*4+channel]=data[i*4+channel]+sharpen;
  }
  return result;
}
