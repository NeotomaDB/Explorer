define(["dojo/_base/array", "dojo/has", "dojo/dom", "dojo/dom-attr", "dojo/request/xhr"],
    function (array, has, dom, domAttr, xhr) {
        // module contains methods to save a file and convert from json structures to other formats
        return {
            //removeAllSelectFeatureControls: function (map) {
            //    var classesToRemove = ["olControlSelectFeature"];
                
            //    // remove all selectFeature controls
            //    array.forEach(map.controls,
            //        function (control) {
            //            //console.log("control.name in activateControls: " + control.name);
            //            if (classesToRemove.indexOf(control.displayClass) !== -1) {
            //                map.removeControl(control);
            //            }
            //        }
            //    );
            //},
            //removeSelectFeatureContainerLayers: function (map) {
            //    // get all layers to remove
            //    var layersToRemove = [];
            //    array.forEach(map.layers,
            //        function (layer) {
            //            if (layer.name.indexOf("OpenLayers.Control.SelectFeature_") !== -1) {
            //                // see if it has any layers with null names
            //                var hasNullLayer = array.some(layer.layers,
            //                    function (layer) {
            //                        if (layer.name === null) {
            //                            return true;
            //                        }
            //                    }
            //                );
            //                if (hasNullLayer) {
            //                    layersToRemove.push(layer);
            //                }
                            
            //            }
            //        }
            //    );

            //    // remove all layers in layersToRemove
            //    array.forEach(layersToRemove,
            //       function (layer) {
            //           map.removeLayer(layer);
            //       }
            //   );
            //}
        };
    });