define(["dojo/on", "dojo/_base/lang", "dijit/registry"],
    function (on, lang, registry) {
        return {
            print: function () {
                try {
                    // see whether to print map or table
                    var stack = registry.byId("mapTableStack");
                    switch (stack.selectedChildWidget.get("id")) {
                        case "mapPane":
                            var win = window.open("print.html", "_blank");
                            // hide nav control;
                            dojo.config.map.removeControl(dojo.config.app.navControl);
                            on(win, "load",
                                function () {
                                    win.initPrint("", lang.clone(registry.byId("mapPane")));
                                    //// show nav control;
                                    dojo.config.app.navControl = new OpenLayers.Control.PanZoomBar();
                                    dojo.config.map.addControl(dojo.config.app.navControl);
                                }
                            );
                            break;
                        case "table":
                            // get data from current table
                            if (!searchResultsGrid) {
                                alert("There is no table to print.");
                                return;
                            }

                            // create sort object from grid
                            var sort = { sort: searchResultsGrid.get("_sort") };
                            var data = searchResultsGrid.get("store").query({}, sort);
                            var win = window.open("printTable.html", "_blank");
                            on(win, "load",
                                function () {
                                    win.initPrint("", data);
                                }
                            );
                            break;
                    }
                } catch (e) {
                    alert("error in util/print.print: " + e.message);
                }
            }
        }; // end of return object
    }
);





//function print() {
//    require([],
//        function (on, lang, registry) {
            
//        }
//    );
//}