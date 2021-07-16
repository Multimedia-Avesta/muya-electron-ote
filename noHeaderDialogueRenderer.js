/*jshint esversion: 6 */

/* This is the javascript for the window that alerts users that he header does not have adequate details.
 * The html file is noHeaderDialogue.html
 * */

const electron = require('electron');
const {ipcRenderer} = electron;
const remote = require('electron').remote;
const form = document.getElementById('broken_header_frm');
const dialog = require('electron').remote.dialog;


var NHDIA = (function() {
  "use strict";

  //private functions
  var setFilename, cancelLoading, loadTranscriptionReplaceHeader;

  //listeners
  ipcRenderer.on('set:filename', function(event, data) {
    setFilename(data);
  });

  //event handlers
  $('#do_load_transcription_btn').on('click', function(e) {
    loadTranscriptionReplaceHeader(e);
  });
  $('#cancel_load_transcription_btn').on('click', function() {
    cancelLoading();
  });

  loadTranscriptionReplaceHeader = function(e) {
    var data, siglum, filename, language, basetext, base;
    e.preventDefault();
    data = {};
    siglum = document.getElementById('siglum').value;
    language = document.getElementById('language').value;
    filename = document.getElementById('filename').value;
    if (siglum.trim() === '') {
      alert('You must provide a siglum for the witness.');
      return;
    }
    data.siglum = siglum;
    data.language = language;
    data.filename = filename;
    ipcRenderer.send('open:replaceheader', data);
    return;
  };

  cancelLoading = function() {
    ipcRenderer.send('cancel:loading');
  };


  setFilename = function(data) {
    document.getElementById('filename').value = data.filename;
  };

}());
