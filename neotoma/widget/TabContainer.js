define(["dojo/_base/declare", "dijit/layout/TabContainer", "dojo/dom-class", "dojo/has"],
    function (declare, TabContainer, domClass, has) {
        return declare([TabContainer], {
                _showChild: function (/*dijit/_WidgetBase*/ page) {
                    // summary:
                    //		Show the specified child by changing it's CSS, and call _onShow()/onShow() so
                    //		it can do any updates it needs regarding loading href's etc.
                    // returns:
                    //		Promise that fires when page has finished showing, or true if there's no href
                    var children = this.getChildren();
                    page.isFirstChild = (page == children[0]);
                    page.isLastChild = (page == children[children.length - 1]);
                    page._set("selected", true);

                    if (page._wrapper) {	// false if not started yet
                        if (has("ie")) { // use normal classes
                            domClass.replace(page._wrapper, "dijitVisible", "dijitHidden");
                        } else { //  use hacked classes
                            domClass.replace(page._wrapper, "dijitVisibleSWF", "dijitHiddenSWF");
                        }
                    }

                    return (page._onShow && page._onShow()) || true;
                },
                _hideChild: function (/*dijit/_WidgetBase*/ page) {
                    // summary:
                    //		Hide the specified child by changing it's CSS, and call _onHide() so
                    //		it's notified.
                    page._set("selected", false);

                    if (page._wrapper) {	// false if not started yet
                        if (has("ie")) { // use normal classes
                            domClass.replace(page._wrapper, "dijitHidden", "dijitVisible");
                        } else { //  use hacked classes
                            domClass.replace(page._wrapper, "dijitHiddenSWF", "dijitVisibleSWF");
                        }
                        
                    }

                    page.onHide && page.onHide();
                }
            }
        );
    }
);