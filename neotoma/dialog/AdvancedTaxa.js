define(["dojo/_base/declare", "neotoma/widget/Dialog", "dijit/_TemplatedMixin", "dojo/text!./template/advancedTaxa.html", "dijit/_WidgetsInTemplateMixin","dojo/_base/lang", "neotoma/search/AdvancedTaxa", "dijit/layout/ContentPane"],
    function (declare, Dialog, _TemplatedMixin, template, _WidgetsInTemplateMixin, lang) {
        // define widget
        return declare([Dialog,  _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            saveClick: function () {
                try {
                    // save taxon ids to search form
                    var advancedTaxa = this.getChildren()[0];
                    lang.hitch(advancedTaxa, advancedTaxa.saveSelection());
                } catch (e) {
                    alert("Error in saveClick: " + e.message);
                }
            },
            cancelClick: function () {
                try {
                    this.hide();
                } catch (e) {
                    alert("Error in cancelClick: " + e.message);
                }
            }
        });
});