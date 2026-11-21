const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function sceneProgress(sceneTop, sceneHeight, viewportHeight) {
  return clamp(-sceneTop / Math.max(1, sceneHeight - viewportHeight), 0, 1);
}

export function layerDisplacement(progress, depth, viewportHeight, pointer = { x: 0, y: 0 }) {
  return {
    x: clamp(pointer.x, -1, 1) * 22 * depth,
    y: -clamp(progress, 0, 1) * Math.min(viewportHeight, 1200) * .32 * depth
      + clamp(pointer.y, -1, 1) * 12 * depth,
  };
}

export function copyVisibility(progress) {
  return clamp(1 - (progress - .4) / .55, 0, 1);
}
