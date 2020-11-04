define(["dojo/_base/declare", "dgrid/Grid", "dgrid/Selection","neotoma/widget/_StoreMixin","dgrid/extensions/DijitRegistry", "dojo/on", "dojo/topic", "dojo/_base/array","neotoma/app/neotoma"],
    function (declare, Grid, Selection, StoreMixin, DijitRegistry, on, topic, array, neotoma) {
        return declare([Grid, Selection, StoreMixin, DijitRegistry], {
            selectionMode: "extended",
            class: "searchResultsGrid",
            getIds: function () {
                var ids = [];
                for (var key in this.selection) {
                    ids.push(parseInt(key));
                }
                return ids;
            },
            columns: [
                { label: 'Site ID', field: 'siteid' },
                { label: 'Dataset ID', field: 'datasetid' },
                {
                    label: 'Type',
                    field: 'datasettype',
                    formatter: function (value) {
                        // make sure image exists
                        if (dojo.config.app.iconStore.get(value) == null) {
                            alert("There is no icon for this dataset type");
                            return "";
                        }
                        return '<img src="resources/datasetIcons/' + dojo.config.app.iconStore.get(value).image + '" title="' + value + '"></img>';
                    }
                },
                { label: 'Site Name', field: 'sitename' },
                { label: 'Latitude', field: 'latitude' }, // llchange
                { label: 'Longitude', field: 'longitude' }, // llchange
                { label: 'Age Oldest', field: 'ageoldest' },
                { label: 'Age Youngest', field: 'ageyoungest' }
            ],
            postCreate: function() {
                this.inherited(arguments);

                // handle select event
                on(this, "dgrid-select",
                    function (evt) {
                        array.forEach(evt.rows,
                         function (row) {
                             topic.publish("neotoma/searchTable/RowSelected", row);
                         }
                     );
                    }
                );
            }
        });
    }
);