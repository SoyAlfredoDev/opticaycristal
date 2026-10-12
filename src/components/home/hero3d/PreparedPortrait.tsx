"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { AnimationMixer, Box3, CatmullRomCurve3, ExtrudeGeometry, Group, Mesh, MeshPhysicalMaterial, Object3D, Path, Quaternion, Shape, TubeGeometry, Vector3 } from "three";

function aimBone(bone: Object3D, child: Object3D, destination: Vector3) {
  const origin = bone.getWorldPosition(new Vector3());
  const direction = child.getWorldPosition(new Vector3()).sub(origin).normalize();
  const desired = destination.clone().sub(origin).normalize();
  const world = bone.getWorldQuaternion(new Quaternion());
  const delta = new Quaternion().setFromUnitVectors(direction, desired);
  const parent = bone.parent!.getWorldQuaternion(new Quaternion()).invert();
  bone.quaternion.copy(parent.multiply(delta.multiply(world)));
  bone.updateMatrixWorld(true);
}

function createEyewear(width: number, position: Vector3) {
  const group = new Group();
  const frame = new MeshPhysicalMaterial({ color: "#6b1f3a", metalness: .25, roughness: .22, clearcoat: 1 });
  const glass = new MeshPhysicalMaterial({ color: "#eaf6f1", roughness: .08, transparent: true, opacity: .16, depthWrite: false });
  const rim = new Shape();
  rim.absellipse(0, 0, .49, .33, 0, Math.PI * 2, false, 0);
  const hole = new Path();
  hole.absellipse(0, 0, .425, .265, 0, Math.PI * 2, true, 0);
  rim.holes.push(hole);
  const lens = new Shape();
  lens.absellipse(0, 0, .428, .268, 0, Math.PI * 2, false, 0);
  const rimGeometry = new ExtrudeGeometry(rim, { depth: .05, bevelSize: .012, bevelThickness: .012, bevelSegments: 2, steps: 1, curveSegments: 32 });
  const lensGeometry = new ExtrudeGeometry(lens, { depth: .012, bevelEnabled: false, curveSegments: 32 });
  for (const side of [-1, 1]) {
    const ring = new Mesh(rimGeometry, frame);
    ring.position.x = side * .58;
    group.add(ring);
    const pane = new Mesh(lensGeometry, glass);
    pane.position.set(side * .58, 0, .012);
    group.add(pane);
    const curve = new CatmullRomCurve3([new Vector3(side * 1.04, .08, 0), new Vector3(side * 1.09, .06, -.5), new Vector3(side * 1.03, -.08, -1.5)]);
    group.add(new Mesh(new TubeGeometry(curve, 24, .033, 8, false), frame));
  }
  const bridge = new CatmullRomCurve3([new Vector3(-.13, .06, 0), new Vector3(0, .14, 0), new Vector3(.13, .06, 0)]);
  group.add(new Mesh(new TubeGeometry(bridge, 16, .028, 8, false), frame));
  group.scale.setScalar(width / 2.16);
  group.position.copy(position);
  return group;
}

export function PreparedPortrait({ url }: { url: string }) {
  const { scene, animations } = useGLTF(url, false);
  const prepared = useMemo(() => {
    const model = clone(scene);
    const mixer = new AnimationMixer(model);
    if (animations[0]) { mixer.clipAction(animations[0]).play(); mixer.setTime(1); }
    model.getObjectByName("Phone")?.removeFromParent();
    model.updateMatrixWorld(true);
    const shoulder = model.getObjectByName("upperarm_l");
    const elbow = model.getObjectByName("lowerarm_l");
    const wrist = model.getObjectByName("hand_l");
    if (shoulder && elbow && wrist) {
      const origin = shoulder.getWorldPosition(new Vector3());
      aimBone(shoulder, elbow, origin.clone().add(new Vector3(.16, -.2, -.005)));
      aimBone(elbow, wrist, origin.clone().add(new Vector3(.035, -.3, .04)));
      model.updateMatrixWorld(true);
    }
    const eyes = model.getObjectByName("low-poly");
    const root = new Group();
    root.add(model);
    if (eyes) {
      const eyeBounds = new Box3().setFromObject(eyes, true);
      const center = eyeBounds.getCenter(new Vector3());
      center.z = eyeBounds.max.z + .012;
      const eyewear = createEyewear((eyeBounds.max.x - eyeBounds.min.x) * 1.4, center);
      root.add(eyewear);
    }
    const bounds = new Box3().setFromObject(root, true);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    const normalized = new Group();
    normalized.add(root);
    root.position.set(-center.x, -bounds.min.y, -center.z);
    normalized.scale.setScalar(1.8 / size.y);
    normalized.position.y = -.82;
    return normalized;
  }, [scene, animations]);
  return <primitive object={prepared} />;
}
