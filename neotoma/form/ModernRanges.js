define(["dojo/_base/declare", "dojo/parser", "dijit/layout/ContentPane", "dijit/_TemplatedMixin", "dojo/text!./template/modernRanges.html", "dijit/_WidgetsInTemplateMixin", "dojo/_base/lang", "dojo/store/Memory", "dojo/topic", "dijit/form/Button", "dijit/form/CheckBox", "dijit/form/FilteringSelect", "dojox/widget/Standby","dojo/domReady!"],
    function (declare, parser, ContentPane, _TemplatedMixin, template, _WidgetsInTemplateMixin, lang, Memory, topic) {
        // define widget
        return declare([ContentPane,  _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            speciesChanged: function (speciesName) {
                //this.modernRangeStandby.show();
                topic.publish("neotoma/ModernRange/SpeciesChanged", speciesName, this);
            },
            displayChanged: function (display) {
                topic.publish("neotoma/ModernRange/DisplayChanged", display);
            },
            postCreate: function () {
                this.inherited(arguments);
                require(["dojo/text!./resources/data/scinames.txt"],
                    lang.hitch(this,function (speciesData) {
                        try {
                            // populate modern ranges
                            this.species.set("store", new Memory({
                                idProperty: "name",
                                data: JSON.parse(speciesData)
                            }));
                        } catch (e) {
                            alert("Error in form/ModernRanges.postCreate: " + e.message);
                        }
                       
                    }
                ));
            }
        });
    });