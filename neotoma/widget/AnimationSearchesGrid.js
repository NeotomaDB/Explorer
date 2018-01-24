define(["dojo/_base/declare", "dgrid/Grid", "dgrid/Selection", "neotoma/widget/_StoreMixin", "dojo/on", "dojo/topic", "dojo/_base/array", "neotoma/app/neotoma"],
    function (declare, Grid, Selection, StoreMixin, on, topic, array, neotoma) {
        return declare([Grid, Selection, StoreMixin], {
            selectionMode: "extended",
            //class: "searchResultsGrid",
            showHeader: false,
            getIds: function () {
                var ids = [];
                for (var index in this.selection) {
                    //ids.push(parseInt(index));
                    ids.push(index);
                }
                return ids;
            },
            columns: [
                { label: 'Name', field: 'name' }
            ],
            postCreate: function () {
                this.inherited(arguments);

                //// handle select event
                //on(this, "dgrid-select",
                //    function (evt) {
                //        array.forEach(evt.rows,
                //         function (row) {
                //             topic.publish("neotoma/searchTable/RowSelected", row);
                //         }
                //     );
                //    }
                //);
            }
        });
    }
);