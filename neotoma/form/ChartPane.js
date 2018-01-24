define(["dojo/_base/declare", "dojo/parser", "dijit/layout/ContentPane", "dijit/_TemplatedMixin", "dojo/text!./template/chartPane.html", "dijit/_WidgetsInTemplateMixin",  "dijit/registry","dojo/domReady!"],
    function (declare, parser, ContentPane, _TemplatedMixin, template, _WidgetsInTemplateMixin, registry) {
        // define widget
        return declare([ContentPane,  _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            resize: function (changeSize, resultSize) {
                this.inherited(arguments);
                // try to resize the chart
                var form = registry.byId("datasetExplorerPopup").datasetExplorer;
                try {
                    if (form._chronologyChart) {
                        // get size
                        if (resultSize) {
                            var w = resultSize.w;
                            var h = resultSize.h;
                        } else {
                            var w = changeSize.w;
                            var h = changeSize.h;
                        }                     
                        form._chronologyChart.resize(w, h);
                    }
                }
                catch (e) {
                    alert("resize error in form/ChartPane: " + e.message);
                }
            }
        });
    });