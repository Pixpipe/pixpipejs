/*
* Author    Jonathan Lurie - http://me.jonathanlurie.fr
*
* License   MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { glMatrix, mat2, mat2d, mat3, mat4, quat, vec2, vec3, vec4 } from 'gl-matrix';


/**
* MatrixTricks contains only static functions that add features to glMatrix.
* Like in glMatrix, all the matrices arrays are expected to be column major.
*/
class MatrixTricks{
  
  /**
  * Set a value in the matrix, at a given row/col position
  * @param {Array} matrix - 4x4 matrix in a 1D Array[16] arranged as column-major
  * @param {Number} rowIndex - position in row
  * @param {Number} colIndex - position in column
  * @param {Number} value - value to be set in the matrix
  */
  static setValueMatrix44( matrix, rowIndex, colIndex, value ){
    MatrixTricks.setValueSquareMatrix( matrix, 4, rowIndex, colIndex, value );
  }
  
  
  /**
  * Set a value in the matrix, at a given row/col position
  * @param {Array} matrix - 3x3 matrix in a 1D Array[9] arranged as column-major
  * @param {Number} rowIndex - position in row
  * @param {Number} colIndex - position in column
  * @param {Number} value - value to be set in the matrix
  */
  static setValueMatrix33( matrix, rowIndex, colIndex, value ){
    MatrixTricks.setValueSquareMatrix( matrix, 3, rowIndex, colIndex, value );
  }
  
  
  /**
  * Set a value in the square matrix, at a given row/col position
  * @param {Array} matrix - nxn matrix in a 1D Array[nxn] arranged as column-major
  * @param {Number} sideSize - size of a side, 4 for a 4x4 or 3 for a 3x3 matrix
  * @param {Number} rowIndex - position in row
  * @param {Number} colIndex - position in column
  * @param {Number} value - value to be set in the matrix
  */
  static setValueSquareMatrix( matrix, sideSize, rowIndex, colIndex, value ){
    // since they are column-major: colIndex * height + rowIndex;
    var arrayIndex = colIndex * sideSize + rowIndex;
    matrix[ arrayIndex ] = value;
  }
  
  
  /**
  * Get a value in the matrix, at a given row/col position.
  * @param {Array} matrix - 4x4 matrix in a 1D Array[16] arranged as column-major
  * @param {Number} rowIndex - position in row
  * @param {Number} colIndex - position in column
  * @return {Number} value in the matrix
  */
  static getValueMatrix44( matrix, rowIndex, colIndex){
    return MatrixTricks.getValueSquareMatrix( matrix, 4, rowIndex, colIndex );
  }
  
  
  /**
  * Get a value in the matrix, at a given row/col position.
  * @param {Array} matrix - 3x3 matrix in a 1D Array[9] arranged as column-major
  * @param {Number} rowIndex - position in row
  * @param {Number} colIndex - position in column
  * @return {Number} value in the matrix
  */
  static getValueMatrix33( matrix, rowIndex, colIndex){
    return MatrixTricks.getValueSquareMatrix( matrix, 3, rowIndex, colIndex );
  }
  
  
  /**
  * Get a value in the matrix, at a given row/col position.
  * @param {Array} matrix - nxn matrix in a 1D Array[nxn] arranged as column-major
  * @param {Number} sideSize - size of a side, 4 for a 4x4 or 3 for a 3x3 matrix
  * @param {Number} rowIndex - position in row
  * @param {Number} colIndex - position in column
  * @return {Number} value in the matrix
  */
  static getValueSquareMatrix( matrix, sideSize, rowIndex, colIndex){
    // since they are column-major: colIndex * height + rowIndex;
    var arrayIndex = colIndex * sideSize + rowIndex;
    return matrix[ arrayIndex ];
  }
  
  
  /**
  * Create a new 4x4 matrix that is the horizontal flip of the given one
  * @param {Array} matrix - 4x4 matrix in a 1D Array[16] arranged as column-major
  * @return {Array} the flipped 4x4 matrix in a 1D Array[16] arranged as column-major
  */
  static getHorizontalFlipMatrix44( matrix ){
    return MatrixTricks.getHorizontalFlipSquareMatrix( matrix, 4 );
  }
  
  
  /**
  * Create a new 4x4 matrix that is the horizontal flip of the given one
  * @param {Array} matrix - 4x4 matrix in a 1D Array[16] arranged as column-major
  * @return {Array} the flipped 4x4 matrix in a 1D Array[16] arranged as column-major
  */
  static getHorizontalFlipMatrix33( matrix ){
    return MatrixTricks.getHorizontalFlipSquareMatrix( matrix, 3 );
  }
  
  
  /**
  * Create a new 4x4 matrix that is the horizontal flip of the given one
  * @param {Array} matrix - nxn matrix in a 1D Array[nxn] arranged as column-major
  * @return {Array} the flipped nxn matrix in a 1D Array[nxn] arranged as column-major
  */
  static getHorizontalFlipSquareMatrix( matrix, sideSize ){
    var flippedMat = new Array(sideSize*sideSize).fill(0);
    for(var r=0; r<sideSize; r++){
      for(var c=0; c<sideSize; c++){
        var value = MatrixTricks.getValueSquareMatrix( matrix, sideSize, r, c );
        MatrixTricks.setValueSquareMatrix( flippedMat, sideSize, r, sideSize-1-c, value );
      }
    }
    return flippedMat;
  }
  
  
  /**
  * Expand a 3x3 matrix into a 4x4 matrix. Does not alter the input.
  * @param {Array} matrix - 3x3 matrix in a 1D Array[9] arranged as column-major
  * @param {String} horizontalStick - "LEFT" to stick the 3x3 matrix at the left of the 4x4, "RIGHT" to stick to the right
  * @param {String} verticalStick - "TOP" to stick the 3x3 matrix at the top of the 4x4, "BOTTOM" to stick to the bottom  
  * @return {Array} the flipped 4x4 matrix in a 1D Array[16] arranged as column-major
  */
  static getExpandedMatrix3x3To4x4( matrix, horizontalStick="LEFT", verticalStick="TOP" ){
    var colOffset = (horizontalStick === "RIGHT" ? 1 : 0);
    var rowOffset = (verticalStick === "BOTTOM" ? 1 : 0);
    var expandedMat = new Array(16).fill(0);
    
    for(var r=0; r<3; r++){
      for(var c=0; c<3; c++){
        var value = MatrixTricks.getValueMatrix33( matrix, r, c );
        MatrixTricks.setValueMatrix44( expandedMat, rowOffset + r, colOffset + c, value );
      }
    }
    return expandedMat;
  }
  
  
} /* END of class MatrixTricks */

export { MatrixTricks };
