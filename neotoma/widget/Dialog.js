define(["dojo/_base/declare", "dijit/Dialog", "dojo/aspect", "dojo/window", "dojo/dom-geometry", "dojo/_base/lang", "dojo/on", "dojo/_base/array", "dojo/dom-style"],
    function (declare, Dialog, aspect, win, domGeometry, lang, on, array, domStyle) {
        return declare([Dialog], {
            _top: null,
            _left: null,
            _topPercent: null,
            _leftPercent: null,
            _initialWidth: null,
            resizeAspect: null,
            stopAspect: false,
            visible: false,
            _endDrag: function () {
                this.inherited(arguments);
                this._top = this._relativePosition.y;
                this._left = this._relativePosition.x;

                // cache percentages for resizing
                var viewPort = win.getBox();
                this._topPercent = parseFloat(this._top / viewPort.h);
                this._leftPercent = parseFloat(this._left / viewPort.w);
            },
            focus: function () { // blocks modal behavior by not calling base focus method

            },
            onFocus: function () {
                this.bringToFront(this);
            },
            bringToFront: function (dialog) {
                try {
                    //console.log(this.titleBar);
                    var thisZIndex = domStyle.get(dialog.domNode, 'zIndex');
                    var topDialog = null;
                    var topZIndex = 0;
                    var aZIndex = null;

                    // find top dialog
                    array.forEach(Dialog._dialogStack,
                        function (obj) {
                            if (obj.dialog !== null) {
                                aZIndex = domStyle.get(obj.dialog.domNode, 'zIndex');
                                //console.log(obj.dialog.title + " z: " + aZIndex);
                                if (aZIndex > topZIndex) {
                                    topDialog = obj.dialog;
                                    topZIndex = aZIndex;
                                }
                            }
                        }
                    );
                    //console.log("top dialog: " + topDialog.title + " z: " + topZIndex);

                    // swap z index
                    if (topDialog.title !== dialog.title) {
                        //console.log(this.title + " z: " + thisZIndex + " " + topDialog.title + " z: " + topZIndex);
                        domStyle.set(topDialog.domNode, 'zIndex', thisZIndex);
                        domStyle.set(dialog.domNode, 'zIndex', topZIndex);
                        //console.log("moved " + this.title + " to z: " + topZIndex + " moved " + topDialog.title + " to z: " + thisZIndex);
                    }
                } catch (e) {
                    alert("error in widget/Dialog.bringToFront: " + e.message);
                }
            },
            bringToFront2: function (dialog) {
                try {
                    //console.log(this.titleBar);
                    var thisZIndex = domStyle.get(dialog, 'zIndex');
                    var topDialog = null;
                    var topZIndex = 0;
                    var aZIndex = null;

                    // find top dialog
                    array.forEach(Dialog._dialogStack,
                        function (obj) {
                            if (obj.dialog !== null) {
                                aZIndex = domStyle.get(obj.dialog.domNode, 'zIndex');
                                //console.log(obj.dialog.title + " z: " + aZIndex);
                                if (aZIndex > topZIndex) {
                                    topDialog = obj.dialog;
                                    topZIndex = aZIndex;
                                }
                            }
                        }
                    );
                    //console.log("top dialog: " + topDialog.title + " z: " + topZIndex);

                    // swap z index
                    if (topDialog.title !== dialog.title) {
                        //console.log(this.title + " z: " + thisZIndex + " " + topDialog.title + " z: " + topZIndex);
                        domStyle.set(topDialog.domNode, 'zIndex', thisZIndex);
                        domStyle.set(dialog.domNode, 'zIndex', topZIndex);
                        //console.log("moved " + this.title + " to z: " + topZIndex + " moved " + topDialog.title + " to z: " + thisZIndex);
                    }
                } catch (e) {
                    alert("error in widget/Dialog.bringToFront2: " + e.message);
                }
            },
            show: function (dontCheck) {
                this.inherited(arguments);
                if (!dontCheck) {
                    if (this.visible) {
                        // reposition
                        this.reposition();
                    }
                }
            },
            onShow: function (evt) {
                this.inherited(arguments);
                this.visible = true;

                // allow aspect to run
                this.stopAspect = false;

                // open at saved position
                if (this._top !== null) {
                    var position = {
                        x: this._left,
                        y: this._top
                    };

                    // set position
                    this._relativePosition = position;
                }

                // save percent position for repositioning later if they aren't set already
                if (this._topPercent === null) {
                    var viewPort = win.getBox();
                    this._topPercent = parseFloat(this._top / viewPort.h);
                    this._leftPercent = parseFloat(this._left / viewPort.w);
                    // cache initial width
                    this._initialWidth = domGeometry.position(this.domNode).w;
                }

                //// set up an aspect for browser resizing
                //var asp = aspect.after(window, "onresize",
                //    lang.hitch(this, this.debounce(function (a, b) {
                //        if (this.stopAspect) {
                //            //this.resizeAspect.remove();
                //            //console.log("this.stopAspect was true");
                //            asp.remove();
                //            return;
                //        }
                //        this.reposition();
                //    })
                //), 200, false); // 200 ms debounce threshold, false to run at end of debounce
            },
            reposition: function () {
                var edgeBuffer = 1; // if dialog is within this may pixels from being partly outside the viewport
                // get the viewport
                var viewPort = win.getBox();

                // get position of dialog
                var dialogPosition = domGeometry.position(this.domNode);

                // add bottom and right to position
                dialogPosition.bottom = parseInt(dialogPosition.y + dialogPosition.h);
                dialogPosition.right = parseInt(dialogPosition.x + dialogPosition.w);

                // see if partly outside viewport
                if (dialogPosition.y >= 0 && dialogPosition.x >= 0 && dialogPosition.bottom <= viewPort.h - edgeBuffer && dialogPosition.right <= viewPort.w - edgeBuffer) {
                    // see if width has changed
                    var diff = this._initialWidth - dialogPosition.w;
                    if (diff > 0) {
                        // calculate new _left and _top
                        var viewPort = win.getBox();
                        this._left = parseInt(this._leftPercent * viewPort.w) - diff;
                        this._top = parseInt(this._topPercent * viewPort.h);

                        // make sure not off right edge
                        var dialogRight = this._left + this._initialWidth;
                        var diff2 = dialogRight - viewPort.w;
                        if (diff2 > 0) {
                            // shift to left
                            this._left -= diff2 - edgeBuffer;
                        }

                        // update percentages
                        this._topPercent = parseFloat(this._top / viewPort.h);
                        this._leftPercent = parseFloat(this._left / viewPort.w);

                        // set position
                        this._relativePosition = {
                            x: this._left,
                            y: this._top
                        };
                    }
                } else {
                    // calculate new _left and _top
                    var viewPort = win.getBox();
                    var diff = this._initialWidth - dialogPosition.w;
                    this._left = parseInt(this._leftPercent * viewPort.w) - diff;
                    this._top = parseInt(this._topPercent * viewPort.h);

                    // make sure not off right edge
                    var dialogRight = this._left + this._initialWidth;
                    var diff2 = dialogRight - viewPort.w;
                    if (diff2 > 0) {
                        // shift to left
                        this._left -= diff2 - edgeBuffer;
                    }

                    // update percentages
                    this._topPercent = parseFloat(this._top / viewPort.h);
                    this._leftPercent = parseFloat(this._left / viewPort.w);

                    // set position
                    this._relativePosition = {
                        x: this._left,
                        y: this._top
                    };

                    // refresh. if was entirely out of viewport was probably going from maximized to normal
                    this.hide();
                    this.show(true);
                }
            },
            onClick: function (evt) {
                this.inherited(arguments);
                //dijit._DialogLevelManager.show(this);
                //console.log("clicked");

            },
            onHide: function (evt) {
                //this.inherited(arguments);
                this.visible = false;
                // stop listening for browser to resize
                //console.log(this.resizeAspect);
                //this.resizeAspect.remove();
                this.stopAspect = true;
            },
            debounce: function (func, threshold, execAsap) {

                var timeout;

                return function debounced() {
                    var obj = this, args = arguments;
                    function delayed() {
                        if (!execAsap)
                            func.apply(obj, args);
                        timeout = null;
                    };

                    if (timeout)
                        clearTimeout(timeout);
                    else if (execAsap)
                        func.apply(obj, args);

                    timeout = setTimeout(delayed, threshold || 100);
                };

            },
            postCreate: function () {
                this.inherited(arguments);

                // listen for clicks on titleBar
                var dlg = this;
                on(this.titleBar, "click",
                    lang.hitch(this, function (evt) {
                        this.bringToFront(dlg);
                    })
                );
            }
        }
        );
    }
);