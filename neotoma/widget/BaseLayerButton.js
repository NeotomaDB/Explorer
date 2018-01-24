define(["dojo/_base/declare", "dijit/form/ComboButton", "dojo/_base/lang", "dojo/topic", "dojo/_base/array", "dijit/registry", "dojo/dom-style", "dijit/DropDownMenu", "dijit/RadioMenuItem"],
    function (declare, ComboButton, lang, topic, array, registry, domStyle, DropDownMenu, RadioMenuItem) {
        var setBaseLayer = function (name) {
            var lyrs = dojo.config.map.getLayersByName(name);
            // make sure a layer was found
            if (lyrs.length === 0) {
                alert("No layer named: '" + name + "' was found.");
                return;
            }
            // set new base layer
            dojo.config.map.setBaseLayer(lyrs[0]);
        }


        // define widget
        return declare([ComboButton], {
            //templateString: template,
            postCreate: function () {
                this.inherited(arguments);

                // create drop down
                var dropDown = new DropDownMenu();

                // add menu items to drop down
                dropDown.addChild(new RadioMenuItem({
                    name: "google.terrain",
                    group: "map",
                    checked: true,
                    label: "Google Terrain",
                    onChange: function () {
                        setBaseLayer("Google Terrain");
                    }
                }));

                dropDown.addChild(new RadioMenuItem({
                    name: "google.street",
                    group: "map",
                    label: "Google Streets",
                    onChange: function () {
                        setBaseLayer("Google Streets");
                    }
                }));

                dropDown.addChild(new RadioMenuItem({
                    name: "google.hybrid",
                    group: "map",
                    label: "Google Hybrid",
                    onChange: function () {
                        setBaseLayer("Google Hybrid");
                    }
                }));

                // add dropdown to combo button
                this.set("dropDown", dropDown);
            }
        });
    });