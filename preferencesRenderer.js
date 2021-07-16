/*jshint esversion: 6 */

/* This is the javascript rederer code for the preferences popup
 * The html file is preference.html
 * The look and feel is slightly different on first load that
 * when selected from the menu as on first load preferences must be supplied
 *  */

const electron = require('electron');
const {ipcRenderer} = electron;
const dialog = require('electron').remote.dialog;

var PRF = (function() {
  "use strict";

  //listeners
  ipcRenderer.on('showPreferences', function(event, data) {
    populatePreferences(data);
  });

  //private functions
  var getPreferences, validateData, savePreferences, populatePreferences, selectPath;

  $(document).ready(function() {
    //add event handlers
    $('#save-btn').on('click', function() {
      savePreferences();
    });

    $('#cancel-btn').on('click', function() {
      ipcRenderer.send('close:preferences');
    });

    $('.directory_select').on('click', function(event) {
      selectPath(event);
    });
  });

  getPreferences = function() {
    var data, labels, value;
    labels = ['initialisation', 'transcriber', 'default_directory', 'default_basetext_directory'];
    data = {};
    for (let i = 0; i < labels.length; i += 1) {
      value = null;
      value = document.getElementById(labels[i]).value;
      if (value !== null && value.trim() !== '' && value !== undefined) {
        data[labels[i]] = value;
      }
    }
    return data;
  };

  validateData = function(data) {
    var labels;
    labels = ['initialisation', 'transcriber', 'default_directory', 'default_basetext_directory'];
    for (let i = 0; i < labels.length; i += 1) {
      if (!data.hasOwnProperty(labels[i])) {
        return false;
      }
    }
    return true;
  };

  //public functions
  savePreferences = function() {
    var data = getPreferences();
    if (validateData(data)) {
      ipcRenderer.send('save:preferences', data);
      return;
    }
    alert('You must provide all of the information.');
    return;
  };

  populatePreferences = function(data) {
    var key;
    for (key in data.preferences) {
      if (data.preferences.hasOwnProperty(key)) {
        document.getElementById(key).value = data.preferences[key];
      }
    }
    if (!data.preferences.hasOwnProperty('initialisation')) {
      $('#first_time_splash').hide();
      $('#cancel-btn').prop('disabled', false);
    }
  };

  selectPath = function(event) {
    var optns, target_id;
    optns = {
      properties: ['openDirectory']
    };
    target_id = event.target.id;
    if (document.getElementById(target_id).value !== '') {
      optns.defaultPath = document.getElementById(target_id).value;
    }
    dialog.showOpenDialog(
      optns,
      function(fileNames) {
        document.getElementById(target_id).value = fileNames[0];
      }
    );
  };

}());
