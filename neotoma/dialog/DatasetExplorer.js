define(["dojo/_base/declare", "neotoma/widget/Dialog", "dijit/_TemplatedMixin", "dojo/text!./template/datasetExplorer.html", "dijit/_WidgetsInTemplateMixin","dojo/_base/lang", "dojo/topic", "neotoma/form/DatasetExplorer", "dijit/layout/ContentPane"],
    function (declare, Dialog, _TemplatedMixin, template, _WidgetsInTemplateMixin, lang, topic) {
        // define widget
        return declare([Dialog,  _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            onHide: function(evt) {
                this.inherited(arguments);
                // make sure samples tab is active
                this.datasetExplorer.showSamplesTab();
            },
            postCreate: function () {
                this.inherited(arguments);

                // listen to show dialog
                topic.subscribe("datasetExplorer/show",
                    lang.hitch(this,function () {
                        this.show();
                    })
                );
            }
        });
});