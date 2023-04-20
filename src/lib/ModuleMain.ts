import {BaseMain} from './baseFrame/BaseMain'
import PlayerController from './modules/controller/PlayerController'
import {LoadResources} from './modules/loadResources/LoadResources'

export default class ModuleMain extends BaseMain {
  public domElement: any
  public config: any
  public playerModel: any
  public terrainModel: any
  public controlRole: any


  constructor(container: any, config: any) {
    super(container)
    this.domElement = this.render.renderer.domElement
    this.config = config
    this.init()
  }

  init() {
    this.initMouseMove()
  }

  async initControlRole() {
    let configPlayer = {
      name: this.config.playerName,
      // url: "Model/Actor/Actor.gltf"
      url: "1.glb"
      // url: "RobotExpressive.glb"
    }
    let configTerrain = {
      name: "terrain",
      url: "./model/12.glb"
    }
    this.playerModel = await LoadResources(configPlayer)
    this.terrainModel = await LoadResources(configTerrain)
    this.controlRole = new PlayerController(this.baseScene.scene, this.baseCamera.camera, this.baseOrbitControls.orbitControls, this.render.renderer, this.basePhysics.physics, this.playerModel, this.terrainModel, this.config.socket)
  }

  initMouseMove() {
    document.documentElement.oncontextmenu = () => {
      return false;
    };

  }

  initAnimate = () => {
    // 执行渲染操作
    this.render.renderer.render(this.baseScene.scene, this.baseCamera.camera);
    this.controlRole?.update()
    // requestAnimationFrame

    requestAnimationFrame(this.initAnimate); 

  }
}
