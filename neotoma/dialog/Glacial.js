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
                    this.glacialLayer.setVisibility(false);

                } else {
                    // set map layer's server layer to glacialAge
                    this.glacialLayer.params["layers"] = "glacialAge";

                    // set age on layer and refresh
                    this.glacialLayer.params["age"] = val;
                    this.glacialLayer.redraw(true);

                    // make sure layer is visible
                    this.glacialLayer.setVisibility(true);
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
                            this.glacialLayer.params["layers"] = "glacial";
  
                            // set maxAge and minAge on layer and refresh
                            this.glacialLayer.params["maxAge"] = ages.ageOlder;
                            this.glacialLayer.params["minAge"] = ages.ageYounger;
                            this.glacialLayer.redraw(true);
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
                    this.glacialLayer.setVisibility(true);

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
                    this.glacialLayer.setVisibility(true);
                }
            },
            hide: function () {
                this.inherited(arguments);

                // hide layer
                this.glacialLayer.setVisibility(false);

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

                // create glacial layer
                this.glacialLayer = new OpenLayers.Layer.MapServer("Glacial", "http://ceiwin10.cei.psu.edu/maps?",
	                { map: "../../../maps/neotoma/main.map", layers: "glacial", map_imagetype: "png" },
	                { isBaseLayer: false, singleTile: true, visibility: false, opacity:0.7 }
                );

                // add handlers to show/hide spinner
                this.glacialLayer.events.register("loadstart", null,
                    function () {
                        topic.publish("neotoma/glacial/StartBusy");
                    }
                );
                this.glacialLayer.events.register("loadend", null,
                    function () {
                        topic.publish("neotoma/glacial/StopBusy");
                    }
                );

                // add to map
                dojo.config.map.addLayers([this.glacialLayer]);

                // listen for layer opacity to change
                topic.subscribe("glacial/opacity/new",
                    lang.hitch(this,function (opacity) {
                        this.glacialLayer.setOpacity(opacity / 100);
                    })
                );

                // populate ages
                this.glacialAge.set("store", new Memory(
                        {
                            idProperty: "calAge",
                            data: [{ "calAge": 900 }, { "calAge": 1900 }, { "calAge": 3200 }, { "calAge": 4500 }, { "calAge": 5700 }, { "calAge": 6300 }, { "calAge": 6800 }, { "calAge": 7400 }, { "calAge": 7800 }, { "calAge": 8000 }, { "calAge": 8400 }, { "calAge": 8500 }, { "calAge": 8600 }, { "calAge": 8900 }, { "calAge": 9500 }, { "calAge": 10200 }, { "calAge": 10800 }, { "calAge": 10900 }, { "calAge": 11500 }, { "calAge": 12000 }, { "calAge": 12500 }, { "calAge": 12800 }, { "calAge": 13300 }, { "calAge": 13800 }, { "calAge": 14800 }, { "calAge": 15600 }, { "calAge": 16300 }, { "calAge": 17000 }, { "calAge": 17700 }, { "calAge": 18200 }, { "calAge": 18800 }, { "calAge": 19300 }, { "calAge": 19900 }, { "calAge": 20500 }, { "calAge": 21100 }, { "calAge": 21800 }]
                        }
                    )
                );

                // set allAges
                this.allAges = [];
                array.forEach(this.glacialAge.get("store").data,
                    lang.hitch(this, function (ageObj) {
                        this.allAges.push(ageObj.calAge);
                    })
                );
           }
        });
});