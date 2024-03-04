// # Cloud mask
function maskL5(col){
        // # Bits 3 and 5 are cloud shadow and cloud, respectively.
        var cloudShadowBitMask = (1 << 3);
        var cloudsBitMask = (1 << 5);

        // # Get the pixel QA band.
       var qa = col.select('QA_PIXEL');

        // # Both flags should be set to zero, indicating clear conditions.
       var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0) 
            .and(qa.bitwiseAnd(cloudsBitMask).eq(0));

        return col.updateMask(mask);
}

// # Visualization parameters
var     vizParams = {
        'bands': ['B4', 'B3', 'B2'],
        'min': 1,
        'max': 65455,
        'gamma': 1.2,
    }

    // # Load the collection
var     col = ee.ImageCollection("LANDSAT/LC08/C02/T1") 
        .map(maskL5) 
        .filterDate('2023-01-01', '2023-12-30') 
        .filterBounds(aoi);

    var col1 = col.mean().clip(aoi);

    // # Image reduction
    var image = col.mean();

// # Calculate TOA spectral radiance
var     ML = 0.0003342
var     AL = 0.10000
var     Oi = 0.29
var     TOA_radiance = image.expression('ML * B10 + AL - Oi', {
        'ML': ML,
        'AL': AL,
        'B10': image.select('B10'),
        'Oi': Oi
    })

// # Convert TOA spectral radiance to brightness temperature
    var K1 = 774.8853
    var  K2 = 1321.0789
    var brightnessTemp = TOA_radiance.expression(
        '(K2 / (log((K1 / L) + 1))) - 273.15', {
            'K1': K1,
            'K2': K2,
            'L': TOA_radiance
        })

   var  clippedbrightnessTemp = brightnessTemp.clip(aoi)
    var BTviz = {
        'min': 2,
        'max': 45,
        'palette': ['#54d220', '#a3ff74', '#fff933', '#ff9d23', '#ff7454', '#f70f0f']
    }

// # Median
var    ndvi = image.normalizedDifference(['B5', 'B4']).rename('NDVI')
var    ndviParams = {'min': -1, 'max': 1, 'palette': ['blue', 'white', 'green']}
var    NDVI_IMAGE = ndvi.clip(aoi)

// # Find the min and max of NDVI
// # Find the min and max of NDVI
var min_val = NDVI_IMAGE.reduceRegion({
  reducer:ee.Reducer.min(),
  geometry: aoi, 
  scale: 30, 
  maxPixels: 1e9}).values().get(0);
var max_val = NDVI_IMAGE.reduceRegion({
  reducer:ee.Reducer.max(),
  geometry: aoi, 
  scale: 30, 
  maxPixels: 1e9}).values().get(0);
var    min_value = ee.Number(min_val)
var    max_value = ee.Number(max_val)

// # Fractional vegetation
var    fv = ndvi.subtract(min_value).divide(max_value.subtract(min_value)).pow(2).rename('FV')
var    FV_IMAGE = fv.clip(aoi)

    // # Emissivity
var    a = 0.004
var    b = 0.986
var    EM = fv.multiply(a).add(b).rename('EMM')

// # Calculate land surface temperature
var    landSurfaceTemp = brightnessTemp.expression(
        '(BT / (1 + (10.60 * BT / 14388) * log(epsilon)))', {
            'BT': brightnessTemp,
            'epsilon': EM.select('EMM')
        })

    // # Clip the land surface temperature image to the geometry
    var clippedLandSurfaceTemp = landSurfaceTemp.clip(aoi)
var min_v = clippedLandSurfaceTemp.reduceRegion({
  reducer:ee.Reducer.min(),
  geometry: aoi, 
  scale: 30, 
  maxPixels: 1e9}).values().get(0);
var max_v = clippedLandSurfaceTemp.reduceRegion({
  reducer:ee.Reducer.max(),
  geometry: aoi, 
  scale: 30, 
  maxPixels: 1e9}).values().get(0);
  
var min_LST = ee.Number(min_v);
var max_LST = ee.Number(max_v);
print('max lst:', max_LST);
print('min lst: ', min_LST);
 var   LSTviz = {
        'min': 2,
        'max': 45,
        'palette': ['#54d220', '#a3ff74', '#fff933', '#ff9d23', '#ff7454', '#f70f0f']
    }
    
    
    
