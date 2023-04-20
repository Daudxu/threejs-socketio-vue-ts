import * as CANNON from 'cannon-es';
import * as THREE from 'three';
// import * as Utils from '../../core/FunctionLibrary';
import { Object3D } from 'three';
import { threeToCannon, ShapeType  } from 'three-to-cannon';
import * as Utils from '../../utils/FunctionLibrary';
export class TrimeshCollider
{
	mesh;
	options;
	body;
	debugModel;

	constructor(mesh, options)
	{
		this.mesh = mesh.clone();

		let defaults = {
			mass: 0,
			position: mesh.position,
			rotation: mesh.quaternion,
			friction: 0.3
		};
		options = Utils.setDefaults(options, defaults);
		this.options = options;

		let mat = new CANNON.Material('triMat');
		mat.friction = options.friction;
		// mat.restitution = 0.7;

		// let shape = threeToCannon(this.mesh, {type: ShapeType.MESH});
		var attributes =  this.mesh.geometry
	
        if(attributes){
          let shape = new CANNON.Trimesh(
            attributes.attributes.position.array,
            attributes.index.array
          )
		// shape['material'] = mat;

		// Add phys sphere
		let physBox = new CANNON.Body({
			mass: options.mass,
			position: options.position,
			quaternion: options.rotation,
			shape: shape
		});

		physBox.material = mat;
	
		this.body = physBox;
		}

	}
}