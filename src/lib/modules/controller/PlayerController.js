import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky'
import { OBB } from 'three/examples/jsm/math/OBB'
import { A, D, DIRECTIONS, S, W } from '../../../utils/KeyDisplay'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils'
import * as TWEEN from '@tweenjs/tween.js'
import gsap from 'gsap'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import * as CANNON from "cannon-es"
import CannonDebugger from 'cannon-es-debugger'
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { CapsuleCollider } from '../../physics/CapsuleCollider';
import { computed } from 'vue'
import Store from '../../../store/index.js'
import Physics from '../../baseFrame/BasePhysics'
import { CollisionGroups } from '../../../enums/CollisionGroups';
import { GroundImpactData } from '../../characters/GroundImpactData';
import * as Utils from '../../core/FunctionLibrary';
import { TrimeshCollider } from '../../physics/TrimeshCollider.js';
import { VectorSpringSimulator } from '../../physics/spring_simulation/VectorSpringSimulator';

const GROUP1 = 1;
const GROUP2 = 2;
const clock = new THREE.Clock();


let player = new THREE.Group()//角色
let ball = new THREE.Vector3()//保存点击坐标

let distVec; //距离
let targetVecNorm;
let colliders = []

//动画
let mixers = []
let action
let tween
let labelRenderer
const runVelocity = 5
const walkVelocity = 2

let directionOffset, directionOffseta
export default class PlayerController {

   updateOrder = 1;
	 entityType = "Character";

	 height = 0;
	 tiltContainer;
	 modelContainer;
	 materials = [];
	 mixer;
	 animations;

	// Movement
	 acceleration = new THREE.Vector3();
	 velocity = new THREE.Vector3();
	 arcadeVelocityInfluence = new THREE.Vector3();
	 velocityTarget = new THREE.Vector3();
	 arcadeVelocityIsAdditive = false;

	 defaultVelocitySimulatorDamping = 0.8;
	 defaultVelocitySimulatorMass = 50;
	 velocitySimulator;
	 moveSpeed = 4;
	 angularVelocity = 0;
	 orientation = new THREE.Vector3(0, 0, 1);
	 orientationTarget = new THREE.Vector3(0, 0, 1);
	 defaultRotationSimulatorDamping = 0.5;
	 defaultRotationSimulatorMass = 10;
	 rotationSimulator;
	 viewVector;
	 actions;
	 characterCapsule;
  // 每秒60帧
   physicsFrameRate = 60 
	// Ray casting
	 rayResult = new CANNON.RaycastResult();
	 rayHasHit = false;
	 rayCastLength = 0.57;
	 raySafeOffset = 0.03;
	 wantsToJump = false;
	 initJumpSpeed = -1;
	 groundImpactData = new GroundImpactData();
	 raycastBox;
	
	 world;
	 charState;
	 behaviour;
	
	// Vehicles
	 controlledObject;
	 occupyingSeat = null;
	 vehicleEntryInstance = null;
	
  physicsEnabled = true;

  targetPosition = new THREE.Vector3();
  targetDirection = new THREE.Vector3();
	
  constructor(scene, camera, orbitControls, renderer, physics, playerModel, terrainModel, socket) {
    this.scene = scene
    this.camera = camera
    this.orbitControls = orbitControls
    this.renderer = renderer
    this.physics = physics
    this.cannonDebugger = new CannonDebugger(this.scene, this.physics, {})
    this.player = playerModel
    this.terrainModel = terrainModel
    this.socket = socket
    this.currentAction = 'Run'
    this.rotateQuarternion = new THREE.Quaternion()
    this.cameraTarget = new THREE.Vector3()
    this.walkDirection = new THREE.Vector3()
    this.rotateAngle = new THREE.Vector3(0, 1, 0)
    this.storeObj  = Store()
    this.target = new THREE.Vector3()
    this.capsuleBody = null
    this.radius = 3;
    this.theta = 0;
    this.phi = 0;
    //控制方式
    this.stateInt = 0

    this.playerAnimationsState = "idle"
    this.playerAnimationsArr = []
    this.planeArr=[]
    this.toggleRun = true
  
    this.keysPressed = {}
    // start
    // Physics
		// 物理碰撞的角色胶囊
		this.characterCapsule = new CapsuleCollider({
			mass: 1,
      position: new CANNON.Vec3(0, 3, 0),
			height: 0.5,
			radius: 0.25,
			segments: 8, 
			friction: 0.0
		});
    // console.log()
		// capsulePhysics.physical.collisionFilterMask = ~CollisionGroups.Trimesh;
		// 设置能够碰撞的碰撞组
		this.characterCapsule.body.shapes.forEach((shape) => {
			// tslint:disable-next-line: no-bitwise
			shape.collisionFilterMask = ~CollisionGroups.TrimeshColliders;
		});
		// 可以允许休眠
		this.characterCapsule.body.allowSleep = false;

		// Move character to different collision group for raycasting
		// 设置碰撞组
		this.characterCapsule.body.collisionFilterGroup = 2;

		// Disable character rotation
		// 是否禁用角色旋转
		this.characterCapsule.body.fixedRotation = true;
		this.characterCapsule.body.updateMassProperties();

		// Ray cast debug
		const boxGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
		const boxMat = new THREE.MeshLambertMaterial({
			color: 0xff0000
		});
		this.raycastBox = new THREE.Mesh(boxGeo, boxMat);
		this.raycastBox.visible = true;

   
    // end
    this.scene.add(this.raycastBox)
    this.init()
    this.initScenario(this.scene)
    this.initSky()

    // 速度模拟器
		this.velocitySimulator = new VectorSpringSimulator(60, this.defaultVelocitySimulatorMass, this.defaultVelocitySimulatorDamping);
  }
  feetRaycast()
	{
		// Player ray casting
		// Create ray
		let body = this.characterCapsule.body;
    // console.log("body.position.y", body.position.y)
    // return false
		const start = new CANNON.Vec3(body.position.x, body.position.y, body.position.z);
		const end = new CANNON.Vec3(body.position.x, body.position.y - this.rayCastLength - this.raySafeOffset, body.position.z);
		// Raycast options
		const rayCastOptions = {
			collisionFilterMask: CollisionGroups.Default,
			skipBackfaces: true      /* ignore back faces */
		};
		// 在物理世界中找到与射线相交的第一个刚体
		this.rayHasHit = this.physics.raycastClosest(start, end, rayCastOptions, this.rayResult);
	}

  physicsPreStep(body, character)
	{
    // console.log(111)
		character.feetRaycast();

		// Raycast debug
		if (character.rayHasHit)
		{
			// console.log('Raycast hit');
			// console.log(body.position)
			if (character.raycastBox.visible) {
				character.raycastBox.position.x = character.rayResult.hitPointWorld.x;
				character.raycastBox.position.y = character.rayResult.hitPointWorld.y;
				character.raycastBox.position.z = character.rayResult.hitPointWorld.z;
			}
		}
		else
		{
			// console.log('Raycast miss');
			if (character.raycastBox.visible) {
				character.raycastBox.position.set(body.position.x, body.position.y - character.rayCastLength - character.raySafeOffset, body.position.z);
			}
			// console.log('Raycast miss',body.position, character.rayCastLength, character.raySafeOffset);
		}
	}

  physicsPostStep(body, character)
	{
		// console.log('Post step');
		// Get velocities
		// 获取速度
		let simulatedVelocity = new THREE.Vector3(body.velocity.x, body.velocity.y, body.velocity.z);

		// Take local velocity
		// 获取局部速度
		let arcadeVelocity = new THREE.Vector3().copy(character.velocity).multiplyScalar(character.moveSpeed);

		// Turn local into global
		// 将局部速度转换为全局速度
		arcadeVelocity = Utils.appplyVectorMatrixXZ(character.orientation, arcadeVelocity);

		let newVelocity = new THREE.Vector3();

		// Additive velocity mode
		// 附加的速度模式
		if (character.arcadeVelocityIsAdditive)
		{
  
			newVelocity.copy(simulatedVelocity);

			let globalVelocityTarget = Utils.appplyVectorMatrixXZ(character.orientation, character.velocityTarget);

			let add = new THREE.Vector3().copy(arcadeVelocity).multiply(character.arcadeVelocityInfluence);

			if (Math.abs(simulatedVelocity.x) < Math.abs(globalVelocityTarget.x * character.moveSpeed) || Utils.haveDifferentSigns(simulatedVelocity.x, arcadeVelocity.x)) { newVelocity.x += add.x; }
			if (Math.abs(simulatedVelocity.y) < Math.abs(globalVelocityTarget.y * character.moveSpeed) || Utils.haveDifferentSigns(simulatedVelocity.y, arcadeVelocity.y)) { newVelocity.y += add.y; }
			if (Math.abs(simulatedVelocity.z) < Math.abs(globalVelocityTarget.z * character.moveSpeed) || Utils.haveDifferentSigns(simulatedVelocity.z, arcadeVelocity.z)) { newVelocity.z += add.z; }

    }
		else
		{

			newVelocity = new THREE.Vector3(
				THREE.MathUtils.lerp(simulatedVelocity.x, arcadeVelocity.x, character.arcadeVelocityInfluence.x),
				THREE.MathUtils.lerp(simulatedVelocity.y, arcadeVelocity.y, character.arcadeVelocityInfluence.y),
				THREE.MathUtils.lerp(simulatedVelocity.z, arcadeVelocity.z, character.arcadeVelocityInfluence.z),
			);

		}
		// If we're hitting the ground, stick to ground
		// 如果我们碰到地面，就贴着地面
		if (character.rayHasHit)
		{

			// Flatten velocity
			newVelocity.y = 0;

			// Move on top of moving objects
			// 在移动对象的顶部移动
			if (character.rayResult.body.mass > 0)
			{
				let pointVelocity = new CANNON.Vec3();
				character.rayResult.body.getVelocityAtWorldPoint(character.rayResult.hitPointWorld, pointVelocity);
				newVelocity.add(Utils.threeVector(pointVelocity));
			}

			// Measure the normal vector offset from direct "up" vector
			// and transform it into a matrix
			// 测量法线矢量与直接“向上”矢量的偏移量，并将其转换为矩阵
			let up = new THREE.Vector3(0, 1, 0);
			let normal = new THREE.Vector3(character.rayResult.hitNormalWorld.x, character.rayResult.hitNormalWorld.y, character.rayResult.hitNormalWorld.z);
			let q = new THREE.Quaternion().setFromUnitVectors(up, normal);
			let m = new THREE.Matrix4().makeRotationFromQuaternion(q);

			// Rotate the velocity vector
			// 旋转速度矢量
			newVelocity.applyMatrix4(m);

			// Compensate for gravity
			// 补偿重力
			// newVelocity.y -= body.world.physicsWorld.gravity.y / body.character.world.physicsFrameRate;

			// Apply velocity
			// 应用速度
			body.velocity.x = newVelocity.x;
			body.velocity.y = newVelocity.y;
			body.velocity.z = newVelocity.z;

			// Ground character
			body.position.y = character.rayResult.hitPointWorld.y + character.rayCastLength + (newVelocity.y / character.physicsFrameRate);

      // console.log("body.position.y", body.position.y)
    }
		else
		{
			// If we're in air
			body.velocity.x = newVelocity.x;
			body.velocity.y = newVelocity.y;
			body.velocity.z = newVelocity.z;

			// Save last in-air information
			character.groundImpactData.velocity.x = body.velocity.x;
			character.groundImpactData.velocity.y = body.velocity.y;
			character.groundImpactData.velocity.z = body.velocity.z;
		}
		// Jumping
		if (character.wantsToJump)
		{
			// If initJumpSpeed is set
			// 如果设置了初始的跳跃速度
			if (character.initJumpSpeed > -1)
			{
				// Flatten velocity
				body.velocity.y = 0;
				let speed = Math.max(character.velocitySimulator.position.length() * 4, character.initJumpSpeed);
				body.velocity = Utils.cannonVector(character.orientation.clone().multiplyScalar(speed));
			}
			else {
				// Moving objects compensation
				// 移动对象补偿
				let add = new CANNON.Vec3();
				character.rayResult.body.getVelocityAtWorldPoint(character.rayResult.hitPointWorld, add);
				body.velocity.vsub(add, body.velocity);
			}

			// Add positive vertical velocity 
			// 添加正垂直速度
			body.velocity.y += 4;
			// Move above ground by 2x safe offset value
			// 在地面上移动2倍安全偏移值
			body.position.y += character.raySafeOffset * 2;
			// Reset flag
			// 重置想要跳跃标志
			character.wantsToJump = false;
		}
	}

  init() {
    let _this = this
    _this.initPlayer()
    this.scene.add(player)

    _this.setState(this.stateInt)
    _this.socketMessage()
    _this.socketRemovAvatar()
    // _this.initCSS2DRenderer()
    
    window.addEventListener('keydown', (event) => {
      if (event.shiftKey && _this.player) {
          _this.switchRunToggle()
      } else {   
          (_this.keysPressed)[event.key.toLowerCase()] = true
      }
    }, false);
    window.addEventListener('keyup', (event) => {
          (_this.keysPressed)[event.key.toLowerCase()] = false
    }, false);
  }
  
  switchRunToggle () {
    this.toggleRun = !this.toggleRun
  }
  //挂载传入角色与响应动画
  initPlayer() {
    let model = SkeletonUtils.clone(this.player.scene)
    let modelVector3  = new THREE.Vector3(0, 1.0, 0)
    model.scale.set(0.5, 0.5, 0.5)
    model.position.set(0, -0.5, 0)
    const mixer = new THREE.AnimationMixer(model)
    // console.log('this.player.animations', this.player.animations)

    // let walking = mixer.clipAction(this.player.animations[10])
    // let idle = mixer.clipAction(this.player.animations[2])
    // let run = mixer.clipAction(this.player.animations[6])

    // action = {
    //   walking: walking,a
    //   idle: idle,
    //   run: run
    // }
    
    // mixers.push(mixer)
 
    player.name = model.name
    player.add(model)
    player.layers.enableAll();
    // this.create2DObject(model.name,player)
  }
  // create2DObject(name,model, type = 'create'){
  //   const labelDiv = document.createElement( 'div' );
  //   labelDiv.className = 'cl-label';
  //   labelDiv.textContent = name;
  //   labelDiv.style.marginTop = '1em';
  //   const moonLabel = new CSS2DObject( labelDiv );
  //   if(type === 'create') {
  //     moonLabel.position.set( 0, 0.6, 0 );
  //   }else{
  //     moonLabel.position.set( 0, 2.6, 0 );
  //   }

  //   // console.log(model.size())
  //   model.add( moonLabel );
  //   moonLabel.layers.set( 0 );
  // }
  // initCSS2DRenderer(){
  //   labelRenderer = new CSS2DRenderer();
  //   labelRenderer.setSize( window.innerWidth, window.innerHeight );
  //   labelRenderer.domElement.style.position = 'absolute';
  //   labelRenderer.domElement.style.top = '0px';
  //   labelRenderer.domElement.style.color = '#ffffff';
  //   labelRenderer.domElement.style.fontWeight = '700';
  //   document.body.appendChild( labelRenderer.domElement );
  // }

  initScenario(scene) {
    let _this = this
    const boxMateralCon = new CANNON.Material("boxMaterial");
    boxMateralCon.friction = 100
    boxMateralCon.restitution = 1
    let plane = SkeletonUtils.clone(this.terrainModel.scene)
    // plane.position.set(10.8 , -2.2, 8.5)
    plane.traverse(async (child) => {
      if(child.isMesh){
        var attributes = await child.geometry
        if(attributes){
          // let trimeshShape = new CANNON.Trimesh(
          //   attributes.attributes.position.array,
          //   attributes.index.array
          // )
          // let trimeshBody = new CANNON.Body({
          //     mass: 0,
          //     shape: trimeshShape,
          //     material: boxMateralCon,
          //     position: child.position,
          //     rotation: child.rotation,
          //     collisionFilterGroup: GROUP1,
          //     collisionFilterMask:  GROUP2
          // })
          let phys = new TrimeshCollider(child, {});
          _this.physics.addBody(phys.body);
          // _this.physics.addBody(trimeshBody)
        }
      }
    })

    scene.add(plane)
    this.physics.addBody(this.characterCapsule.body)
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
  // 创建天空环境
  initSky() {
      const sky = new Sky()
      sky.scale.setScalar(10000)
      sky.name = "Sky"
      this.scene.add(sky)

      const skyUniforms = sky.material.uniforms;
      skyUniforms['turbidity'].value = 10;
      skyUniforms['rayleigh'].value = 2;
      skyUniforms['mieCoefficient'].value = 0.005;
      skyUniforms['mieDirectionalG'].value = 0.8;
      
      const parameters = {
        elevation: 2,
        azimuth: 180
      };
      // const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      
      let sun = new THREE.Vector3();
      
      function updateSun() {
      
        const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
        const theta = THREE.MathUtils.degToRad(parameters.azimuth);

        sun.setFromSphericalCoords(1, phi, theta);

        sky.material.uniforms['sunPosition'].value.copy(sun);
        // water.material.uniforms[ 'sunDirection' ].value.copy( sun ).normalize();

        // this.scene.environment = pmremGenerator.fromScene( sky ).texture;
      }
      updateSun();
  }

  move(deltaX, deltaY) {
    this.theta -= deltaX * (0.3 / 2);
    this.theta %= 360;
    this.phi += deltaY * (0.24 / 2);
    this.phi = Math.min(85, Math.max(-85, this.phi));
  }

  handleMouseMove(event, deltaX, deltaY) {
    this.move(deltaX, deltaY);
  }

  handleOnmouseWheel(event) {
    if(event.wheelDelta < 0){
      this.radius += 0.1
    }else if(event.wheelDelta > 0){
      this.radius -= 0.1
    }
  }

  setState(state) {
    this.stateInt = state
  }

  socketRemovAvatar() {
    this.socket.on('removAvatar', (user) => {
      let model = this.scene.getObjectByName(user)
      this.scene.remove(model)
    })
  }
  socketMessage() {
    this.socket.on('message', (message) => {

      // let walking
      // let idle
      // let run

      if (message.id) {
        let model = this.scene.getObjectByName(message.id)
        if (model) {
          model.position.set(message.playerPosition.x, message.playerPosition.y, message.playerPosition.z)
          if (message.playerQuaternion) {
            model.quaternion.set(message.playerQuaternion._x,message.playerQuaternion._y,message.playerQuaternion._z,message.playerQuaternion._w)
          }
          // if(this.playerAnimationsArr.length>0){
          //   this.playerAnimationsArr.forEach(item=>{
          //     if(item.name==model.name){
          //       switch (message.state) {
                  // case "idle":
                  //   item.action.run.stop()
                  //   item.action.idle.play()
                  //   break
                  // case "run":
                  //   item.action.idle.stop()
                  //   item.action.run.play()
                  //   break
          //       }
          //     }
          //   })
          // }
        } else {
          let model = SkeletonUtils.clone(this.player.scene)
          model.name = message.id
          // let mixer = new THREE.AnimationMixer(model)
          // walking = mixer.clipAction(this.player.animations[10])
          // idle = mixer.clipAction(this.player.animations[2])
          // run = mixer.clipAction(this.player.animations[6])
          // let obj={
          //   name:message.id,
          //   action : {
          //     walking: walking,
          //     idle: idle,
          //     run: run
          //   }
          // }
          // this.playerAnimationsArr.push(obj)
          // this.create2DObject(message.id, model, 'update')
          this.scene.add(model)
          // mixers.push(mixer)
        }
      }
    });
  }

   updateCameraTarget(moveX, moveZ) {
    // move camera
    this.camera.position.x += moveX
    this.camera.position.z += moveZ
  
    // update camera target
    this.cameraTarget.x = player.position.x
    this.cameraTarget.y = player.position.y + 1
    this.cameraTarget.z = player.position.z
    this.orbitControls.target = this.cameraTarget
  }

  addPhysics(planeGroup) {
    this.physics = new Physics(planeGroup, this.camera, this.scene);
    return this.physics;
  }
  setArcadeVelocityTarget(velZ, velX = 0, velY = 0)
	{
		this.velocityTarget.z = velZ;
		this.velocityTarget.x = velX;
		this.velocityTarget.y = velY;
	}
  springMovement(timeStep)
	{
    console.log("this.velocityTarget=========", this.velocitySimulator)
		// Simulator
		this.velocitySimulator.target.copy(this.velocityTarget);
		// this.velocitySimulator.simulate(timeStep);

		// // Update values
		// this.velocity.copy(this.velocitySimulator.position);
		// this.acceleration.copy(this.velocitySimulator.velocity);
	}

  setPosition(x, y, z)
	{
		if (this.physicsEnabled)
		{
			this.characterCapsule.body.previousPosition = new CANNON.Vec3(x, y, z);
			this.characterCapsule.body.position = new CANNON.Vec3(x, y, z);
			this.characterCapsule.body.interpolatedPosition = new CANNON.Vec3(x, y, z);
		}
		else
		{
			this.position.x = x;
			this.position.y = y;
			this.position.z = z;
		}
	}
  getLocalMovementDirection()
	{
		const positiveX = this.actions.right.isPressed ? -1 : 0;
		const negativeX = this.actions.left.isPressed ? 1 : 0;
		const positiveZ = this.actions.up.isPressed ? 1 : 0;
		const negativeZ = this.actions.down.isPressed ? -1 : 0;

		return new THREE.Vector3(positiveX + negativeX, 0, positiveZ + negativeZ).normalize();
	}
   getCameraRelativeMovementVector()
	{
		const localDirection = this.getLocalMovementDirection();
		const flatViewVector = new THREE.Vector3(this.viewVector.x, 0, this.viewVector.z).normalize();

		return Utils.appplyVectorMatrixXZ(flatViewVector, localDirection);
	}
  setCameraRelativeOrientationTarget()
	{
		// console.log('setCameraRelativeOrientationTarget');
		if (this.vehicleEntryInstance === null)
		{
			let moveVector = this.getCameraRelativeMovementVector();
	
			if (moveVector.x === 0 && moveVector.y === 0 && moveVector.z === 0)
			{
				this.setOrientation(this.orientation);
			}
			else
			{
				this.setOrientation(moveVector);
			}
		}
	}
  setOrientation(vector, instantly = false)
	{
		let lookVector = new THREE.Vector3().copy(vector).setY(0).normalize();
		this.orientationTarget.copy(lookVector);

		// console.log('setOrientation', this.orientationTarget);
		
		if (instantly)
		{
			this.orientation.copy(lookVector);
		}
	}
  update=()=> {
    const delta = clock.getDelta();
    this.physics.step(1 / 60, delta);
    this.characterCapsule.body.preStep = this.physicsPreStep(this.characterCapsule.body, this);
    this.characterCapsule.body.postStep = this.physicsPostStep(this.characterCapsule.body, this);

    // console.log('this.characterCapsule.body.position.y', this.characterCapsule.body.position.y)
    // if(this.characterCapsule.body.position.y < 0){
    //   this.characterCapsule.body.position.y = 1
    // }
    // this.characterCapsule.body.postStep = this.physicsPostStep(this.characterCapsule.body, this);
    if(this.characterCapsule.body.position){
      player.position.copy(this.characterCapsule.body.position)
      // player.quaternion.copy(this.capsuleBody.quaternion)

    }

		if (this.physicsEnabled) this.springMovement(delta);
		// if (this.physicsEnabled) this.springRotation(timeStep);
		// if (this.physicsEnabled) this.rotateModel();
    // 物理世界与threejs世界同步
		if (this.physicsEnabled)
		{
			player.position.set(
				this.characterCapsule.body.interpolatedPosition.x,
				this.characterCapsule.body.interpolatedPosition.y,
				this.characterCapsule.body.interpolatedPosition.z
			);
		}
		else {
			// let newPos = new THREE.Vector3();
			// this.getWorldPosition(newPos);

			// this.characterCapsule.body.position.copy(Utils.cannonVector(newPos));
			// this.characterCapsule.body.interpolatedPosition.copy(Utils.cannonVector(newPos));
		}
 

    this.cannonDebugger.update();
    const directionPressed = DIRECTIONS.some(key => this.keysPressed[key] == true)
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
      console.log("============")
      this.setArcadeVelocityTarget(0.8);
      this.setCameraRelativeOrientationTarget()
      console.log("============")
      // // console.log('player.position.x', player.position.x)
      // // 摄像机方向计算
      // var angleYCameraDirection = Math.atan2(
      //         (this.camera.position.x - player.position.x), 
      //         (this.camera.position.z - player.position.z))
      // // 对角线移动角度偏移
      // directionOffset = this.directionOffset(this.keysPressed, 'back')
      // directionOffseta = this.directionOffset(this.keysPressed, 'front')
      // // rotate model
      // this.rotateQuarternion.setFromAxisAngle(this.rotateAngle, angleYCameraDirection + directionOffset)
      // player.quaternion.rotateTowards(this.rotateQuarternion, 0.2)
      
      // // calculate direction
      // this.camera.getWorldDirection(this.walkDirection)
      // this.walkDirection.y = 0
      // this.walkDirection.normalize()
      // this.walkDirection.applyAxisAngle(this.rotateAngle, directionOffseta)

      // // run/walk velocity
      // const velocity = this.currentAction == 'Run' ? runVelocity : walkVelocity

      // // move model & camera
      // const moveX = this.walkDirection.x * velocity * delta
      // const moveZ = this.walkDirection.z * velocity * delta
      // this.characterCapsule.body.position.x += moveX
      // this.characterCapsule.body.position.z += moveZ
      // this.updateCameraTarget(moveX, moveZ)
  }
    // labelRenderer.render( this.scene, this.camera );
    //动画
    if (mixers) {
      for (const mixer of mixers) mixer.update(delta);
    }
    this.orbitControls.update()
    let obj = {
      playerPosition: player.position,
      playerQuaternion: player.quaternion,
      state: this.playerAnimationsState,
      id: this.player.scene.name,
    }
    this.socket.emit('message', obj);
  }
}
