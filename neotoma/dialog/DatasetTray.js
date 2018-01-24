define(["dojo/_base/declare", "neotoma/widget/Dialog", "dijit/_TemplatedMixin", "dojo/text!./template/datasetTray.html", "dijit/_WidgetsInTemplateMixin", "dojo/_base/lang", "dojo/dom-construct", "dijit/layout/ContentPane", "dijit/form/Button", "neotoma/form/DatasetTray"],
    function (declare, Dialog, _TemplatedMixin, template, _WidgetsInTemplateMixin, lang, domConstruct) {
        // define widget
        return declare([Dialog,  _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            actionBarClick: function (evt) {
                try {
                    switch (evt.currentTarget.name) {
                        case "removeAll":
                            this.datasetTrayForm.selectedDatasetsGrid.removeAll();
                            break;
                        case "saveAll":
                            this.datasetTrayForm.saveAllDatasets();
                            break;
                        default:
                            alert("Unknown button: '" + evt.currentTarget.name + "'");
                            return;
                            break;
                    }
                } catch (e) {
                    alert("Error in DatasetTray.actionBarClick: " + e.message);
                }
            },
            cancelClick: function () {
                try {
                    this.hide();
                } catch (e) {
                    alert("Error in cancel click: " + e.message);
                }
            }
        });
});