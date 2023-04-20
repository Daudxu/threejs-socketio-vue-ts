import * as THREE from "three";
import gsap from "gsap";
import { Octree } from "three/examples/jsm/math/Octree.js";
import { OctreeHelper } from "three/examples/jsm/helpers/OctreeHelper.js";
import { A, D, DIRECTIONS, S, W } from '../../utils/KeyDisplay'
import { Capsule } from "three/examples/jsm/math/Capsule.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import Store from '../../store/index.js'
import { computed } from 'vue'

let directionOffset, directionOffseta
const keyStates = {};

export default class Physics {
  constructor(planeGroup, camera, scene, player, orbitControls) {
    this.eventPositionList = [];
    this.worldOctree = new Octree();
    this.worldOctree.fromGraphNode(planeGroup);
    this.camera = camera
    this.player = player
    this.orbitControls = orbitControls
    this.rotateAngle = new THREE.Vector3(0, 1, 0)
    this.cameraTarget = new THREE.Vector3()
    this.walkDirection = new THREE.Vector3()
    this.rotateQuarternion = new THREE.Quaternion()
    this.currentAction = 'Run'
    this.storeObj  = Store()
    // 创建一个octreeHelper
    // const octreeHelper = new OctreeHelper(this.worldOctree);
    // scene.add(octreeHelper);

    // 创建一个人的碰撞体
    this.playerCollider = new Capsule(
      new THREE.Vector3(0, 0.35, 0),
      new THREE.Vector3(0, 1.35, 0),
      0.35
    );
    // 加载机器人模型
    const loader = new GLTFLoader();
    // 设置动作混合器
    this.mixer = null;
    this.actions = {};
    // 设置激活动作
    this.activeAction = null;
    loader.load("./1.glb", (gltf) => {
      this.robot = gltf.scene;
      // this.robot.scale.set(0.5, 0.5, 0.5);
      this.robot.position.set(0, -0.88, 0);

      // console.log(gltf);
      this.capsule.add(this.robot);
      this.mixer = new THREE.AnimationMixer(this.robot);
    //   if(gltf.animations.length > 0) {
    //     for (let i = 0; i < gltf.animations.length; i++) {
    //       let name = gltf.animations[i].name;
    //       this.actions[name] = this.mixer.clipAction(gltf.animations[i]);
    //       if (name == "Idle" || name == "Walking" || name == "Running") {
    //         this.actions[name].clampWhenFinished = false;
    //         this.actions[name].loop = THREE.LoopRepeat;
    //       } else {
    //         this.actions[name].clampWhenFinished = true;
    //         this.actions[name].loop = THREE.LoopOnce;
    //       }
    //     }
    //     this.activeAction = this.actions["Idle"];
    //     this.activeAction.play();
    //     console.log(this.actions);
    //  }
    });

    this.capsule = new THREE.Object3D();
    this.capsule.position.set(0, 0.85, 0);

    scene.add(this.capsule);

    // 设置重力
    // this.gravity = -9.8;
    this.gravity = -9.8;
    // 玩家的速度s
    this.playerVelocity = new THREE.Vector3(0, 0, 0);
    // 方向向量
    this.playerDirection = new THREE.Vector3(0, 0, 0);
    this.keysPressed = {}
    // 键盘按下事件
    this.keyStates = {
      KeyW: false,
      KeyA: false,
      KeyS: false,
      KeyD: false,
      Space: false,
      isDown: false,
    };

    // 玩家是否在地面上
    this.playerOnFloor = false;

    // 根据键盘按下的键来更新键盘的状态
    // document.addEventListener(
    //   "keydown",
    //   (event) => {
    //     console.log("keydown===", event.code);
    //     this.keyStates[event.code] = true;
    //     this.keyStates.isDown = true;
    //     (this.keysPressed)[event.key.toUpperCase()] = true
    //   },
    //   false
    // );
    // document.addEventListener(
    //   "keyup",
    //   (event) => {
    //     console.log("keyup===", event.code);
    //     this.keyStates[event.code] = false;
    //     this.keyStates.isDown = false;
    //     (this.keysPressed)[event.key.toUpperCase()] = false
    //   },
    //   false
    // );
    this.init()
  }

  init() {
    let _this = this
    window.addEventListener('keydown', (event) => {
      if (event.shiftKey && _this.player) {
          _this.switchRunToggle()
      } else {
          this.keyStates[event.code] = true;
          this.keyStates.isDown = true;
          (_this.keysPressed)[event.key.toLowerCase()] = true
      }
    }, false);
    window.addEventListener('keyup', (event) => {
          this.keyStates[event.code] = false;
          this.keyStates.isDown = false;
          (_this.keysPressed)[event.key.toLowerCase()] = false
    }, false);
  }
  updatePlayer(deltaTime) {
    let damping = -1;
    if (this.playerOnFloor) {
      this.playerVelocity.y = 0;

      this.keyStates.isDown ||
        this.playerVelocity.addScaledVector(this.playerVelocity, damping);
    } else {
      this.playerVelocity.y += this.gravity * deltaTime;
    }

    // console.log(playerVelocity);
    // 计算玩家移动的距离
    const playerMoveDistance = this.playerVelocity
      .clone()
      .multiplyScalar(deltaTime);
    this.playerCollider.translate(playerMoveDistance);
    // 将胶囊的位置进行设置
    this.playerCollider.getCenter(this.capsule.position);

    // 进行碰撞检测
    this.playerCollisions();

    // console.log(Math.abs(playerVelocity.x) + Math.abs(playerVelocity.z));
    // 如果有水平的运动，则设置运动的动作
    if (
      Math.abs(this.playerVelocity.x) + Math.abs(this.playerVelocity.z) > 0.1 &&
      Math.abs(this.playerVelocity.x) + Math.abs(this.playerVelocity.z) <= 3
    ) {
      this.fadeToAction("Walking");
    } else if (
      Math.abs(this.playerVelocity.x) + Math.abs(this.playerVelocity.z) >
      3
    ) {
      this.fadeToAction("Running");
    } else {
      this.fadeToAction("Idle");
    }
  }
  playerCollisions() {
    // 人物碰撞检测
    const result = this.worldOctree.capsuleIntersect(this.playerCollider);
    // console.log(result);
    this.playerOnFloor = false;
    if (result) {
      this.playerOnFloor = result.normal.y > 0;
      this.playerCollider.translate(result.normal.multiplyScalar(result.depth));
    }
  }
  resetPlayer() {
    if (this.capsule.position.y < -20) {
      this.playerCollider.start.set(0, 2.35, 0);
      this.playerCollider.end.set(0, 3.35, 0);
      this.playerCollider.radius = 0.35;
      this.playerVelocity.set(0, 0, 0);
      this.playerDirection.set(0, 0, 0);
    }
  }
  fadeToAction(actionName) {
    this.prevAction = this.activeAction;
    this.activeAction = this.actions[actionName];
    if (this.prevAction != this.activeAction) {
      this.prevAction.fadeOut(0.3);
      this.activeAction
        .reset()
        .setEffectiveTimeScale(1)
        .setEffectiveWeight(1)
        .fadeIn(0.3)
        .play();

      this.mixer.addEventListener("finished", (e) => {
        this.prevAction = activeAction;
        this.activeAction = this.actions["Idle"];
        this.prevAction.fadeOut(0.3);
        this.activeAction
          .reset()
          .setEffectiveTimeScale(1)
          .setEffectiveWeight(1)
          .fadeIn(0.3)
          .play();
      });
    }
  }
  controlPlayer(deltaTime) {
    const directionPressed = DIRECTIONS.some(key => this.keysPressed[key] == true)
      // console.log("directionPressed", DIRECTIONS.some(key => this.keysPressed[key] == true))
      // console.log("directionPressed", typeof this.keysPressed)
    var play = '';
    if (directionPressed) {
        play = 'Run'
    } else {
        play = 'Idle'
    }
    if (this.currentAction != play) {
      this.currentAction = play
    }
    const isInpt = computed(() => this.storeObj.useAppStore.getIsInpt)
    if ((this.currentAction == 'Run' || this.currentAction == 'Walk') && !isInpt.value) {
      //  获取相机角度
      var angleYCameraDirection = Math.atan2(
      (this.camera.position.x - this.capsule.position.x), 
      (this.camera.position.z - this.capsule.position.z))

      directionOffset = this.directionOffset(this.keysPressed, 'back')
      directionOffseta = this.directionOffset(this.keysPressed)
      this.rotateQuarternion.setFromAxisAngle(this.rotateAngle, angleYCameraDirection + directionOffset)
      this.capsule.quaternion.rotateTowards(this.rotateQuarternion, 0.2)

      this.camera.getWorldDirection(this.walkDirection)
      this.walkDirection.y = 0
      this.walkDirection.normalize()
      this.walkDirection.applyAxisAngle(this.rotateAngle, directionOffseta)
      let velocity = 2
      const moveX = this.walkDirection.x * velocity * deltaTime
      const moveZ = this.walkDirection.z * velocity * deltaTime
      const moveVector = new THREE.Vector3();
      moveVector.x += moveX
      moveVector.z += moveZ
      // console.log('moveZ', moveZ)
      this.playerVelocity.add(moveVector)
      this.updateCameraTarget(moveX, moveZ)
    }
     
    
    // if (this.keyStates["KeyW"]) {
    //   this.playerDirection.z = 1;
    //   //获取胶囊的正前面方向
    //   const capsuleFront = new THREE.Vector3(0, 0, 0);
    //   // this.capsule.getWorldDirection(capsuleFront);
    //   this.capsule.getWorldDirection(capsuleFront);
    //   console.log('capsuleFront--W', capsuleFront);
    //   // 计算玩家的速度
    //   // 当速度超过最大速度时，不操作
    //   if (
    //     this.playerVelocity.x * this.playerVelocity.x +
    //       this.playerVelocity.z * this.playerVelocity.z <=
    //     200
    //   ) {
    //     this.playerVelocity.add(capsuleFront.multiplyScalar(deltaTime * 5));
    //   }
    // }
    // if (this.keyStates["KeyS"]) {
    //   this.playerDirection.z = 1;
    //   //获取胶囊的正前面方向
    //   const capsuleFront = new THREE.Vector3(0, 0, 0);
    //   this.capsule.getWorldDirection(capsuleFront);
    //   console.log('capsuleFront--S', capsuleFront);
    //   // 计算玩家的速度
    //   this.playerVelocity.add(capsuleFront.multiplyScalar(-deltaTime));
    //   console.log('this.keysPressed', this.keysPressed)
    // }
    // if (this.keyStates["KeyA"]) {
    //   this.playerDirection.x = 1;

    //   //获取胶囊的正前面方向
    //   const capsuleFront = new THREE.Vector3(0, 0, 0);
    //   this.capsule.getWorldDirection(capsuleFront);

    //   // 侧方的方向，正前面的方向和胶囊的正上方求叉积，求出侧方的方向
    //   capsuleFront.cross(this.capsule.up);
    //   // console.log(capsuleFront);
    //   // 计算玩家的速度
    //   this.playerVelocity.add(capsuleFront.multiplyScalar(-deltaTime));
    // }
    // if (this.keyStates["KeyD"]) {
    //   this.playerDirection.x = 1;
    //   //获取胶囊的正前面方向
    //   const capsuleFront = new THREE.Vector3(0, 0, 0);
    //   this.capsule.getWorldDirection(capsuleFront);

    //   // 侧方的方向，正前面的方向和胶囊的正上方求叉积，求出侧方的方向
    //   capsuleFront.cross(this.capsule.up);
    //   // console.log(capsuleFront);
    //   // 计算玩家的速度
    //   this.playerVelocity.add(capsuleFront.multiplyScalar(deltaTime));
    // }
    if (this.keyStates["Space"]) {
      this.playerVelocity.y = 5;
    }
  }
  update(delta) {
    const STEPS_PER_FRAME = 3
    for ( let i = 0; i < STEPS_PER_FRAME; i ++ ) {
      this.controlPlayer(delta);
      this.updatePlayer(delta);
      this.resetPlayer();
      if (this.mixer) {
        this.mixer.update(delta);
      }
    }
    // this.controlPlayer(delta);
    // this.updatePlayer(delta);
    // this.resetPlayer();
    if (this.mixer) {
      this.mixer.update(delta);
    }
    // this.updateCameraTarget()
    // this.camera.lookAt(this.capsule.position);
    // this.camera.position.x = this.walkDirection.x
    // this.camera.position.z = this.walkDirection.z
    // this.camera.position.y = this.capsule.position.y
    // this.cameraTarget.x = this.capsule.x
    // this.cameraTarget.y = this.capsule.y + 1
    // this.cameraTarget.z = this.capsule.z
    // this.orbitControls.target = this.capsule.position
    this.emitPositionEvent();
  }
  updateCameraTarget(moveX, moveZ) {
    // move camera
    // this.camera.position.x += moveX
    // this.camera.position.z += moveZ
  
    // update camera target
    this.cameraTarget.x = this.capsule.x
    this.cameraTarget.y = this.capsule.y + 1
    this.cameraTarget.z = this.capsule.z
    this.orbitControls.target = this.capsule.position
  }
  emitPositionEvent() {
    this.eventPositionList.forEach((item, i) => {
      // 计算胶囊距离某个点的距离，是否触发事件
      const distanceToSquared = this.capsule.position.distanceToSquared(
        item.position
      );
      if (
        distanceToSquared < item.radius * item.radius &&
        item.isInner == false
      ) {
        item.isInner = true;
        item.callback && item.callback(item);
      }

      if (
        distanceToSquared >= item.radius * item.radius &&
        item.isInner == true
      ) {
        item.isInner = false;
        item.outCallback && item.outCallback(item);
      }
    });
  }
  onPosition(position, callback, outCallback, radius = 2) {
    position = position.clone();
    this.eventPositionList.push({
      position,
      callback,
      outCallback,
      isInner: false,
      radius,
    });
  }

  // front, back, left, right
  directionOffset(keysPressed, toward = "front" ) {
    if(toward === 'front'){
        var directionOffset = 0 // w

        if (keysPressed[W]) {
            if (keysPressed[A]) {
                directionOffset = Math.PI / 4 // w+a
            } else if (keysPressed[D]) {
                directionOffset = - Math.PI / 4 // w+d
            }
        } else if (keysPressed[S]) {
            if (keysPressed[A]) {
                directionOffset = Math.PI / 4 + Math.PI / 2 // s+a
            } else if (keysPressed[D]) {
                directionOffset = -Math.PI / 4 - Math.PI / 2 // s+d
            } else {
                directionOffset = Math.PI // s
            }
        } else if (keysPressed[A]) {
            directionOffset = Math.PI / 2 // a
        } else if (keysPressed[D]) {
            directionOffset = - Math.PI / 2 // d
        }
        return directionOffset
    }else if(toward === 'back'){
        var directionOffset = Math.PI  // w

        if (keysPressed[W]) {
            if (keysPressed[A]) {
                directionOffset = -Math.PI / 4 - Math.PI / 2  // w+a
            } else if (keysPressed[D]) {
                directionOffset =  Math.PI / 4 + Math.PI / 2 // w+d
            }
        } else if (keysPressed[S]) {
            if (keysPressed[A]) {
                directionOffset = Math.PI / 4 - Math.PI / 2 // s+a
            } else if (keysPressed[D]) {
                directionOffset =  - Math.PI / 4 + Math.PI / 2// s+d
            } else {
                directionOffset = 0 // s
            }
        } else if (keysPressed[A]) {
            directionOffset = -Math.PI / 2 // a
        } else if (keysPressed[D]) {
            directionOffset =  Math.PI / 2 // d
        }
        return directionOffset
    }
  }
  controls( deltaTime ) {

    // gives a bit of air control
    const speedDelta = deltaTime * ( playerOnFloor ? 25 : 8 );

    if ( keyStates[ 'KeyW' ] ) {

      this.playerVelocity.add( getForwardVector().multiplyScalar( speedDelta ) );

    }

    if ( keyStates[ 'KeyS' ] ) {

      this.playerVelocity.add( getForwardVector().multiplyScalar( - speedDelta ) );

    }

    if ( keyStates[ 'KeyA' ] ) {

      this.playerVelocity.add( getSideVector().multiplyScalar( - speedDelta ) );

    }

    if ( keyStates[ 'KeyD' ] ) {

      this.playerVelocity.add( getSideVector().multiplyScalar( speedDelta ) );

    }

    if ( playerOnFloor ) {

      if ( keyStates[ 'Space' ] ) {

        this.playerVelocity.y = 15;

      }

    }

  }
}
