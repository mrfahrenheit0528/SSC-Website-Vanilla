import { Box3, Group, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function normalizeSiklabModel(model) {
  model.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(model);
  const center = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());
  const longest = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(longest) || longest <= 0) throw new Error('Invalid model bounds');
  const pivot = new Group();
  model.position.sub(center);
  pivot.add(model);
  pivot.scale.setScalar(4.4 / longest);
  const trophy = new Group();
  trophy.add(pivot);
  trophy.rotation.y = -.28;
  return trophy;
}

export async function loadSiklabModel(url) {
  const gltf = await new GLTFLoader().loadAsync(url);
  return normalizeSiklabModel(gltf.scene);
}
