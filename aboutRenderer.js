$(document).ready(function() {

    document.getElementById('version_number').innerHTML = require('electron').remote.app.getVersion();

});
