import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
export  function LoadResources(config: any) {
  
  return new Promise((resolve) => {
    const gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("./draco/gltf/");
    dracoLoader.setDecoderConfig({ type: "js" });
    dracoLoader.preload();
    gltfLoader.setDRACOLoader(dracoLoader);
    gltfLoader.load(config.url, gltf => {
      //阴影
      gltf.scene.traverse(function (object: any) {
        if (object.isMesh) object.castShadow = true;
      });
      gltf.scene.name = config.name
      // gltf.scene.rotation.set(0, 0, 0)
      resolve(gltf)
    })
  })
}
