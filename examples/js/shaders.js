var shaders = {};


/* ***************** VERTEX SHADER ****************************************** */

shaders.vertex = `
  precision highp float;
  varying  vec2 vUv;
  varying  vec4 worldCoord;

  void main()
  {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
    gl_Position = projectionMatrix * mvPosition;


    worldCoord = modelMatrix * vec4( position, 1.0 );
  }

`


shaders.fragmentMultipleInterpolation = `
  precision highp float;

  // a max number we allow, can be upt to 16
  const int maxNbOfTextures = 16;

  // Number of texture used with this dataset
  // cannot be higher than maxNbOfTextures
  uniform int nbOfTextureUsed;

  // size of the mosaic
  uniform float nbSlicePerRow;
  uniform float nbSlicePerCol;
  // not necessary equal to nbSlicePerRow*nbSlicePerCol because last line
  // is not necessary full
  uniform float nbSliceTotal;

  // space length
  uniform float xspaceLength;
  uniform float yspaceLength;
  uniform float zspaceLength;

  // a texture will contain a certain number of slices
  uniform sampler2D textures[maxNbOfTextures];

  uniform bool trilinearInterpol;


  // Shared with the vertex shader
  varying  vec4 worldCoord;
  varying  vec2 vUv;




  /**
  * Returns accurate MOD when arguments are approximate integers.
  */
  float modI(float a,float b) {
      float m = a - floor( ( a + 0.0001 ) / b) * b;
      return floor( m + 0.0001 );
  }


  // return the color corresponding to the given shifted world cooridinates
  // using a neirest neighbors approx (no interpolation)
  vec4 getIntensityWorldNearest(vec3 swc){
    // step to jump from a slice to another on a unit-sized texture
    float sliceWidth = 1.0 / nbSlicePerRow;
    float sliceHeight = 1.0 / nbSlicePerCol;

    float rounder = 0.001;

    // to be kept
    float indexSliceToDisplay = floor(swc.z + rounder);
    int indexTextureInUse = int(floor(rounder + indexSliceToDisplay / (nbSlicePerRow*nbSlicePerCol)));

    float rowTextureAbsolute = floor( (indexSliceToDisplay + rounder) / nbSlicePerRow);
    float rowTexture = rowTextureAbsolute - (float(indexTextureInUse) * nbSlicePerCol) ;
    float colTexture = modI( indexSliceToDisplay, nbSlicePerRow );
    
    // switch to a center-pixel reference (shift of half a pixel in unit-sized texture)
    float halpPixH = sliceWidth / xspaceLength / 2.0; 
    float halpPixV = sliceHeight / yspaceLength / 2.0;
    
    // avoid being exactely between 2 slices because it can produce unpredictable result (stripes)
    if(mod(swc.x, 0.5) == 0.0){
      swc.x -= rounder;
    }
    
    // avoid being exactely between 2 slices because it can produce unpredictable result (stripes)
    if(mod(swc.y, 0.5) == 0.0){
      swc.y -= rounder;
    }
    
    // the actual textel 2D position of this 3D word coordinate
    vec2 posInTexture = vec2(
      sliceWidth * colTexture + ( swc.x/xspaceLength * sliceWidth) + halpPixH,
      sliceHeight * rowTexture + (1.0 / nbSlicePerCol  - swc.y/yspaceLength * sliceHeight) + halpPixV
    );

    vec4 color;

    // fetching the color in the texture (loops are not allowed)
    if(indexTextureInUse == 0){
      color = texture2D(textures[0], posInTexture);
    }else if(indexTextureInUse == 1){
      color = texture2D(textures[1], posInTexture);
    }else if(indexTextureInUse == 2){
      color = texture2D(textures[2], posInTexture);
    }else if(indexTextureInUse == 3){
      color = texture2D(textures[3], posInTexture);
    }else if(indexTextureInUse == 4){
      color = texture2D(textures[4], posInTexture);
    }else if(indexTextureInUse == 5){
      color = texture2D(textures[5], posInTexture);
    }else if(indexTextureInUse == 6){
      color = texture2D(textures[6], posInTexture);
    }else if(indexTextureInUse == 7){
      color = texture2D(textures[7], posInTexture);
    }else if(indexTextureInUse == 8){
      color = texture2D(textures[8], posInTexture);
    }else if(indexTextureInUse == 9){
      color = texture2D(textures[9], posInTexture);
    }else if(indexTextureInUse == 10){
      color = texture2D(textures[10], posInTexture);
    }else if(indexTextureInUse == 11){
      color = texture2D(textures[11], posInTexture);
    }else if(indexTextureInUse == 12){
      color = texture2D(textures[12], posInTexture);
    }else if(indexTextureInUse == 13){
      color = texture2D(textures[13], posInTexture);
    }else if(indexTextureInUse == 14){
      color = texture2D(textures[14], posInTexture);
    }else if(indexTextureInUse == 15){
      color = texture2D(textures[15], posInTexture);
    }

    return color;
  }


  vec4 getIntensityWorldTrilinear( vec3 swc ){
    // For the sake of readability, let's assume that:
    float xBottom = floor(swc.x + 0.05);
    float yBottom = floor(swc.y + 0.05);
    float zBottom = floor(swc.z + 0.05);

    float xTop = floor(xBottom + 1.05);
    float yTop = floor(yBottom + 1.05);
    float zTop = floor(zBottom + 1.05);

    // making a normalized space out of our coordinates
    float xNorm = swc.x - xBottom;
    float yNorm = swc.y - yBottom;
    float zNorm = swc.z - zBottom;

    // fetching the colors at each corner
    vec4 V000 = getIntensityWorldNearest( vec3(xBottom, yBottom, zBottom) );
    vec4 V100 = getIntensityWorldNearest( vec3(xTop, yBottom, zBottom) );
    vec4 V010 = getIntensityWorldNearest( vec3(xBottom, yTop, zBottom) );
    vec4 V001 = getIntensityWorldNearest( vec3(xBottom, yBottom, zTop) );
    vec4 V101 = getIntensityWorldNearest( vec3(xTop, yBottom, zTop) );
    vec4 V011 = getIntensityWorldNearest( vec3(xBottom, yTop, zTop) );
    vec4 V110 = getIntensityWorldNearest( vec3(xTop, yTop, zBottom) );
    vec4 V111 = getIntensityWorldNearest( vec3(xTop, yTop, zTop) );

    vec4 interpVal = V000 * (1. - xNorm) * (1. - yNorm) * (1. - zNorm) +
                     V100 * xNorm * (1. - yNorm) * (1. - zNorm) +
                     V010 * (1. - xNorm) * yNorm * (1. - zNorm) +
                     V001 * (1. - xNorm) * (1. - yNorm) * zNorm +
                     V101 * xNorm * (1. - yNorm) * zNorm +
                     V011 * (1. - xNorm) * yNorm * zNorm +
                     V110 * xNorm * yNorm * (1. - zNorm) +
                     V111 * xNorm * yNorm * zNorm;

    return interpVal;
  }


  // return true id the shifted world cooridinates (swc) is outside the volume
  // then we can hide what is ouside
  bool isOusideTheVolume( vec3 swc ){
    return swc.x < 0.0 || swc.x > xspaceLength ||
           swc.y < 0.0 || swc.y > yspaceLength ||
           swc.z < 0.0 || swc.z > zspaceLength;
  }


  // return true if the shifted world cooridinates (swc) is just on the internal
  // edge. Then we can display a thin line for edges
  bool isInternalEdge( vec3 swc ){
    float edgeSize = 0.5;

    return swc.x < edgeSize || swc.x > (xspaceLength - edgeSize) ||
           swc.y < edgeSize || swc.y > (yspaceLength - edgeSize) ||
           swc.z < edgeSize || swc.z > (zspaceLength - edgeSize);
  }



  void main( void ) {

    // worldCoord is [0, n], but the box is centered on 0 to make rotation work better
    // so worldCoordShifted is like worldCoord but shifted of half size in each direction
    vec3 worldCoordShifted = vec3( worldCoord.x + xspaceLength/2.0, worldCoord.y + yspaceLength/2.0, worldCoord.z + zspaceLength/2.0);

    // hide the outside
    if( isOusideTheVolume(worldCoordShifted) )
    {
        discard;
        return;
    }


    // color at the edges of the volume
    if( isInternalEdge(worldCoordShifted) )
    {
        gl_FragColor = vec4(0.7, 0.7, 1.0, 1.0);
        return;
    }


    vec4 color;

    if(trilinearInterpol){
      color = getIntensityWorldTrilinear(worldCoordShifted);
    }else{
      color = getIntensityWorldNearest(worldCoordShifted);
    }

    gl_FragColor = color;
  }
`
