define(["dojo/_base/declare", "neotoma/widget/Dialog", "dijit/_TemplatedMixin", "dojo/text!./template/glacial.html", "dijit/_WidgetsInTemplateMixin", "dojo/_base/lang", "dojo/topic", "dojo/request/xhr", "dojo/_base/config", "dojo/store/Memory", "dojo/_base/array", "dijit/layout/ContentPane", "dijit/form/Button", "dijit/form/HorizontalSlider", "dijit/form/NumberTextBox", "dijit/form/FilteringSelect"],
function (declare, Dialog, _TemplatedMixin, template, _WidgetsInTemplateMixin, lang, topic, xhr, config, Memory, array,) {
        // define function for when ice range loads
        var iceRangeLoaded = function (response) {
            // if ice range layer already exists, remove it
            dojo.config.map.getLayers().forEach(function (layer) {
                if (layer.get("id") == "Glacial") {
                    layer.getSource().clear();
                    dojo.config.map.removeLayer(layer);
                }
            });
            // then load/format new ice range
            try {
                // first, extract geom in well known text (wkt) format
                var wkt = response.data.geom.slice(10);
                // definte wkt and geojson formaters
                var wktFormat = new ol.format.WKT();
                var geoJSONFormat = new ol.format.GeoJSON();
                // read geom
                var geom = wktFormat.readFeature(wkt);
                // write geojson
                var geoJSON = geoJSONFormat.writeFeatureObject(geom);
                // integrate properties object with age field
                geoJSON.properties = {};
                geoJSON.properties.age = response.data.age;
                // define range features
                var features = geoJSONFormat.readFeatures(geoJSON, {
                    dataProjection: 'EPSG:4326',
                    featureProjection: dojo.config.map.getView().getProjection()
                });

                // define vector source and style
                var glacialLayerSource = new ol.source.Vector({});
                // define layer style
                var iceRangeStyle = new ol.style.Style({
                    stroke: new ol.style.Stroke({
                    color: 'rgb(82, 82, 82)',
                    width: 1
                    }),
                    fill: new ol.style.Fill({
                    color: 'rgb(189, 189, 189)'
                    })
                });
                // get opacity value from slider
                var opacity = dijit.byId("transparency").get("value");

                // define layer, add it to map, populate with features
                var glacialLayer = new ol.layer.Vector({
                    source: glacialLayerSource,
                    style: iceRangeStyle,
                    opacity: opacity / 100,
                    properties: {
                        id: "Glacial"
                    }
                });
                dojo.config.map.addLayer(glacialLayer);
                glacialLayerSource.addFeatures(features);

            } catch (e) {
                alert("Error: " + e.message);
            }
        };
        // define widget    
        return declare([Dialog,  _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            glacialLayer: null,
            animationTimeout: null,
            allAges: null,
            playAges: null,
            ageIndex: 0,
            playDirection: "forward",
            sliderChanged: function(val) {
                // update opacity of layer on slider change
                dojo.config.map.getLayers().forEach(function (layer) {
                    if (layer.get("id") == "Glacial") {
                        layer.setOpacity(val / 100);
                    }
                });
            },
            glacialAgeChanged: function (val) {
                if (val === "") {
                    // hide layer
                    dojo.config.map.getLayers().forEach(function (layer) {
                        if (layer.get("id") == "Glacial") {
                            layer.setVisible(false);
                        }
                    }); 
                } else {
                    // get ice range data then load on map
                    xhr.get(config.iceRangesEndPoint + val, {
                        handleAs: "json",
                        headers: {
                            'content-type': 'application/json'
                        }, 
                    }).then(iceRangeLoaded);
                }
            },
            actionBarClick: function (evt) {
                try {
                    switch (evt.currentTarget.name) {
                        case "refresh":
                            // get ages
                            var ages = {
                                ageYounger: this.ageYounger.get("value") || 0,
                                ageOlder: this.ageOlder.get("value") || 20000
                            };

                            // set map layer's server layer to glacial
                            // set age on layer and refresh
                            xhr.get(config.iceRangesEndPoint + ages.ageOlder, {
                                handleAs: "json",
                                headers: {
                                    'content-type': 'application/json'
                                }, 
                            }).then(iceRangeLoaded);

                            xhr.get(config.iceRangesEndPoint + ages.ageYounger, {
                                handleAs: "json",
                                headers: {
                                    'content-type': 'application/json'
                                }, 
                            }).then(iceRangeLoaded);
                            break;
                        case "reverse":
                            // set ages to play
                            this.playAges = JSON.parse(JSON.stringify(this.allAges));

                            // set index for current age
                            this.ageIndex = this.playAges.indexOf(parseInt(this.glacialAge.get("value")));
                            
                            // start playing
                            this.playDirection = "reverse";
                            this.advanceAnimation();
                            break;
                        case "forward":
                            // reverse ages to play
                            this.playAges = JSON.parse(JSON.stringify(this.allAges));
                            this.playAges.reverse();

                            // set index for current age;
                            this.ageIndex = this.playAges.indexOf(parseInt(this.glacialAge.get("value")));

                            // start playing
                            this.playDirection = "forward";
                            this.advanceAnimation();
                            break;
                        case "pause":
                            // pause animation
                            clearTimeout(this.animationTimeout);
                            break;
                        default:
                            alert("Unknown button: '" + evt.currentTarget.name + "'");
                            return;
                            break;
                    }
                } catch (e) {
                    alert("Error in DatasetTray.actionBarClick: " + e.message);
                }
            },
            advanceAnimation: function () {
                try {
                    // make sure visible
                    dojo.config.map.getLayers().forEach(function (layer) {
                        if (layer.get("id") == "Glacial") {
                            layer.setVisible(true);
                        }
                    });

                    // see if done
                    if (this.ageIndex === this.playAges.length) {
                        // at end
                        this.ageIndex = 0;
                    } else {
                        // show age
                        //console.log("ageIndex: " + this.ageIndex + " age: " + this.playAges[this.ageIndex]);
                        this.glacialAge.set("value", this.playAges[this.ageIndex]);

                        // advance index
                        this.ageIndex += 1;

                        // run again
                        this.animationTimeout = setTimeout(lang.hitch(this, this.advanceAnimation), 1500);
                    }
                } catch(e) {
                    alert("Error in dialog/Glacial.advanceAnimation: " + e.message);
                }
            },
            show: function() {
                this.inherited(arguments);
                if (this.playAges !== null) {
                    dojo.config.map.getLayers().forEach(function (layer) {
                        if (layer.get("id") == "Glacial") {
                            layer.setVisible(true);
                        }
                    });
                }
            },
            hide: function () {
                this.inherited(arguments);

                // hide layer
                dojo.config.map.getLayers().forEach(function (layer) {
                    if (layer.get("id") == "Glacial") {
                        layer.setVisible(false);
                    }
                }); 

                // stop animation
                clearTimeout(this.animationTimeout);

                // clear calage value
                document.getElementById("calage").value = "";
            },
            postCreate: function () {
                this.inherited(arguments);

                // set standby's target
                //this.glacialLayerStandby.set("target", this.domNode);

                // listen for show busy topic
                topic.subscribe("neotoma/glacial/StartBusy",
                    lang.hitch(this, function () {
                        // hide spinner
                        try {
                            //this.glacialLayerStandby.show();
                        } catch (e) {
                            alert("error in form/Glacial StartBusy: " + e.message);
                        }
                    })
                );

                // listen for hide busy topic
                topic.subscribe("neotoma/glacial/StopBusy", lang.hitch(this, function () {
                    // hide spinner
                    try {
                        //this.glacialLayerStandby.hide();
                    } catch (e) {
                        alert("error in form/Glacial StopBusy: " + e.message);
                    }
                }));

                // populate ages
                this.glacialAge.set("store", new Memory(
                        {
                            idProperty: "calage",
                            data: [{ "calage": 910 }, { "calage": 2000 }, { "calage": 3200 }, { "calage": 4500 }, { "calage": 5710 }, { "calage": 6300 }, { "calage": 6800 }, { "calage": 7300 }, { "calage": 7900 }, { "calage": 8100 }, { "calage": 8500 }, { "calage": 8700 }, { "calage": 8800 }, { "calage": 9000 }, { "calage": 9600 }, { "calage": 10300 }, { "calage": 10900 }, { "calage": 11000 }, { "calage": 11500 }, { "calage": 11800 }, { "calage": 12100 }, { "calage": 12800 }, { "calage": 13500 }, { "calage": 14200 }, { "calage": 14900 }, { "calage": 15500 }, { "calage": 16100 }, { "calage": 16800 }, { "calage": 17400 }, { "calage": 18000 }, { "calage": 18700 }, { "calage": 19300 }, { "calage": 19500 }, { "calage": 20500 }, { "calage": 21100 }, { "calage": 22100 }]
                        }
                    )
                );

                // set allAges
                this.allAges = [];
                array.forEach(this.glacialAge.get("store").data,
                    lang.hitch(this, function (ageObj) {
                        this.allAges.push(ageObj.calage);
                    })
                );
           }
        });
});
