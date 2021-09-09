define(["dojo/_base/declare", "../widget/Dialog", "dijit/_TemplatedMixin", "dojo/text!./template/searchAnimation.html", "dijit/_WidgetsInTemplateMixin", "dojo/_base/lang", "dojo/store/Memory", "dojo/_base/array", "../form/SearchAnimation", "amagimap/util/animation", "dojo/dom-construct", "dijit/registry", "dojo/dom", "dojo/dom-attr", "dojo/dom-style", "dojo/topic", "dojo/number"],
    function (declare, Dialog, _TemplatedMixin, template, _WidgetsInTemplateMixin, lang, Memory, array, SearchAnimation, layerAnimation, domConstruct, registry, dom, domAttr, domStyle, topic, nbrUtil) {
        // define widget
        return declare([Dialog, _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            animationFeatures: null,
            bins: null,
            animationLayer: null,
            currentBinCenter: null,
            currentBinIndex: 0,
            animationTimeout: null,
            searchLayers: null,
            createAnimation: function () {
                try {
                    // create animation
                    //var steps = { oldest: 16000, youngest: 0, step: 500 };
                    //var animationObj = layerAnimation.aggregateFeatures(layers, steps);
                    var step = this.searchAnimationForm.get("step");
                    if (!step) {
                        alert("Can't get step.");
                        return;
                    }
                    var animationObj = layerAnimation.aggregateFeatures(this.searchLayers, step);
                    this.bins = animationObj.bins;
                    this.animationFeatures = animationObj.features;

                    // make sure there are bins
                    if (this.bins.length === 0) {
                        alert("These searches can't be animated.");
                        return;
                    }

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
                                layer.setVisible(false);
                            }
                        })
                    );

                    // publish animationCreated
                    topic.publish("neotoma/search/animationCreated", this.bins);
                } catch (e) {
                    alert("Error in dialog/SearchAnimation.createAnimation: " + e.message);
                }
            },
            playerClick: function (evt) {
                //alert("name: " + evt.currentTarget.name);
                switch (evt.currentTarget.name) {
                    case "animate.pause":
                        clearTimeout(this.animationTimeout);
                        break;
                    case "animate.stop":
                        clearTimeout(this.animationTimeout);

                        // reset animation
                        this.currentBinIndex = 0;
                        this.currentBinCenter = this.bins[this.currentBinIndex].center;
                        topic.publish("neotoma/search/animationReset");
                        break;
                    case "animate.play":
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

                // make sure animation layer is visible
                if (this.animationLayer) {
                    this.animationLayer.setVisible(true);
                }
            },
            hide: function () {
                this.inherited(arguments);

                // make sure animation layer is hidden and features are removed
                if (this.animationLayer) {
                    this.animationLayer.destroyFeatures();
                    this.animationLayer.setVisible(false);
                }

                // show layers that were hidden for animation
                array.forEach(this.searchLayers,
                    function (layer) {
                        layer.setVisible(true);
                    }
                );
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
                        innerHTML: nbrUtil.format(this.currentBinCenter, {places:0})
                    });
                }
            },
            _setSearchesAttr: function (layerIds) {
                this.searchLayers = [];

                // get search layers
                array.forEach(dojo.config.map.layers,
                    lang.hitch(this,function (layer) {
                        if (layerIds.indexOf(layer.name) !== -1) {
                            this.searchLayers.push(layer);
                        }
                    })
                );

                // create animation layer and bins
                topic.publish("neotoma/search/createAnimation");
            },
            postCreate: function () {
                this.inherited(arguments);

                // listen for createAnimation topics
                topic.subscribe("neotoma/search/createAnimation",
                    lang.hitch(this,function () {
                        this.createAnimation();
                    })
                );
            }
        });
    });
    