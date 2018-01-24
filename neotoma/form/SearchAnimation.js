define(["dojo/_base/declare", "dijit/layout/ContentPane", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin", "dojo/text!./template/searchAnimation.html", "dojo/request/script", "dojo/store/Memory", "dojo/_base/lang", "dojo/topic", "dojo/_base/array", "dojo/dom-style", "dijit/registry", "dojo/dom-attr", "dojo/dom", "dojo/number", "dijit/form/Button", "dijit/form/FilteringSelect", "dojox/widget/Standby", "dojox/widget/Toaster", "dijit/form/NumberSpinner", "neotoma/widget/AnimationSearchesGrid", "dijit/form/HorizontalSlider", "dijit/form/HorizontalRuleLabels"],
    function (declare, ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin, template, script, Memory, lang, topic, array, domStyle, registry, domAttr, dom, nbrUtil) {
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
            updateAnimation: function() {
                topic.publish("neotoma/search/createAnimation");
            },
            postCreate: function () {
                this.inherited(arguments);

                // listen for new animations
                topic.subscribe("neotoma/search/animationCreated",
                    lang.hitch(this,function (bins) {
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

                        //// set labels
                        //this.sliderLabels.set("labels", [bins[0].max, bins[bins.length - 1].min]);
                        this.sliderLabels.set("labels", [nbrUtil.format(bins[0].center, {places:0}), nbrUtil.format(bins[bins.length - 1].center, {places:0})]);
                        this.sliderLabels.buildRendering();

                        // set age
                        var node = dom.byId("ageDiv");
                        if (node) {
                            domAttr.set(node, {
                                innerHTML: nbrUtil.format(bins[0].center, {places:0})
                            });
                        }
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

                        // update date
                        try {
                            var node = dom.byId("ageDiv");
                            if (node) {
                                domAttr.set(node, {
                                    innerHTML: nbrUtil.format(this.agesSlider.get("maximum"), {places:0})
                                });
                            }
                        } catch (e) {
                            alert(e.message);
                        }
                        
                    })
                );
            }
        });
    });