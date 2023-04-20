import * as CANNON from "cannon-es"

export default class BasePhysics {
  public physics: any
  constructor() {
      this.init();
  }
  /**
   * 初始化物理环境
   */
  init(): void {
    this.physics = new CANNON.World();
    // 设置物理世界重力
    this.physics.gravity.set(0, -8.5, 0);
  }
}
