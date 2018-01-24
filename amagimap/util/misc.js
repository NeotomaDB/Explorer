define([],
    function () {
        return {
            isNumeric: function (value) {
                return !isNaN(parseFloat(value)) && isFinite(value);
            },
            showData: function (obj, showData) {
                var msg = [];
                for (key in obj) {
                    if (showData) {
                        msg.push(key + ": " + obj[key]);
                    } else {
                        msg.push(key);
                    }
                }
                alert(msg.join("\n"));
            }
        }; // end of return object
    }
);

