/*
* Author    Jonathan Lurie - http://me.jonathanlurie.fr
*
* License   MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


import { Filter } from '../core/Filter.js';
import { Mesh3D } from '../core/Mesh3D.js';
import { Image3DAlt } from '../core/Image3DAlt.js';

/**
* An instance of Mesh3DToVolumetricHullFilter creates a voxel based volume (Image3DAlt)
* of a Mesh3D (input). The hull of the mesh is represnted by voxels in the output.
*
*/
class Mesh3DToVolumetricHullFilter extends Filter {

  constructor(){
    super();
    this.addInputValidator("mesh", Mesh3D);

    // voxel value to use in the void space of the output volume
    this.setMetadata("voidValue", 0);

    // voxel value to use in the voxel representing the hull
    this.setMetadata("hullValue", 254);

    // with a resolutionStep of 1, a distance of 1 in the mesh will be 1 voxel
    // with a resolutionStep of 2, a distance of 1 in the mesh will be 0.5 voxels
    // with a resolutionStep of 0.5, a distance of 2 in the mesh will be 2 voxels.
    // Notice: a mesh can (and will) have floating point vertex position and floating
    // point ray intersection while a volume (Image3DAlt) has only integer voxel indices.
    this.setMetadata("resolutionStep", 1);

    // The margin is the distance around the mesh bouding box to include in the output volume.
    // This distance is in the mesh coordinate, if `resolutionStep` is `0.5` and the margin is `1`
    // then, `2` empty voxel will pad the output volume in every dimension and bound.
    this.setMetadata("margin", 1);
  }


  _run(){
    // the input checking
    if( ! this.hasValidInput()){
      console.warn("A filter of type Mesh3DToVolumetricHullFilter requires 1 input of category 'mesh' of type Mesh3D");
      return;
    }

    var inputMesh = this._getInput("mesh");
    var meshBox = inputMesh.getBox();

    var resolutionStep = this.getMetadata("resolutionStep");
    var resolutionStepInverse = 1. / resolutionStep;
    var margin = this.getMetadata("margin");

    // the original box enlarged by the margin at each end
    var enlargedMeshBox = {
      min: [ Math.floor(meshBox.min[0] - margin), Math.floor(meshBox.min[1] - margin), Math.floor(meshBox.min[2] - margin)],
      max: [ Math.ceil(meshBox.max[0] + margin), Math.ceil(meshBox.max[1] + margin), Math.ceil(meshBox.max[2] + margin)]
    }

    var enlargedBoxSize = {
      x: enlargedMeshBox.max[0] - enlargedMeshBox.min[0],
      y: enlargedMeshBox.max[1] - enlargedMeshBox.min[1],
      z: enlargedMeshBox.max[2] - enlargedMeshBox.min[2]
    }

    /*
    // (Ok, let's not care about that for now)
    // Look what is the smallest side of the box in term of area
    // so that we reduce the number of ray to cast.
    var xy = enlargedBoxSize.x * enlargedBoxSize.y;
    var yz = enlargedBoxSize.y * enlargedBoxSize.z;
    var xz = enlargedBoxSize.x * enlargedBoxSize.z;
    */

    // array of intersections as [ {x, y, z}, {x, y, z}, ...]
    var intersections = [];

    // on XY plane
    var rayDirection = [0, 0, 1];
    for(var x=enlargedMeshBox.min[0]; x<enlargedMeshBox.max[0]; x+=resolutionStep){
      for(var y=enlargedMeshBox.min[1]; y<enlargedMeshBox.max[1]; y+=resolutionStep){
        var rayOrigin = [x, y, 0];
        var intersectionResult = inputMesh.intersectRay( rayOrigin, rayDirection );

        for(var i=0; i<intersectionResult.length; i++){
          intersections.push( intersectionResult[i].intersectionPoint );
        }

      }
    }

    // on YZ plane
    rayDirection = [1, 0, 0];
    for(var y=enlargedMeshBox.min[1]; y<enlargedMeshBox.max[1]; y+=resolutionStep){
      for(var z=enlargedMeshBox.min[2]; z<enlargedMeshBox.max[2]; z+=resolutionStep){
        var rayOrigin = [0, y, z];
        var intersectionResult = inputMesh.intersectRay( rayOrigin, rayDirection );

        for(var i=0; i<intersectionResult.length; i++){
          intersections.push( intersectionResult[i].intersectionPoint );
        }

      }
    }


    // on XZ plane
    rayDirection = [0, 1, 0];
    for(var x=enlargedMeshBox.min[0]; x<enlargedMeshBox.max[0]; x+=resolutionStep){
      for(var z=enlargedMeshBox.min[2]; z<enlargedMeshBox.max[2]; z+=resolutionStep){
        var rayOrigin = [x, 0, z];
        var intersectionResult = inputMesh.intersectRay( rayOrigin, rayDirection );

        for(var i=0; i<intersectionResult.length; i++){
          intersections.push( intersectionResult[i].intersectionPoint );
        }

      }
    }





    var outputImage = new Image3DAlt({
      xSize: enlargedBoxSize.x * resolutionStepInverse,
      ySize: enlargedBoxSize.y * resolutionStepInverse,
      zSize: enlargedBoxSize.z * resolutionStepInverse,
      tSize: 1,
      ncpp: 1
    })

    var voidValue = this.getMetadata("voidValue");
    var hullValue = this.getMetadata("hullValue");
    outputImage.resetData( voidValue )

    // beware, this matrix is expected to be column major but appear on screen like it's a row major
    var v2w = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];

    // beware, this matrix is expected to be column major but appear on screen like it's a row major
    var w2v = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];

    outputImage.addTransformation( v2w, "v2w" );
    outputImage.addTransformation( w2v, "w2v" );

    for(var i=0; i<intersections.length; i++){
      var point = intersections[i];
      var pointVolume = {
        x: (point.x - enlargedMeshBox.min[0]) * resolutionStepInverse,
        y: (point.y - enlargedMeshBox.min[1]) * resolutionStepInverse,
        z: (point.z - enlargedMeshBox.min[2]) * resolutionStepInverse,
      }

      outputImage.setVoxel({i: Math.round(pointVolume.z), j: Math.round(pointVolume.y), k: Math.round(pointVolume.x)}, hullValue);
    }


    console.log( outputImage );
    this._output[0] = outputImage;

  }

} /* END of class Mesh3DToVolumetricHullFilter */

export { Mesh3DToVolumetricHullFilter }
