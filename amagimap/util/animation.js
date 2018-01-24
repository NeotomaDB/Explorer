define(["dojo/_base/lang", "dojo/_base/array"],
    function (lang, array) {
        var animationDatasetTypes = ["vertebrate fauna", "pollen", "insects"];
        var defaultPollenSurfaceSampleAge = -20;

        return {
            createAnimationLayer: function (layers, animName) {
                // create array for all features
                var allFeatures = [];

                // add all features in all layers to featrues array
                array.forEach(layers,
                    function (layer) {
                        array.forEach(layer.features,
                            function (feature) {
                                allFeatures.push(feature.clone());
                            }
                        )
                    }
                );


                //var layer = new OpenLayers.Layer.Vector(animName, { visibility: true, styleMap: styleMapField, displayInLayerSwitcher: false });
                var layer = new OpenLayers.Layer.Vector(animName, { visibility: true, displayInLayerSwitcher: false });
                

                // add features to layer
                if (allFeatures.length > 0) {
                    layer.addFeatures(allFeatures);
                }

                return layer;
            },
            aggregateFeatures_initial: function (layers, steps) {
                // create array for all features
                var allFeatures = [];

                // create bins
                var bins = [];
                var step = steps.step;
                for (var ageCenter = steps.oldest + step; ageCenter > steps.youngest; ageCenter -= step) {
                    bins.push(
                        {
                            center: ageCenter,
                            min: ageCenter - (step / 2),
                            max: ageCenter + (step / 2)
                        }
                   );
                }

                // add all features in all layers to featrues array
                var foundBins = null;
                var atts = null;
                var layerStyle = null;
                array.forEach(layers,
                    function (layer) {
                        // get the style for this layer
                        layerStyle = layer.styleMap.styles.default.defaultStyle;

                        // add each feature in the layer
                        var ageYoungest = null;
                        var ageOldest = null;
                        array.forEach(layer.features,
                            function (feature) {
                                atts = feature.attributes;
                                
                                // find bins for this feature
                                ageYoungest = atts.AgeYoungest || atts.MinAge;
                                ageOldest = atts.AgeOldest || atts.MaxAge;
                                foundBins = array.filter(bins,
                                    function (bin) {
                                        if (!((bin.max < ageYoungest) || (bin.min > ageOldest))) {
                                            return true;
                                        }
                                    }
                                );

                                // see if found bin
                                var newFeature = feature.clone();
                                newFeature.attributes.binIds = {};

                                // set feature style from parent layer
                                newFeature.style = layerStyle;
                                if (foundBins.length === 0) {
                                    //console.log("There were no bins found. There should be one. ageOldest: " + atts.AgeOldest + " ageYoungest: " + atts.AgeYoungest);
                                } else {
                                    /// add each bin center to feature's binIds
                                    array.forEach(foundBins,
                                        function (bin) {
                                            newFeature.attributes.binIds[bin.center] = true;
                                        }
                                    );
                                }
                                
                                // add feature to allFeatures
                                allFeatures.push(newFeature);
                            }
                        )
                    }
                );

                return {
                    bins: bins,
                    features: allFeatures
                };
            },
            aggregateFeatures: function (layers, step) {
                // create array for all features
                var allFeatures = [];

                // get age range from layer features
                var maxAge = null;
                var minAge = null;
                var thisMinAge = null;
                var thisMaxAge = null;
                var skipFeature = false;
                var featuresSkipped = false;
                array.forEach(layers,
                   function (layer) {
                       // get the style for this layer
                       layerStyle = layer.styleMap.styles.default.defaultStyle;

                       // add each feature in the layer
                       var ageYoungest = null;
                       var ageOldest = null;
                       array.forEach(layer.features,
                           function (feature) {
                               atts = feature.attributes;

                               // check ages
                               thisMinAge = atts.AgeYoungest || atts.MinAge;
                               thisMaxAge = atts.AgeOldest || atts.MaxAge;
                               if (thisMinAge == null) {
                                   // see if a pollen surface sample
                                   if (atts.datasets.indexOf("pollen surface sample")) {
                                       thisMinAge = defaultPollenSurfaceSampleAge;
                                   } else {
                                       skipFeature = true;
                                   }
                               }
                               if (thisMaxAge == null) {
                                   // see if a pollen surface sample
                                   if (atts.datasets.indexOf("pollen surface sample")) {
                                       thisMaxAge = defaultPollenSurfaceSampleAge;
                                   } else {
                                       skipFeature = true;
                                   }
                               }

                               if (!skipFeature) {
                                   if (maxAge === null) {
                                       maxAge = thisMaxAge;
                                   } else {
                                       if (thisMaxAge > maxAge) {
                                           maxAge = thisMaxAge;
                                       }
                                   }
                                   if (minAge === null) {
                                       minAge = thisMinAge;
                                   } else {
                                       if (thisMinAge < minAge) {
                                           minAge = thisMinAge;
                                       }
                                   }
                               }
                           }
                       );
                   }
                );

                // create bins
                var bins = [];
                for (var ageCenter = maxAge + step; ageCenter > minAge; ageCenter -= step) {
                    bins.push(
                        {
                            center: ageCenter,
                            min: ageCenter - (step / 2),
                            max: ageCenter + (step / 2)
                        }
                   );
                }

                // add all features in all layers to features array
                var foundBins = null;
                var atts = null;
                var layerStyle = null;
                
                array.forEach(layers,
                    function (layer) {
                        // get the style for this layer
                        layerStyle = layer.styleMap.styles.default.defaultStyle;

                        // add each feature in the layer
                        var ageYoungest = null;
                        var ageOldest = null;
                        array.forEach(layer.features,
                            function (feature) {
                                atts = feature.attributes;

                                // don't skip feature by default
                                skipFeature = false;

                                // get feature ages to find bins
                                ageYoungest = atts.AgeYoungest || atts.MinAge;
                                ageOldest = atts.AgeOldest || atts.MaxAge;
                                if (ageYoungest == null) {
                                    // see if a pollen surface sample
                                    if (atts.datasets.indexOf("pollen surface sample")) {
                                        ageYoungest = defaultPollenSurfaceSampleAge;
                                    } else {
                                        skipFeature = true;
                                    }
                                }
                                if (ageOldest == null) {
                                    // see if a pollen surface sample
                                    if (atts.datasets.indexOf("pollen surface sample")) {
                                        ageOldest = defaultPollenSurfaceSampleAge;
                                    } else {
                                        skipFeature = true;
                                    }
                                }

                                // see if should skip feature
                                if (!skipFeature) {
                                    // find bins for this feature
                                    foundBins = array.filter(bins,
                                        function (bin) {
                                            if (!((bin.max < ageYoungest) || (bin.min > ageOldest))) {
                                                return true;
                                            }
                                        }
                                    );

                                    // see if found bin
                                    var newFeature = feature.clone();
                                    newFeature.attributes.binIds = {};

                                    // set feature style from parent layer
                                    newFeature.style = layerStyle;
                                    if (foundBins.length === 0) {
                                        //console.log("There were no bins found. There should be one. ageOldest: " + atts.AgeOldest + " ageYoungest: " + atts.AgeYoungest);
                                    } else {
                                        /// add each bin center to feature's binIds
                                        array.forEach(foundBins,
                                            function (bin) {
                                                newFeature.attributes.binIds[bin.center] = true;
                                            }
                                        );
                                    }

                                    // add feature to allFeatures
                                    allFeatures.push(newFeature);
                                } else {
                                    featuresSkipped = true;
                                }
                            }
                        );

                        // tell user if any features were removed
                        if (featuresSkipped) {
                            alert("Some datasets have no ages and were removed from the animation.");
                            return;
                        }
                    }
                );

                return {
                    bins: bins,
                    features: allFeatures
                };
            }
        };
    }
);