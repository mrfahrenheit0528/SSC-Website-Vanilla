import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Box3, PerspectiveCamera, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { normalizeSiklabModel } from '../assets/js/siklab-model-loader.mjs';

const bytes = await readFile(new URL('../assets/static/SIKLAB_Trophy.glb', import.meta.url));
assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
const model = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const trophy = normalizeSiklabModel(model.scene);
trophy.position.y = .28;
for (const yaw of [-Math.PI, -.64, 0, .64, Math.PI / 2]) {
  trophy.rotation.y = yaw;
  trophy.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(trophy);
  assert.ok([...bounds.min, ...bounds.max].every(Number.isFinite));
  for (const [width, height] of [[600, 540], [320, 460], [270, 460]]) {
    const camera = new PerspectiveCamera(35, width / height, .1, 100);
    camera.position.set(0, .48, width / height < .65 ? 9.7 : 8.9);
    camera.lookAt(0, .28, 0);
    camera.updateMatrixWorld();
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
      const projected = new Vector3(x, y, z).project(camera);
      assert.ok(Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1, 'Imported model must fit the hero stage');
    }
  }
}
console.log('Supplied GLB parses and fits desktop/mobile stages across rotation angles.');
