import {
  Color, CylinderGeometry, ExtrudeGeometry, Float32BufferAttribute, Group,
  LatheGeometry, Mesh, MeshPhysicalMaterial, Shape, TorusGeometry, Vector2,
} from 'three';

function gradient(geometry, bottom, top) {
  geometry.computeBoundingBox();
  const positions = geometry.getAttribute('position');
  const colors = [];
  const a = new Color(bottom), b = new Color(top);
  const { min, max } = geometry.boundingBox;
  for (let i = 0; i < positions.count; i++) {
    const color = a.clone().lerp(b, (positions.getY(i) - min.y) / Math.max(max.y - min.y, .001));
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  return geometry;
}

function flameShape(points) {
  const shape = new Shape();
  shape.moveTo(...points[0]);
  for (const point of points.slice(1)) {
    if (point.length === 2) shape.lineTo(...point);
    else shape.bezierCurveTo(...point);
  }
  shape.closePath();
  return shape;
}

export function createSiklabTrophy() {
  const trophy = new Group();
  const gold = new MeshPhysicalMaterial({ color: '#ffba20', metalness: .72, roughness: .23, clearcoat: 1, clearcoatRoughness: .15 });
  const edgeGold = new MeshPhysicalMaterial({ color: '#d98408', metalness: .85, roughness: .26 });
  const enamel = () => new MeshPhysicalMaterial({ vertexColors: true, metalness: .3, roughness: .25, clearcoat: 1, clearcoatRoughness: .16 });
  const addFlame = (points, bottom, top, depth, z) => {
    const geometry = new ExtrudeGeometry(flameShape(points), {
      depth, bevelEnabled: true, bevelSegments: 4, bevelSize: .035, bevelThickness: .035, curveSegments: 28, steps: 1,
    });
    gradient(geometry, bottom, top);
    const mesh = new Mesh(geometry, enamel());
    mesh.position.z = z;
    trophy.add(mesh);
  };

  // Layered sculptural interpretation of the supplied seven-color flame artwork.
  addFlame([[0, 2.55], [.58, 1.35, .97, .55, .91, .04], [.5, -.53, -.53, -.53, -.92, .04], [-.94, .55, -.53, 1.42, 0, 2.55]], '#cb0611', '#ff6810', .18, -.23);
  addFlame([[-.8, 1.98], [-.78, 1.1, -.46, .34, -.08, -.38], [-.8, -.18, -1.2, .37, -1.2, .7], [-1.0, 1.1, -.88, 1.6, -.8, 1.98]], '#a707ac', '#f516c4', .16, -.06);
  addFlame([[.82, 1.98], [.94, 1.4, 1.22, .73, 1.18, .25], [.99, -.12, .57, -.4, .06, -.46], [.65, .36, .83, 1.21, .82, 1.98]], '#f0ad04', '#f6fb00', .16, -.045);
  addFlame([[-1.23, 1.13], [-1.15, .44, -.75, .03, -.18, -.1], [-.06, -.3, -.06, -.46, -.08, -.6], [-.88, -.56, -1.56, .03, -1.23, 1.13]], '#1231e8', '#148de7', .15, .1);
  addFlame([[1.23, 1.13], [1.54, .04, .9, -.58, .07, -.59], [.05, -.4, .12, -.23, .18, -.11], [.7, .0, 1.12, .44, 1.23, 1.13]], '#58c909', '#3aef4c', .15, .11);
  addFlame([[0, 1.72], [.37, .98, .7, .2, .48, -.42], [.24, -.59, -.23, -.59, -.47, -.42], [-.7, .18, -.33, 1.02, 0, 1.72]], '#f0358a', '#ffaf67', .15, .24);
  addFlame([[0, 1.02], [.27, .49, .52, -.01, .36, -.4], [.12, -.54, -.12, -.54, -.36, -.4], [-.52, -.01, -.26, .48, 0, 1.02]], '#bfc8d2', '#ffffff', .14, .4);

  const gear = new Shape();
  for (let i = 0; i <= 48; i++) {
    const angle = i / 48 * Math.PI * 2;
    const radius = [0, 3].includes(i % 4) ? .28 : .36;
    const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
    if (i === 0) gear.moveTo(x, y); else gear.lineTo(x, y);
  }
  gear.closePath();
  const gearMesh = new Mesh(new ExtrudeGeometry(gear, { depth: .08, bevelEnabled: true, bevelSize: .015, bevelThickness: .015, bevelSegments: 2 }), new MeshPhysicalMaterial({ color: '#113fbb', metalness: .62, roughness: .2, clearcoat: 1 }));
  gearMesh.position.set(0, -.39, .56);
  trophy.add(gearMesh);

  const bowlProfile = [[0, -.72], [.23, -.72], [.36, -.63], [.63, -.53], [.82, -.36], [.82, -.3], [.76, -.3], [.62, -.4], [0, -.4]].map(p => new Vector2(...p));
  trophy.add(new Mesh(new LatheGeometry(bowlProfile, 64), gold));
  const stemProfile = [[0, -1.68], [.64, -1.68], [.48, -1.48], [.29, -1.1], [.3, -.85], [.39, -.69], [0, -.69]].map(p => new Vector2(...p));
  trophy.add(new Mesh(new LatheGeometry(stemProfile, 64), gold));
  const foot = new Mesh(new CylinderGeometry(.65, .88, .19, 64), gold);
  foot.position.y = -1.77;
  trophy.add(foot);
  const lowerFoot = new Mesh(new CylinderGeometry(.88, .91, .075, 64), edgeGold);
  lowerFoot.position.y = -1.9;
  trophy.add(lowerFoot);
  const rim = new Mesh(new TorusGeometry(.8, .025, 10, 64), gold);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -.315;
  trophy.add(rim);
  trophy.rotation.x = -.055;
  trophy.rotation.y = -.28;
  return trophy;
}
