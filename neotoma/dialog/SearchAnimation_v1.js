define(["dojo/_base/declare", "../widget/Dialog", "dijit/_TemplatedMixin", "dojo/text!./template/searchAnimation.html", "dijit/_WidgetsInTemplateMixin", "dojo/_base/lang", "dojo/store/Memory", "dojo/_base/array", "../form/SearchAnimation", "amagimap/util/animation", "dojo/dom-construct", "dijit/registry", "dojo/dom", "dojo/dom-attr", "dojo/dom-style", "dojo/topic"],
    function (declare, Dialog, _TemplatedMixin, template, _WidgetsInTemplateMixin, lang, Memory, array, SearchAnimation, layerAnimation, domConstruct, registry, dom, domAttr, domStyle, topic) {
        // define widget
        return declare([Dialog, _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            animationFeatures: null,
            bins: null,
            animationLayer: null,
            currentBinCenter: null,
            currentBinIndex: 0,
            animationTimeout: null,
            createAnimation: function (layers) {
                try {
                    // create animation
                    //var steps = { oldest: 16000, youngest: 0, step: 500 };
                    //var animationObj = layerAnimation.aggregateFeatures(layers, steps);
                    var step = this.searchAnimationForm.get("step");
                    if (!step) {
                        alert("Can't get step.");
                        return;
                    }
                    var animationObj = layerAnimation.aggregateFeatures(layers, step);
                    this.bins = animationObj.bins;
                    this.animationFeatures = animationObj.features;

                    // create regular layer for now
                    if (this.animationLayer === null) {
                        this.animationLayer = new OpenLayers.Layer.Vector("Animation 1", { visibility: true, displayInLayerSwitcher: false });
                        dojo.config.map.addLayers([this.animationLayer]);
                    }
                    
                    // create copy of features so can destroy to remove from map
                    var newFeatures = [];
                    var features = array.forEach(this.animationFeatures,
                        function (feature) {
                            newFeatures.push(feature.clone());
                        }
                    );

                    // add features to layer
                    if (this.animationFeatures.length > 0) {
                        this.animationLayer.addFeatures(newFeatures);
                    }

                    // turn off any layers except animation
                    array.forEach(dojo.config.map.layers,
                        lang.hitch(this,function (layer) {
                            if ((!layer.isBaseLayer) && (layer.name !== this.animationLayer.name)) {
                                layer.setVisibility(false);
                            }
                        })
                    );

                    // publis animationCreated
                    topic.publish("neotoma/search/animationCreated", this.bins);

                    //// set initial bin center
                    //this.currentBinCenter = this.bins[this.currentBinIndex].center;

                    //// update map
                    //this.runOnInterval();
                } catch (e) {
                    alert("Error in dialog/SearchAnimation.createAnimation: " + e.message);
                }
            },
            playerClick: function (evt) {
                //alert("name: " + evt.currentTarget.name);
                switch (evt.currentTarget.name) {
                    case "showtime.pause":
                        clearTimeout(this.animationTimeout);
                        break;
                    case "showtime.stop":
                        clearTimeout(this.animationTimeout);
                        break;
                    case "showtime.play":
                        try {
                            // set initial bin center
                            this.currentBinCenter = this.bins[this.currentBinIndex].center;

                            // update map
                            this.runOnInterval();
                        } catch (e) {
                            alert("Error in dialog/SearchAnimation.playerClick.play: " + e.message);
                        }
                        break;
                }
            },
            show: function () {
                this.inherited(arguments);
                this.searchAnimationForm.show();

                // make sure animation layer is visible
                if (this.animationLayer) {
                    this.animationLayer.setVisibility(true);
                }
                
                // make sure div to show age is visible
                var div = dom.byId("ageDiv");
                if (div) {
                    domStyle.set(div, "visibility", "visible");
                }
            },
            hide: function () {
                this.inherited(arguments);

                // make sure animation layer is hidden
                if (this.animationLayer) {
                    this.animationLayer.setVisibility(false);
                }

                // make sure div to show age is hidden
                var div = dom.byId("ageDiv");
                if (div) {
                    domStyle.set(div, "visibility", "hidden");
                }
            },
            runOnInterval: function () {
                // get features in this bin
                var features = array.filter(this.animationFeatures,
                    lang.hitch(this,function (feature) {
                        return feature.attributes.binIds[this.currentBinCenter];
                    })
                );
                
                //update layer
                var thisBin = null;
                this.animationLayer.destroyFeatures();
                if (features.length > 0) {
                    // create cloned features so originals aren't destroyed
                    var newFeatures = [];
                    var features = array.forEach(features,
                        function (feature) {
                            newFeatures.push(feature.clone());
                        }
                    );

                    this.animationLayer.addFeatures(newFeatures);
                    //this.animationLayer.redraw();
                } else {
                    //alert("no features to add");
                }

                // set to next bin or stop
                this.currentBinIndex += 1;

                // get next bin. stop if no bin.
                thisBin = this.bins[this.currentBinIndex];
                if (thisBin) {
                    this.currentBinCenter = thisBin.center;
                    topic.publish("neotoma/search/animationTick", thisBin.max - thisBin.min);
                    // run again if not done
                    this.animationTimeout = setTimeout(lang.hitch(this, this.runOnInterval), 1000);
                } else {
                    this.currentBinIndex = 0; // start at beginning
                    topic.publish("neotoma/search/animationReset");
                }

                // display age
                var node = dom.byId("ageDiv");
                if (node) {
                    domAttr.set(node, {
                        innerHTML: this.currentBinCenter
                    });
                }
            },
            postCreate: function () {
                this.inherited(arguments);

                // add area to display age
                var pane = domConstruct.create("div",
                    {
                        id: "ageDiv",
                        innerHTML: "",
                        "class":"ageDiv"
                    },
                    registry.byId("mapPane").domNode
                );

                // listen for createAnimation topics
                topic.subscribe("neotoma/search/createAnimation",
                    lang.hitch(this,function (layers) {
                        this.createAnimation(layers);
                    })
                );
            }
        });
    });