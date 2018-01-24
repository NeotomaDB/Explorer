define(["dojo/_base/declare", "dijit/layout/ContentPane", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin", "dojo/text!./template/searchAnimation.html", "dojo/request/script", "dojo/store/Memory", "dojo/_base/lang", "dojo/topic", "dojo/_base/array", "dojo/dom-style", "dijit/registry", "dojo/dom-attr", "dijit/form/Button", "dijit/form/FilteringSelect", "dojox/widget/Standby", "dojox/widget/Toaster", "dijit/form/NumberSpinner", "neotoma/widget/AnimationSearchesGrid", "dijit/form/HorizontalSlider"],
    function (declare, ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin, template, script, Memory, lang, topic, array, domStyle, registry, domAttr) {
        // define widget
        return declare([ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            _getStepAttr: function () {
                var step = this.step.get("value");
                if (step) {
                    return parseInt(step);
                } else {
                    return null;
                }
            },
            createAnimationClick: function() {
                // get selected searches
                var searchIds = this.allSearches.getIds();
                if (searchIds.length === 0) {
                    alert("Please select at least one search to animate.");
                    return;
                }

                // get corresponding layers
                var layers = [];
                array.forEach(dojo.config.map.layers,
                    function (layer) {
                        if (searchIds.indexOf(layer.name) !== -1) {
                            layers.push(layer);
                        }
                    }
                );

                // create animation layer and bins
                topic.publish("neotoma/search/createAnimation", layers);
            },
            show: function () {
                this.inherited(arguments);

                // get current searches dialog
                var currentSearchesDialog = registry.byId("allSearchResultsForm");
                if (currentSearchesDialog == null) {
                    alert("Can't find Current Searches dialog");
                    return;
                }

                // get store from grid
                var store = currentSearchesDialog.allSearchResults.allSearchesList.get("store");

                // populate grid
                if (store) {
                    this.allSearches.refresh();
                    this.allSearches.renderArray(store.data);
                }
            },
            busy: function (busy) {
                // show busy
                if (this.resultsStandby) {
                    if (busy) {
                        this.resultsStandby.show();
                    } else {
                        this.resultsStandby.hide();
                    }
                }
            },
            showMessage: function (message) {
                var toaster = this.messageToaster;
                toaster.setContent(message, "message");
                toaster.show();
            },
            postCreate: function () {
                this.inherited(arguments);

                // listen for new animations
                topic.subscribe("neotoma/search/animationCreated",
                    lang.hitch(this,function (bins) {
                        var message = bins[0].max + " - " + bins[bins.length - 1].min;
                        domAttr.set("animationAges", "innerHTML", message);

                        // get new config
                        var config = {
                            //minimum: bins[bins.length - 1].min,
                            minimum: bins[bins.length - 1].center,
                            //maximum: bins[0].max,
                            maximum: bins[0].center,
                            //value: bins[bins.length - 1].min,
                            value: bins[bins.length - 1].center,
                            discreetValues: bins.length
                        };

                        // set slider
                        this.agesSlider.set(config);
                    })
                );

                // listen for animation ticks
                topic.subscribe("neotoma/search/animationTick",
                    lang.hitch(this, function (add) {
                        // adjust value to move slider from left to right
                        var newValue = this.agesSlider.get("value") + add;
                        
                        // advance ages slider
                        this.agesSlider.set("value", newValue);
                    })
                );

                // listen for animation reset
                topic.subscribe("neotoma/search/animationReset",
                    lang.hitch(this, function () {
                        // advance ages slider
                        this.agesSlider.set("value", this.agesSlider.get("minimum"));
                    })
                );
            }
        });
    });