define(["dojo/_base/declare", "dijit/layout/ContentPane", "dijit/registry", "neotoma/app/neotoma"],
    function (declare, ContentPane, registry, neotoma) {
        // define widget
        return declare([ContentPane], {
            onShow: function () {
                try {
                    // set to update size
                    if (dojo.config.map != null) {
                        setTimeout(function () { dojo.config.map.updateSize(); }, 30);
                    }

                    // if there is a selected site, show the popup
                    if (dojo.config.map) {
                        // get the select control
                        var controls = dojo.config.map.getControlsBy("name", "selectSite");
                        if (controls.length === 0) {
                            //no search layers yet
                            return;
                        }
                        var control = controls[0];
                        // show popup if there is a feature
                        if (control.handlers.feature.lastFeature) {
                            neotoma.onSiteSelect(control.handlers.feature.lastFeature,true);
                        }
                    }
                } catch (e) {
                    alert("Error in widget/MapPane.onShow: " + e.message);
                }
            }
        });
    });