

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
  
}

export { Algebra };
