define([
    'dojo/_base/declare',
    'dgrid/_StoreMixin'
], function (declare, _StoreMixin) {
    return declare(_StoreMixin, {
        // summary:
        //      dgrid mixin which implements the refresh method to
        //      always perform a single query with no start or count
        //      specified, to retrieve all relevant results at once.
        //      Appropriate for grids using memory stores with small
        //      result set sizes.

        refresh: function () {
            var self = this;

            // First defer to List#refresh to clear the grid's
            // previous content
            this.inherited(arguments);

            if (!this.store) {
                return;
            }
            return this._trackError(function () {
                var queryOptions = self.get('queryOptions'),
                    results = self.store.query(
                        self.query, queryOptions);

                return self.renderArray(
                    results, null, queryOptions);
            });
        }
    });
});