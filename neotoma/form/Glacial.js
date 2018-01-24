define(["dojo/_base/declare", "dojo/parser", "dijit/layout/ContentPane", "dijit/_TemplatedMixin", "dojo/text!./template/glacial.html", "dijit/_WidgetsInTemplateMixin", "dojo/_base/lang", "dojo/store/Memory", "dojo/topic", "dijit/form/Button", "dijit/form/CheckBox", "dijit/form/NumberTextBox", "dojox/widget/Standby","dojo/domReady!"],
    function (declare, parser, ContentPane, _TemplatedMixin, template, _WidgetsInTemplateMixin, lang, Memory, topic) {
        // define widget
        return declare([ContentPane,  _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            _getAgesAttr: function () {
                return {
                    ageYounger: this.ageYounger.get("value") || 0,
                    ageOlder: this.ageOlder.get("value") || 20000
                }
            },
            postCreate: function () {
                this.inherited(arguments);
            }
        });
    });