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
                      "cql_filter=calage": val
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
