define(["dojo/_base/declare", "neotoma/widget/Dialog", "dijit/_TemplatedMixin", "dojo/text!./template/searchProperties.html", "dijit/_WidgetsInTemplateMixin", "dojo/_base/lang", "neotoma/form/SearchProperties", "dijit/layout/ContentPane"],
    function (declare, Dialog, _TemplatedMixin, template, _WidgetsInTemplateMixin, lang) {
        // define widget
        return declare([Dialog,  _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            saveClick: function (evt) {
                try {
                    var searchProperties = this.getChildren()[0];
                    lang.hitch(searchProperties, searchProperties._actionToolbarClick(evt));
                } catch (e) {
                    alert("Error in saveClick: " + e.message);
                }
            },
            cancelClick: function (evt) {
                try {
                    this.hide();
                    var searchProperties = this.getChildren()[0];
                    lang.hitch(searchProperties, searchProperties._actionToolbarClick(evt));
                } catch (e) {
                    alert("Error in cancelClick: " + e.message);
                }
            }
        });
});