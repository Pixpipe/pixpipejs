
/**
* The FunctionGenerator is a collection of static methods to get samples of
* function output such as gaussian values.
*/
class FunctionGenerator {
  
  
  /**
  * Get the value of the gaussian values given a interval and a sigma (standard deviation).  
  * Note that this gaussian is the one use in a frequency response. If you look
  * for the gaussian as an impulse response, check the method 
  * `gaussianImpulseResponse`.
  * @param {Number} sigma - the standard deviation (or cutoff frequency)
  * @param {Number} begin - the first value on abscisse
  * @param {Number} end - the last value on abscisse (included)
  * @param {Number} onlyAbove - threshold, takes only gaussian values above this value
  * @return {Object} .data: Float32Array - the gaussian data,
  *                  .actualBegin: like begin, except if the onlyAbove is used and the squence would start later
  *                  .actualEnd: like end, except if the onlyAbove is used and the squence would stop earlier
  */
  static gaussianFrequencyResponse( sigma, begin, end, step=1, onlyAbove=0 ){
    var g = [];
    var hasStarted = false;
    var actualBegin = +Infinity;
    var actualEnd = -Infinity;
    
    for(var x=begin; x<=end; x+=step){
      var gx = FunctionGenerator.gaussianFrequencyResponseSingle(sigma, x);
      
      if(gx > onlyAbove){
        if(!hasStarted){
          actualBegin = x;
          hasStarted = true;
        }
        g.push( gx );
        actualEnd = x;
      }else{
        if(hasStarted){
          break;
        }
      }
    }
    
    return {
      data: new Float32Array( g ),
      actualBegin: actualBegin,
      actualEnd: actualEnd
    }
  }
  
  
  /**
  * Get the value of the gaussian given a x and a sigma (standard deviation).  
  * Note that this gaussian is the one use in a frequency response. If you look
  * for the gaussian as an impulse response, check the method 
  * `gaussianImpulseResponseSingle`.
  * @param {Number} sigma - the standard deviation (or cutoff frequency)
  * @param {Number} x - the abscisse
  * @return {Number} the gaussian value at x for the given sigma
  */
  static gaussianFrequencyResponseSingle( sigma, x ){
    return Math.exp( -( (x*x) / (2*sigma*sigma) ) );
  }
  
  
  
} /* END of class FunctionGenerator */

export { FunctionGenerator };
