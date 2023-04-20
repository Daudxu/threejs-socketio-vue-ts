import * as THREE from 'three';

export default class BaseCamera {
  
  public container: any;
  public renderer: any;
  public camera: any;

  constructor(container: any, renderer: any) {
    this.container=container
    this.renderer=renderer
    this.initCamera();
  }
  
  /**
   * 初始化相机
   */
  initCamera() {
    let _this = this
    _this.camera = new THREE.PerspectiveCamera(65, _this.container.clientWidth / _this.container.clientHeight, 0.1, 1000 );
    _this.camera.position.set(0, 15, 15)
  }

}
