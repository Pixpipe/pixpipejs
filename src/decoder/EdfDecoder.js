/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link     https://github.com/Pixpipe/pixpipejs
* Lab      MCIN - Montreal Neurological Institute
*/



import { Filter } from '../core/Filter.js';
import { Signal1D } from '../core/Signal1D.js';
import { EdfDecoder as EdfDecoderDep } from 'edfdecoder';

/**
* An instance of EdfDecoder takes an ArrayBuffer as input. This ArrayBuffer must
* come from a edf file (European Data Format). Such file can have multiple signals
* encoded internally, usually from different sensors, this filter will output as
* many Signal1D object as there is signal in the input file. In addition, each
* signal is composed of records (e.g. 1sec per record). This decoder concatenates
* records to output a longer signal. Still, the metadata in each Signal1D tells
* what the is the length of original record.
*
* **Usage**
* - [examples/fileToEDF.html](../examples/fileToEDF.html)
* - [examples/differenceEqSignal1D.html](../examples/differenceEqSignal1D.html)
*
*/
class EdfDecoder extends Filter {

  constructor() {
    super();
    this.addInputValidator(0, ArrayBuffer);
    this.setMetadata("debug", false);
    this.setMetadata("concatenateRecords", true);

  }


  _run(){
    var inputBuffer = this._getInput(0);

    if(!inputBuffer){
      console.warn("EdfDecoder requires an ArrayBuffer as input \"0\". Unable to continue.");
      return;
    }

    var edfDecoder = new EdfDecoderDep();

    edfDecoder.setInput( inputBuffer );
    edfDecoder.decode();
    // an Edf object
    var edf = edfDecoder.getOutput();

    if(! edf ){
      console.warn("Invalid EDF file.");
      return;
    }

    var nbSignals = edf.getNumberOfSignals();
    var nbRecords = edf.getNumberOfRecords();

    for(var i=0; i<nbSignals; i++){
      var sig1D = new Signal1D();
      sig1D.setData( edf.getPhysicalSignalConcatRecords(i) );
      sig1D.setMetadata( "numberOfRecords", nbRecords );
      sig1D.setMetadata( "patientID", edf.getPatientID() );
      sig1D.setMetadata( "recordDuration", edf.getRecordDuration() );
      sig1D.setMetadata( "recordingID", edf.getRecordingID() );
      sig1D.setMetadata( "recordingStartDate", edf.getRecordingStartDate() );
      sig1D.setMetadata( "reservedField", edf.getReservedField() );
      sig1D.setMetadata( "signalLabel", edf.getSignalLabel(i) );
      sig1D.setMetadata( "numberOfSamplesPerRecord", edf.getSignalNumberOfSamplesPerRecord(i) );
      sig1D.setMetadata( "signalPhysicalMax", edf.getSignalPhysicalMax(i) );
      sig1D.setMetadata( "signalPhysicalMin", edf.getSignalPhysicalMin(i) );
      sig1D.setMetadata( "signalPhysicalUnit", edf.getSignalPhysicalUnit(i) );
      sig1D.setMetadata( "signalPrefiltering", edf.getSignalPrefiltering(i) );
      sig1D.setMetadata( "signalTransducerType", edf.getSignalTransducerType(i) );
      // the other metadata have the name of the field in the EDF file but this one is
      // a standard from Signal1D
      sig1D.setMetadata( "samplingFrequency", edf.getSignalSamplingFrequency(i) );

      this._output[i] = sig1D;
    }

  }

} /* END of class EdfDecoder */

export { EdfDecoder }
