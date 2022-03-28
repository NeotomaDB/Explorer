define(["dojo/_base/declare", "neotoma/widget/Dialog", "dijit/_TemplatedMixin", "dojo/text!./template/glacial.html", "dijit/_WidgetsInTemplateMixin", "dojo/_base/lang", "dojo/topic", "dojo/store/Memory", "dojo/_base/array", "dijit/layout/ContentPane", "dijit/form/Button", "dijit/form/HorizontalSlider", "dijit/form/NumberTextBox", "dijit/form/FilteringSelect"],
    function (declare, Dialog, _TemplatedMixin, template, _WidgetsInTemplateMixin, lang, topic, Memory, array) {
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
                // publish topic
                topic.publish("glacial/opacity/new", 100 - val);
            },
            glacialAgeChanged: function (val) {
                if (val === "") {
                    // hide layer
                    this.glacialLayer.setVisible(false);

                } else {
                    // set age on layer and refresh
                    this.glacialLayer.getSource().updateParams({
                      "cql_filter=age": val
                    });

                    this.glacialLayer.getSource().changed();

                    // make sure layer is visible
                    this.glacialLayer.setVisible(true);
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
                            this.glacialLayer.getSource().updateParams({
                              "maxAge": ages.ageOlder
                            });
                            this.glacialLayer.getSource().updateParams({
                              "minAge": ages.ageYounger
                            });
                           
                            this.glacialLayer.getSource().changed();
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
                    this.glacialLayer.setVisible(true);

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
                  this.glacialLayer.setVisible(true);
                }
            },
            hide: function () {
                this.inherited(arguments);

                // hide layer
                this.glacialLayer.setVisible(false);

                // stop animation
                clearTimeout(this.animationTimeout);
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

                this.glacialLayerSource = new ol.source.TileWMS({
                  url: 'https://geo-ub.cei.psu.edu/geoserver/neotoma/wms?',
                  properties: {
                    id: "Glacial"
                  },
                  params: {
                    'SERVICE': 'WMS',
                    'VERSION': '1.1.0',
                    'LAYERS': 'neotoma:icesheets',
                    'TILED': true,
                    'CRS': 'EPSG:3857',
                    'FORMAT': 'image/png',
                  },
                  serverType: 'geoserver'
                });

                this.glacialLayer = new ol.layer.Tile({
                  opacity: 0.9,
                  layer: 'neotoma:icesheets',
                  visible: false,
                  preload: Infinity,
                  source: this.glacialLayerSource
                });

                // add to map
                dojo.config.map.addLayer(this.glacialLayer);

                // listen for layer opacity to change
                topic.subscribe("glacial/opacity/new",
                    lang.hitch(this,function (opacity) {
                        this.glacialLayer.setOpacity(opacity / 100);
                    })
                );

                // populate ages
                this.glacialAge.set("store", new Memory(
                        {
                            idProperty: "age",
                            data: [{ "age": 1000 }, { "age": 2000 }, { "age": 3000 }, { "age": 4000 }, { "age": 5000 }, { "age": 5500 }, { "age": 6000 }, { "age": 6500 }, { "age": 7000 }, { "age": 7200 }, { "age": 7600 }, { "age": 7700 }, { "age": 7800 }, { "age": 8000 }, { "age": 8500 }, { "age": 9000 }, { "age": 9500 }, { "age": 9600 }, { "age": 10000 }, { "age": 10250 }, { "age": 10500 }, { "age": 11000 }, { "age": 11500 }, { "age": 12000 }, { "age": 12500 }, { "age": 13000 }, { "age": 13500 }, { "age": 14000 }, { "age": 14500 }, { "age": 15000 }, { "age": 15500 }, { "age": 16000 }, { "age": 16500 }, { "age": 17000 }, { "age": 17500 }, { "age": 18000 }]
                        }
                    )
                );

                // set allAges
                this.allAges = [];
                array.forEach(this.glacialAge.get("store").data,
                    lang.hitch(this, function (ageObj) {
                        this.allAges.push(ageObj.age);
                    })
                );
           }
        });
});
