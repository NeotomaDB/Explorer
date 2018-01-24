define(["dojo/_base/declare", "dijit/layout/ContentPane", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin", "dojo/text!./template/showTime.html", "dojo/request/script", "dojo/store/Memory", "dojo/_base/lang", "dojo/topic", "dojo/_base/array", "dojo/dom-style", "dijit/form/Button", "dijit/form/FilteringSelect", "dojox/widget/Standby", "dojox/widget/Toaster", "dijit/form/NumberSpinner"],
    function (declare, ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin, template, script, Memory, lang, topic, array, domStyle) {
        // define widget
        return declare([ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            show: function () {
                this.inherited(arguments);
            },
            hide: function () {
                this.inherited(arguments);
   
            },
            postCreate: function () {
                this.inherited(arguments);
            },
            busy: function (busy) {
                // show busy
                if (this.resultsStandby) {
                    if (busy) {
                        this.resultsStandby.show();
                    } else {
                        this.resultsStandby.hide();
                    }
                }
            },
            showMessage: function (message) {
                var toaster = this.messageToaster;
                toaster.setContent(message, "message");
                toaster.show();
            }
        });
    });