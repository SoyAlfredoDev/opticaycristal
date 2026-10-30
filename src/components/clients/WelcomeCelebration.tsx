"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import styles from "./RegistrationWelcome.module.css";

/** A short, decorative 3D scene; never blocks the account actions. */
export default function WelcomeCelebration() {
 const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const element=host.current;
  const preference=window.matchMedia("(prefers-reduced-motion: reduce)");
  if(!element||preference.matches)return;
  const canvas=document.createElement("canvas");
  const context=canvas.getContext("webgl2",{alpha:true,antialias:true,powerPreference:"low-power"});
  if(!context)return;
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({canvas,context,alpha:true,antialias:true});}catch{return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.setClearColor(0x000000,0);
  element.appendChild(canvas);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(50,1,0.1,30);
  camera.position.z=8;
  scene.add(new THREE.AmbientLight(0xffffff,2));
  const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(2,5,6);scene.add(light);
  const colors=[0xbdff61,0x007f5f,0xd9b765,0x6b1f3a,0xffffff];
  const materials=colors.map(color=>new THREE.MeshStandardMaterial({color,metalness:0.32,roughness:0.36,side:THREE.DoubleSide}));
  const vertices:number[]=[],indices:number[]=[];
  for(let i=0;i<=40;i++){
   const t=i/40,angle=t*Math.PI*5;
   for(const side of [-1,1])vertices.push(Math.sin(angle)*0.12+side*Math.cos(angle)*0.045,t*1.25,Math.cos(angle)*0.12-side*Math.sin(angle)*0.045);
   if(i<40){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}
  }
  const ribbon=new THREE.BufferGeometry();ribbon.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));ribbon.setIndex(indices);ribbon.computeVertexNormals();
  const confetti=new THREE.BoxGeometry(0.1,0.065,0.025);
  const height=2*Math.tan(THREE.MathUtils.degToRad(25))*8;
  const pieces=Array.from({length:52},(_,i)=>{
   const mesh=new THREE.Mesh(i<16?ribbon:confetti,materials[i%materials.length]);
   const x=(Math.random()-0.5)*height*(window.innerWidth/window.innerHeight);
   const y=height/2+Math.random()*2;
   mesh.position.set(x,y,(Math.random()-0.5)*3);
   mesh.rotation.set(Math.random()*Math.PI,Math.random()*Math.PI,Math.random()*Math.PI);
   scene.add(mesh);return{mesh,x,y,speed:0.7+Math.random()*1.1,spin:(Math.random()-0.5)*3,phase:Math.random()*6};
  });
  const resize=()=>{renderer.setSize(window.innerWidth,window.innerHeight);camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();};
  resize();window.addEventListener("resize",resize);
  let frame=0,stopped=false;
  const start=performance.now();
  const stop=()=>{
   if(stopped)return;stopped=true;cancelAnimationFrame(frame);window.removeEventListener("resize",resize);preference.removeEventListener("change",stop);
   ribbon.dispose();confetti.dispose();materials.forEach(m=>m.dispose());renderer.dispose();renderer.forceContextLoss();canvas.remove();
  };
  const animate=(now:number)=>{
   if(stopped)return;
   const time=(now-start)/1000;
   if(time>5.5){stop();return;}
   for(const p of pieces){p.mesh.position.x=p.x+Math.sin(time+p.phase)*0.28;p.mesh.position.y=p.y-p.speed*time-0.3*time*time;p.mesh.rotation.x+=0.018;p.mesh.rotation.y=time*p.spin;p.mesh.rotation.z=time*p.spin*0.7;}
   if(document.visibilityState!=="hidden")renderer.render(scene,camera);
   frame=requestAnimationFrame(animate);
  };
  preference.addEventListener("change",stop);
  frame=requestAnimationFrame(animate);
  const timer=window.setTimeout(stop,5700);
  return()=>{window.clearTimeout(timer);stop();};
 },[]);
 return <div ref={host} className={styles.celebration} aria-hidden="true"/>;
}
