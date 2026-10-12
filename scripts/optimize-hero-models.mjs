import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, resample, textureCompress, weld, simplify } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { stat } from 'node:fs/promises';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
await MeshoptSimplifier.ready;
for (const [source, target] of [['maya', 'woman'], ['sam', 'man']]) {
  const document = await io.read(`.cache/hero-models/${source}.glb`);
  await document.transform(dedup(), weld(), simplify({ simplifier: MeshoptSimplifier, ratio: .65, error: .001 }), resample(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 88 }), prune());
  const file = `public/models/hero/${target}.glb`;
  await io.write(file, document);
  console.log(`${target}: ${((await stat(file)).size / 1024 / 1024).toFixed(2)} MB`);
}
