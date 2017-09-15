/*
 TODO:
 - generate 3D transformation matrix with a given translation + rotation
 - deal with 4x4 matrix
 - compute inverse of 4x4 matrix
 
 here are some links:
 https://www.mathsisfun.com/algebra/matrix-inverse-row-operations-gauss-jordan.html
 http://www.cg.info.hiroshima-cu.ac.jp/~miyazaki/knowledge/teche23.html
 https://evanw.github.io/lightgl.js/docs/matrix.html
 
 here is a C++ implementation of that:
 
 bool gluInvertMatrix(const double m[16], double invOut[16])
{
    double inv[16], det;
    int i;

    inv[0] = m[5]  * m[10] * m[15] - 
             m[5]  * m[11] * m[14] - 
             m[9]  * m[6]  * m[15] + 
             m[9]  * m[7]  * m[14] +
             m[13] * m[6]  * m[11] - 
             m[13] * m[7]  * m[10];

    inv[4] = -m[4]  * m[10] * m[15] + 
              m[4]  * m[11] * m[14] + 
              m[8]  * m[6]  * m[15] - 
              m[8]  * m[7]  * m[14] - 
              m[12] * m[6]  * m[11] + 
              m[12] * m[7]  * m[10];

    inv[8] = m[4]  * m[9] * m[15] - 
             m[4]  * m[11] * m[13] - 
             m[8]  * m[5] * m[15] + 
             m[8]  * m[7] * m[13] + 
             m[12] * m[5] * m[11] - 
             m[12] * m[7] * m[9];

    inv[12] = -m[4]  * m[9] * m[14] + 
               m[4]  * m[10] * m[13] +
               m[8]  * m[5] * m[14] - 
               m[8]  * m[6] * m[13] - 
               m[12] * m[5] * m[10] + 
               m[12] * m[6] * m[9];

    inv[1] = -m[1]  * m[10] * m[15] + 
              m[1]  * m[11] * m[14] + 
              m[9]  * m[2] * m[15] - 
              m[9]  * m[3] * m[14] - 
              m[13] * m[2] * m[11] + 
              m[13] * m[3] * m[10];

    inv[5] = m[0]  * m[10] * m[15] - 
             m[0]  * m[11] * m[14] - 
             m[8]  * m[2] * m[15] + 
             m[8]  * m[3] * m[14] + 
             m[12] * m[2] * m[11] - 
             m[12] * m[3] * m[10];

    inv[9] = -m[0]  * m[9] * m[15] + 
              m[0]  * m[11] * m[13] + 
              m[8]  * m[1] * m[15] - 
              m[8]  * m[3] * m[13] - 
              m[12] * m[1] * m[11] + 
              m[12] * m[3] * m[9];

    inv[13] = m[0]  * m[9] * m[14] - 
              m[0]  * m[10] * m[13] - 
              m[8]  * m[1] * m[14] + 
              m[8]  * m[2] * m[13] + 
              m[12] * m[1] * m[10] - 
              m[12] * m[2] * m[9];

    inv[2] = m[1]  * m[6] * m[15] - 
             m[1]  * m[7] * m[14] - 
             m[5]  * m[2] * m[15] + 
             m[5]  * m[3] * m[14] + 
             m[13] * m[2] * m[7] - 
             m[13] * m[3] * m[6];

    inv[6] = -m[0]  * m[6] * m[15] + 
              m[0]  * m[7] * m[14] + 
              m[4]  * m[2] * m[15] - 
              m[4]  * m[3] * m[14] - 
              m[12] * m[2] * m[7] + 
              m[12] * m[3] * m[6];

    inv[10] = m[0]  * m[5] * m[15] - 
              m[0]  * m[7] * m[13] - 
              m[4]  * m[1] * m[15] + 
              m[4]  * m[3] * m[13] + 
              m[12] * m[1] * m[7] - 
              m[12] * m[3] * m[5];

    inv[14] = -m[0]  * m[5] * m[14] + 
               m[0]  * m[6] * m[13] + 
               m[4]  * m[1] * m[14] - 
               m[4]  * m[2] * m[13] - 
               m[12] * m[1] * m[6] + 
               m[12] * m[2] * m[5];

    inv[3] = -m[1] * m[6] * m[11] + 
              m[1] * m[7] * m[10] + 
              m[5] * m[2] * m[11] - 
              m[5] * m[3] * m[10] - 
              m[9] * m[2] * m[7] + 
              m[9] * m[3] * m[6];

    inv[7] = m[0] * m[6] * m[11] - 
             m[0] * m[7] * m[10] - 
             m[4] * m[2] * m[11] + 
             m[4] * m[3] * m[10] + 
             m[8] * m[2] * m[7] - 
             m[8] * m[3] * m[6];

    inv[11] = -m[0] * m[5] * m[11] + 
               m[0] * m[7] * m[9] + 
               m[4] * m[1] * m[11] - 
               m[4] * m[3] * m[9] - 
               m[8] * m[1] * m[7] + 
               m[8] * m[3] * m[5];

    inv[15] = m[0] * m[5] * m[10] - 
              m[0] * m[6] * m[9] - 
              m[4] * m[1] * m[10] + 
              m[4] * m[2] * m[9] + 
              m[8] * m[1] * m[6] - 
              m[8] * m[2] * m[5];

    det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];

    if (det == 0)
        return false;

    det = 1.0 / det;

    for (i = 0; i < 16; i++)
        invOut[i] = inv[i] * det;

    return true;
}

*/

class Algebra {
  
  /**
  * make a deep copy of a vector or a matrix using serialization+deserialization
  * @param {Array} elem - a matrix or a vector
  * @return {Array} a copy
  */
  static clone( elem ){
    return JSON.parse(JSON.stringify( elem ));
  }
  
  
  /**
  * Compute the determinant of a 2x2 matrix
  * @param {Array} m - a matrix of shape [[x0y0, x1y0],[x0y1, x1y1]]
  * @return {Number} the determinant
  */
  static matrixDet2x2( m ){
    return m[0][0] * m[1][1] - m[0][1] * m[1][0];
  }
  
  
  static matrixDet3x3( m ){
    var d = Algebra.matrixDet2x2;
    return (
      m[0][0] * d([[m[1][1], m[1][2]], [m[2][1], m[2][2]]]) -
      m[1][0] * d([[m[0][1], m[0][2]], [m[2][1], m[2][2]]]) +
      m[2][0] * d([[m[0][1], m[0][2]], [m[1][1], m[1][2]]])
    );
  }
  
  
  
  static matrixTranspose( m ){
    var slowVarySize = m.length;
    var fastVarySize = m[0].length;
    
    var newMat = new Array( fastVarySize );
    
    for(var i=0; i<fastVarySize; i++){
      newMat[i] = new Array( slowVarySize );
      for(var j=0; j<slowVarySize; j++){
        newMat[i][j] = m[j][i]
      }
    }
    
    return newMat;
  }
  
  
  static matrixMultiplyScalar( m, scalar ){
    var slowVarySize = m.length;
    var fastVarySize = m[0].length;
    
    var newMat = new Array( fastVarySize );
    
    for(var i=0; i<slowVarySize; i++){
      newMat[i] = new Array( fastVarySize );
      for(var j=0; j<fastVarySize; j++){
        newMat[i][j] = m[i][j] * scalar;
      }
    }
    return newMat;
  }
  
  
  static matrixInverse2x2( m ){
    var tempMat = [[m[1][1], -m[0][1] ], [ -m[1][0], m[0][0]] ];
    var scalar = 1 / Algebra.matrixDet2x2( m );
    var newMat = Algebra.matrixMultiplyScalar( tempMat, scalar );
    return newMat;
  }
  
  
  /**
  * link: http://www.wikihow.com/Find-the-Inverse-of-a-3x3-Matrix
  */
  static matrixInverse3x3( m ){
    var det = Algebra.matrixDet3x3( m );
    
    if( det == 0){
      console.warn("The matrix has no inverse.");
      return null;
    }

    var adj = Algebra.matrixAdjoint3x3( m );
    var mI = Algebra.matrixMultiplyScalar( adj, 1 / det );
    return mI;
  }
  
  
  static matrixAdjoint3x3( m ){
    var mT = Algebra.matrixTranspose( m );
    var d = Algebra.matrixDet2x2;
    var adj = [
      [ d([[mT[1][1], mT[1][2]], [mT[2][1], mT[2][2]]]),  -1 * d([[mT[1][0], mT[1][2]], [mT[2][0], mT[2][2]]]),    d([[mT[1][0], mT[1][1]], [mT[2][0], mT[2][1]]]) ],
      [ -1 * d([[mT[0][1], mT[0][2]], [mT[2][1], mT[2][2]]]),   d([[mT[0][0], mT[0][2]], [mT[2][0], mT[2][2]]]),   -1 * d([[mT[0][0], mT[0][1]], [mT[2][0], mT[2][1]]]) ],
      [ d([[mT[0][1], mT[0][2]], [mT[1][1], mT[1][2]]]),  -1 * d([[mT[0][0], mT[0][2]], [mT[1][0], mT[1][2]]]),    d([[mT[0][0], mT[0][1]], [mT[1][0], mT[1][1]]]) ],
    ]
    return adj;
  }
  
  
  static matrixVectorMutiply( m, v ){
    var outV = new Array( v.length ).fill(0);    
    var slowVarySize = m.length;
    var fastVarySize = m[0].length;

    for(var i=0; i<slowVarySize; i++){
      for(var j=0; j<fastVarySize; j++){
        outV[i] += v[j] * m[i][j];
      }
    }
    
    return outV;
  }
  
  
  static vectorAdd(v1, v2){
    if( v1.length != v2.length ){
      console.warn("Vector must be the same size to add.");
      return null;
    }
    var vOut = new Array(v1.length);
    
    for(var i=0; i<v1.length; i++){
      vOut[i] = v1[i] + v2[i];
    }
    return vOut;
  }
  
  
  /**
  * Multiply each member to output a new vector
  * @param {Array} v1 - a vector
  * @param {Array} v2 - a vector
  * @return {Array} the output
  */
  static vectorMultiplyMembers(v1, v2){
    if( v1.length != v2.length ){
      console.warn("Vector must be the same size to add.");
      return null;
    }
    var vOut = new Array(v1.length);
    
    for(var i=0; i<v1.length; i++){
      vOut[i] = v1[i] * v2[i];
    }
    return vOut;
  }
  
  static vectorMultiplyScalar( v, s ){
    var vOut = new Array(v.length);
    for(var i=0; i<v.length; i++){
      vOut = v[i] * s;
    }
    return vOut;
  }
  
  
} /* END of class Algebra */

export { Algebra };
