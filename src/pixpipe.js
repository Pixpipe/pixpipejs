'use strict'

// defines the type of array to be used by glMatrix. Default would be Float32Array
// but typed arrays cause issue when serialized, this is why we'd rather use regular Array.
import { glMatrix } from 'gl-matrix';
glMatrix.setMatrixArrayType( Array );

// core classes
export { CoreTypes } from './core/CoreTypes.js';
export { PixpipeObject } from './core/PixpipeObject.js';
export { Filter } from './core/Filter.js';
export { Signal1D } from './core/Signal1D.js'
export { Image2D } from './core/Image2D.js';
export { Image3D } from './core/Image3D.js';
export { ImageToImageFilter } from './core/ImageToImageFilter.js';
export { MniVolume } from './core/MniVolume.js';
export { LineString } from './core/LineString.js';
export { Image3DAlt } from './core/Image3DAlt.js';
export { Mesh3D } from './core/Mesh3D.js';

// io - Readers and writers
export { CanvasImageWriter } from './io/CanvasImageWriter.js';
export { UrlImageReader } from './io/UrlImageReader.js';
export { FileImageReader } from './io/FileImageReader.js';
export { FileToArrayBufferReader } from './io/FileToArrayBufferReader.js';
export { UrlToArrayBufferReader } from './io/UrlToArrayBufferReader.js';
export { BrowserDownloadBuffer } from './io/BrowserDownloadBuffer.js';

// decoders
export { Minc2Decoder } from './decoder/Minc2Decoder.js';
export { NiftiDecoder } from './decoder/NiftiDecoder.js';
export { NiftiDecoderAlt } from './decoder/NiftiDecoderAlt.js';
export { PixpEncoder } from './decoder/PixpEncoder.js';
export { PixpDecoder } from './decoder/PixpDecoder.js';
export { Image3DGenericDecoder } from './decoder/Image3DGenericDecoder.js';
export { Image3DGenericDecoderAlt } from './decoder/Image3DGenericDecoderAlt.js';
export { TiffDecoder } from './decoder/TiffDecoder.js';
export { MghDecoder } from './decoder/MghDecoder.js';
export { MghDecoderAlt } from './decoder/MghDecoderAlt.js';
export { EegModDecoder } from './decoder/EegModDecoder.js';
export { PixBinEncoder } from './decoder/PixBinEncoder.js';
export { PixBinDecoder } from './decoder/PixBinDecoder.js';
export { JpegDecoder } from './decoder/JpegDecoder.js';
export { PngDecoder } from './decoder/PngDecoder.js';
export { Image2DGenericDecoder } from './decoder/Image2DGenericDecoder.js';
export { Minc2DecoderAlt } from './decoder/Minc2DecoderAlt.js';
export { MniObjDecoder } from './decoder/MniObjDecoder.js';
export { EdfDecoder } from './decoder/EdfDecoder.js';

// filters - processing of Images2D and Signal1D
export { ComponentProjectionImage2DFilter } from './filter/ComponentProjectionImage2DFilter';
export { ComponentMergeImage2DFilter } from './filter/ComponentMergeImage2DFilter';
export { ForwardFourierSignalFilter, InverseFourierSignalFilter } from './filter/FourierSignalFilters.js';
export { ForwardFourierImageFilter, InverseFourierImageFilter } from './filter/FourierImageFilters.js';
export { ForEachPixelImageFilter } from './filter/ForEachPixelImageFilter.js';
export { SpectralScaleImageFilter } from './filter/SpectralScaleImageFilter.js';
export { ImageBlendExpressionFilter } from './filter/ImageBlendExpressionFilter.js';
export { SpatialConvolutionFilter } from './filter/SpatialConvolutionFilter.js';
export { MultiplyImageFilter } from './filter/MultiplyImageFilter.js';
export { SimpleThresholdFilter } from './filter/SimpleThresholdFilter.js';
export { ImageDerivativeFilter } from './filter/ImageDerivativeFilter.js';
export { GradientImageFilter } from './filter/GradientImageFilter.js';
export { NormalizeImageFilter } from './filter/NormalizeImageFilter.js';
export { ContourImage2DFilter } from './filter/ContourImage2DFilter.js';
export { FloodFillImageFilter } from './filter/FloodFillImageFilter.js';
export { ContourHolesImage2DFilter } from './filter/ContourHolesImage2DFilter.js';
export { ForEachPixelReadOnlyFilter } from './filter/ForEachPixelReadOnlyFilter.js';
export { TerrainRgbToElevationImageFilter } from './filter/TerrainRgbToElevationImageFilter.js';
export { NearestNeighborSparseInterpolationImageFilter } from './filter/NearestNeighborSparseInterpolationImageFilter.js';
export { IDWSparseInterpolationImageFilter } from './filter/IDWSparseInterpolationImageFilter.js';
export { TriangulationSparseInterpolationImageFilter } from './filter/TriangulationSparseInterpolationImageFilter.js';
export { CropImageFilter } from './filter/CropImageFilter.js';
export { SimplifyLineStringFilter } from './filter/SimplifyLineStringFilter.js';
export { PatchImageFilter } from './filter/PatchImageFilter.js';
export { DifferenceEquationSignal1D } from './filter/DifferenceEquationSignal1D.js';
export { LowPassFreqSignal1D } from './filter/LowPassFreqSignal1D.js';
export { LowPassSignal1D } from './filter/LowPassSignal1D.js';
export { HighPassSignal1D } from './filter/HighPassSignal1D.js';
export { BandPassSignal1D } from './filter/BandPassSignal1D.js';

// helpers
export { AngleToHueWheelHelper } from './helper/AngleToHueWheelHelper.js';
export { LineStringPrinterOnImage2DHelper } from './helper/LineStringPrinterOnImage2DHelper.js';
export { Colormap } from './helper/Colormap.js';

// filters - processing of Image3D
export { Image3DToMosaicFilter } from './filter/Image3DToMosaicFilter.js';
export { Image3DToMosaicFilterAlt } from './filter/Image3DToMosaicFilterAlt.js';

// utils
export { Image3DMetadataConverter } from './utils/Image3DMetadataConverter.js';
export { MatrixTricks } from './utils/MatrixTricks.js';
export { FunctionGenerator } from './utils/FunctionGenerator.js';
