import * as THREE from 'three';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export default class BaseOrbitControls {
  public orbitControls: any
  constructor(camera:any, renderer: any) {
    this.initOrbitControls(camera, renderer);
  }
  
  /**
   * 初始化轨道控制
   */
  initOrbitControls(camera:any, renderer: any) {
    this.orbitControls = new OrbitControls(camera, renderer.domElement);
    this.orbitControls.enableDamping = true
    // this.orbitControls.target.set(0, 7, 7)
    // 是否禁止缩放
    this.orbitControls.enableZoom = true
    // 缩放限制
    this.orbitControls.minDistance = 7
    this.orbitControls.maxDistance = 37
    // 限制最大仰视角和俯视角
    this.orbitControls.minPolarAngle = 0
    this.orbitControls.maxPolarAngle = 1.5
    // 是否可以平移
    this.orbitControls.enablePan = false
    // 是否使用键盘
    this.orbitControls.enableKeys = true
    this.orbitControls.maxPolarAngle = Math.PI / 2 - 0.05
    this.orbitControls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE
    }
    this.orbitControls.update();
  }
}
