import { cp, mkdir } from "node:fs/promises";

const source = new URL("../node_modules/@mediapipe/tasks-vision/wasm/", import.meta.url);
const target = new URL("../public/asesor-monturas/wasm/", import.meta.url);
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });
