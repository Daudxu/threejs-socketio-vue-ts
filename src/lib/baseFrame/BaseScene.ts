import * as THREE from 'three';

export default class BaseScene {
  public scene: any;
  public light: any;
  constructor() {
    this.init();
    this.lights();
  }

  /**
   * 初始化场景
   */
  init(): void {
    this.scene = new THREE.Scene();
    this.scene.background=new THREE.Color(0x001111)
    // this.scene.fog=new THREE.Fog(0x001111,10,600)
  }


  lights(): void {
    this.light=new THREE.PointLight(0xffffff)
    this.light.position.set(0,100,0)
    this.light.castShadow=true
    this.scene.add(this.light)

    this.scene.add(new THREE.AmbientLight())
  }
}
