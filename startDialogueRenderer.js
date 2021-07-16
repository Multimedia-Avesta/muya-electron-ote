/*jshint esversion: 6 */

/* This is the javascript for the two 'new transcription' dialogue windows.
 * The html files are startNewDialogue.html and startBasetextDialogue.html
 * */

const electron = require('electron');
const {ipcRenderer} = electron;
const remote = require('electron').remote;
const form = document.getElementById('new_transcription_frm');
const dialog = require('electron').remote.dialog;


var DIA = (function() {
  "use strict";

  //private functions
  var setBasetextPath, startNewTranscription;

  //event handlers
  $('#select_basetext_btn').on('click', function() {
    dialog.showOpenDialog({
        defaultPath: remote.getGlobal('preferences').default_basetext_directory,
        filters: [{
          name: 'xml',
          extensions: ['xml']
        }]
      },
      function(fileNames) {
        setBasetextPath(fileNames[0]);
      }
    );
  });

  form.addEventListener('submit', function(e) {
    startNewTranscription(e);
  });

  setBasetextPath = function(basetext_path) {
    document.getElementById('basetext_path').value = basetext_path;
    document.getElementById('basetext_path_display').innerHTML = basetext_path.split('/').slice(-1)[0];
    return;
  };

  startNewTranscription = function(e) {
    var data, siglum, language, basetext, base, basetext_path;
    e.preventDefault();
    data = {};
    siglum = document.getElementById('siglum').value;
    language = document.getElementById('language').value;
    if (siglum.trim() === '') {
      alert('You must provide a siglum for the witness.');
      return;
    }
    data.siglum = siglum;
    data.language = language;
    basetext = document.getElementById('basetext').value;
    if (basetext !== 'true') {
      ipcRenderer.send('start:new', data);
      return;
    }
    basetext_path = document.getElementById('basetext_path').value;
    if (basetext_path.trim() === '') {
      alert('You must specify a basetext.');
      return;
    }
    data.basetext_path = basetext_path;
    ipcRenderer.send('start:basetext', data);
    return;
  };

}());
