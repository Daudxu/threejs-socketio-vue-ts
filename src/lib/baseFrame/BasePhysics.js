import * as CANNON from "cannon-es"

export default class BasePhysics {
  constructor(container) {
      this.init(container);
  }
  /**
   * 初始化物理环境
   */
  init() {
    this.physics = new CANNON.World();
    // 设置物理世界重力
    this.physics.gravity.set(0, -8.5, 0);
  }
}
