﻿define([],
    function () {
        return {
            getParameterByName: function (name) {
                name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
                var regexS = "[\\?&]" + name + "=([^&#]*)";
                var regex = new RegExp(regexS);
                var results = regex.exec(window.location.search);
                if (results == null)
                    return "";
                else
                    return decodeURIComponent(results[1].replace(/\+/g, " "));
            }
        }; // end of return object
    }
);

