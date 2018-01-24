define(["dojo/_base/declare", "dijit/layout/ContentPane", "dijit/_TemplatedMixin", "dojo/text!./template/tables.html", "dijit/_WidgetsInTemplateMixin"],
    function (declare, ContentPane, _TemplatedMixin, template, _WidgetsInTemplateMixin) {
        // define widget
        return declare([ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template
        });
    });