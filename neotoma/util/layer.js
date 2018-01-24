define(["dojo/_base/array", "dojo/has", "dojo/dom", "dojo/dom-attr", "dojo/request/xhr"],
    function (array, has, dom, domAttr, xhr) {
        // module contains methods to save a file and convert from json structures to other formats
        return {
            getStyleMap: function (color) {
                // create styles for features drawn on map
                var symbolizer = {
                    "Point": {
                        pointRadius: 5,
                        graphicName: "circle",
                        fillColor: color || "#FF0000",
                        fillOpacity: 1,
                        strokeWidth: 1,
                        strokeOpacity: 1,
                        strokeColor: color || "#333333"
                    },
                    "Line": {
                        strokeWidth: 3,
                        strokeOpacity: 1,
                        strokeColor: color || "#FF0000"//, // initial #666666
                        //strokeDashstyle: "dash"
                    },
                    "Polygon": {
                        strokeWidth: 2,
                        strokeOpacity: 1,
                        strokeColor: color || "#FF0000", // initial #666666
                        fillColor: "white",
                        fillOpacity: 0.3
                    }
                };

                // create style with rules
                var style = new OpenLayers.Style();
                style.addRules([
                    new OpenLayers.Rule({ symbolizer: symbolizer })
                ]);


                // create selected styles
                var selectedSymbolizer = {
                    "Point": {
                        pointRadius: 6,
                        graphicName: "circle",
                        fillColor: "#FFFF00",
                        fillOpacity: 1,
                        strokeWidth: 1,
                        strokeOpacity: 1,
                        strokeColor: "#FFFF00"
                    },
                    "Line": {
                        strokeWidth: 3,
                        strokeOpacity: 1,
                        strokeColor: "#FFFF00"//,
                        //strokeDashstyle: "dash"
                    },
                    "Polygon": {
                        strokeWidth: 3,
                        strokeOpacity: 1,
                        strokeColor: "#FFFF00",
                        fillColor: "white",
                        fillOpacity: 0
                    }
                };

                // create selected style with ruls
                var selectedStyle = new OpenLayers.Style();
                selectedStyle.addRules([
                    new OpenLayers.Rule({ symbolizer: selectedSymbolizer })
                ]);

                return new OpenLayers.StyleMap({ default: style, temporary: style, select: selectedStyle });
            }
        };
    });