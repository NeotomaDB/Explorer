define(["dojo/_base/declare", "dijit/form/ToggleButton"],
    function (declare, ToggleButton) {
        // define widget
        return declare([ToggleButton], {
            groupName: 'defaultGroup',
            postMixInProperties: function () {
                this.inherited(arguments);
                this.unselectChannel = '/ButtonGroup/' + this.groupName;
                dojo.subscribe(this.unselectChannel, this, 'doUnselect');
            },

            /**
             * Another button was selected. If I am selected, deselect.
             * @param {Object} button The button that was selected.
             */
            doUnselect: function (/*Object*/button) {
                if (button !== this && this.checked) {
                    this.set('checked', false);
                }
            },

            _onClick: function (e) {
                if (this.disabled) {
                    return false;
                }
                if (!this.checked) {
                    this._clicked(); // widget click actions
                    return this.onClick(e); // user click actions
                }
                return false;
            },

            _clicked: function () {
                dojo.publish(this.unselectChannel, [this]);
                this.set('checked', true);
            }
        });
    });