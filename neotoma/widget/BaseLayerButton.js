define(["dojo/_base/declare", "dijit/form/ComboButton", "dojo/_base/lang", "dojo/topic", "dojo/_base/array", "dijit/registry", "dojo/dom-style", "dijit/DropDownMenu", "dijit/RadioMenuItem"],
    function (declare, ComboButton, lang, topic, array, registry, domStyle, DropDownMenu, RadioMenuItem) {
        var setBaseLayer = function (name) {
          // get layers, set layer id = name visibile
          dojo.config.map.getLayers().forEach(function (layer) {
            if (layer.get("id") == name) {
              layer.setVisible(true);
              layer.setZIndex(0);
            }
            else if (!(layer instanceof ol.layer.Vector)) {
              layer.setVisible(false);
            }
          });
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
                    name: "osm.standard",
                    group: "map",
                    checked: true,
                    label: "OSM Standard",
                    onChange: function () {
                        setBaseLayer("OSMStandard");
                    }
                }));

                dropDown.addChild(new RadioMenuItem({
                    name: "esri.worldtopo",
                    group: "map",
                    label: "ESRI World Topo",
                    onChange: function () {
                        setBaseLayer("ESRIWorldTopo");
                    }
                }));

                dropDown.addChild(new RadioMenuItem({
                    name: "esri.satellite",
                    group: "map",
                    label: "ESRI Satellite",
                    onChange: function () {
                        setBaseLayer("ESRISatellite");
                    }
                }));

                // add dropdown to combo button
                this.set("dropDown", dropDown);
            }
        });
    });
    