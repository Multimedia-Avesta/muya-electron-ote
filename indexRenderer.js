/*jshint esversion: 6 */

/* This is the javascript that controls the rendering of the main
 * window of the app (the one which contains the OTE).
 * The related html file is index.html */

const electron = require('electron');
const {ipcRenderer} = electron;
const path = require('path');
const remote = require('electron').remote;
const dialog = require('electron').remote.dialog;
const fs = require('fs');


var OTE = (function() {
  "use strict";

  var siglum, confirm_save, current_filepath;
  confirm_save = true;

  //privatec function declarations
  var getHands, selectTranscription, replaceHeaderAndLoad, closeEditor, checkEditorState, setEditorState, startNew,
  startBasetext, saveTranscription, processSaveResult, pad2, getSiglum, extractHeader, updateHeader, loadTranscription,
  setOteText, removeHeader, replaceHeader;

  //listeners
  ipcRenderer.on('remove:ote', function(event, data) {
    tinymce.remove();
  });
  ipcRenderer.on('save:xml', function(event, data) {
    saveTranscription(data);
  });
  ipcRenderer.on('save:feedback', function(event, data) {
    processSaveResult(data);
  });
  ipcRenderer.on('start:new', function(event, data) {
    startNew(data);
  });
  ipcRenderer.on('start:basetext', function(event, data) {
    startBasetext(data);
  });
  ipcRenderer.on('open:existing', function(event) {
    selectTranscription();
  });
  ipcRenderer.on('editor:close', function(event) {
    closeEditor();
  });
  ipcRenderer.on('checkEditorState', function(event, data) {
    checkEditorState(data);
  });
  ipcRenderer.on('setEditorState', function(event, data) {
    setEditorState(data);
  });
  ipcRenderer.on('get:hands', function(event, data) {
    getHands();
  });
  ipcRenderer.on('open:replaceheader', function(event, data) {
    replaceHeaderAndLoad(data);
  });


  pad2 = function(number) {
    if (number < 10) {
      return '0' + number;
    }
    return number;
  };

  getSiglum = function(header) {
    var xmlDoc, $xml;
    //load into dom
    try {
      xmlDoc = $.parseXML(header);
      $xml = $(xmlDoc);
      return $xml.find('title[type="document"]').attr('n'); //undefined if not found
    } catch (err) {
      alert('The file you are trying to loading is not valid XML.');
      return;
    }
  };

  extractHeader = function(tei) {
    //split off the header
    var header;
    header = tei.substring(tei.indexOf('<teiHeader>'), tei.indexOf('</teiHeader>') + 12);
    return header;
  };

  updateHeader = function(header) {
    var xmlDoc, $xml, today;
    today = new Date();
    //load into dom
    xmlDoc = $.parseXML(header);
    $xml = $(xmlDoc);
    $xml.find('editionStmt>edition>date').text(today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate());
    return '<teiHeader>' + $xml.find('teiHeader').html() + '</teiHeader>';
  };

  removeHeader = function(tei) {
    var header;
    if (tei.indexOf('<teiHeader>') !== -1) {
      header = tei.substring(tei.indexOf('<teiHeader>'), tei.indexOf('</teiHeader>') + 12);
      tei = tei.replace(header, '<teiHeader></teiHeader>');
    }
    return tei;
  };

  replaceHeaderAndLoad = function(data) {
    var base_xml, language, html = [];
    remote.getGlobal('header').current_header = null;
    siglum = data.siglum;
    language = data.language;
    current_filepath = data.filename;

    fs.readFile(path.join(__dirname, 'assets', 'xml', 'header.xml'), 'utf-8', (err, header_str) => {
      var today, xmlDoc, $xml, header;
      if (err) {
        alert('An error ocurred reading the basetext file :' + err.message);
        return;
      }
      today = new Date();
      xmlDoc = $.parseXML(header_str);
      $xml = $(xmlDoc);
      $xml.find('editionStmt>edition>date').text(today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate());
      $xml.find('sourceDesc>msDesc>msIdentifier>altIdentifier:first>idno').text(siglum);
      $xml.find('title[type="document"]').text('A Transcription of the Yasna in ' + siglum);
      $xml.find('title[type="document"]').attr('n', siglum);
      $xml.find('respStmt>name:first').text(remote.getGlobal('preferences').transcriber);
      header = '<teiHeader>' + $xml.find('teiHeader').html() + '</teiHeader>';
      ipcRenderer.send('set:default_header', {
        header: header
      });
      html.push('<p id="detail_summary">You are editing ');
      html.push('<span id="details_summary_siglum">');
      html.push(siglum);
      html.push('</span>');
      html.push('.</p>');
      html.push('<p id="message_panel"></p><br class="clear"/>');
      html.push('<textarea id="wce_editor" style="width: 100%; height: ' + (window.innerHeight - 180) + 'px;"></textarea>');
      tinymce.remove();
      confirm_save = true;
      fs.readFile(data.filename, 'utf-8', (err, xml) => {
        if (err) {
          alert("An error ocurred reading the file :" + err.message);
          return;
        }
        tinymce.remove();
        xml = removeHeader(xml);
        document.getElementById('container').innerHTML = html.join('');
        setWceEditor('wce_editor', '', function() {
          setOteText(xml);
        }, 'en', '', siglum, language, function() {
          saveTranscription({
            'type': 'save'
          });
        });
        ipcRenderer.send('menu:enable');
      });
    });
  };

  loadTranscription = function(fileNames) {
    var header, html = [];
    remote.getGlobal('header').current_header = null;
    if (fileNames === undefined) {
      console.log("No file selected");
      return;
    }
    fs.readFile(fileNames[0], 'utf-8', (err, xml) => {
      if (err) {
        alert("An error ocurred reading the file :" + err.message);
        return;
      }
      tinymce.remove();
      current_filepath = fileNames[0];
      header = extractHeader(xml);
      xml = removeHeader(xml);
      siglum = getSiglum(header);
      HDR.getDefaultHeader(siglum);
      header = updateHeader(header);
      if (siglum === undefined) {
        ipcRenderer.send('open:problem_header', fileNames[0]);
      } else {
        ipcRenderer.send('set:current_header', {
          header: header
        });
        html.push('<p id="detail_summary">You are editing ');
        html.push('<span id="details_summary_siglum">');
        html.push(siglum);
        html.push('</span>');
        html.push('.</p>');
        html.push('<p id="message_panel"></p><br class="clear"/>');
        html.push('<textarea id="wce_editor" style="width: 100%; height: ' + (window.innerHeight - 180) + 'px;"></textarea>');

        document.getElementById('container').innerHTML = html.join('');

        setWceEditor('wce_editor', '', function() {
          setOteText(xml);
          confirm_save = false;
        }, 'en', '', siglum, '', function() {
          saveTranscription({
            'type': 'save'
          });
        });
        ipcRenderer.send('menu:enable');
      }
    });
  };

  setOteText = function(xml) {
    setTEI(xml);
    setTimeout(
      function() {
        tinymce.activeEditor.isNotDirty = 1;
      }, 500);
  };

  replaceHeader = function(tei) {
    var fake_header;
    //replace the header with the required header
    fake_header = tei.substring(tei.indexOf('<teiHeader>'), tei.indexOf('</teiHeader>') + 12);
    if (remote.getGlobal('header').current_header !== null) {
      tei = tei.replace(fake_header, remote.getGlobal('header').current_header);
    } else {
      tei = tei.replace(fake_header, remote.getGlobal('header').default_header);
    }
    return tei;
  };


  getHands = function() {
    var tei, xmlDoc, $xml, hands, hand, last_char;
    tei = getTEI();
    xmlDoc = $.parseXML(tei);
    $xml = $(xmlDoc);
    hands = ['firsthand'];
    $xml.find('rdg').each(function(i, element) {
      hand = $(element).attr('hand');
      if (hands.indexOf(hand) === -1) {
        hands.push(hand);
      }

    });
    ipcRenderer.send('edit:header', {
      hands: hands
    });
  };

  selectTranscription = function() {
    var ok;
    if (tinyMCE.activeEditor && isEditorDirty()) {
      ok = confirm('You might have unsaved changes in your transcription. Any changes will be lost if you continue. Are you sure you want to continue?');
      if (ok === false) {
        return;
      }
    }
    dialog.showOpenDialog({
        filters: [{
          name: 'xml',
          extensions: ['xml']
        }],
        defaultPath: remote.getGlobal('preferences').default_directory
      },
      function(fileNames) {
        loadTranscription(fileNames);
      }
    );
  };

  closeEditor = function() {
    var ok;
    if (tinyMCE.activeEditor && isEditorDirty()) {
      ok = confirm('You might have unsaved changes in your transcription. Any changes will be lost if you continue. Are you sure you want to continue?');
      if (ok === false) {
        return false;
      }
    }
    tinymce.remove();
    document.getElementById('container').innerHTML = '';
    ipcRenderer.send('menu:disable');
  };

  checkEditorState = function(data) {
    var ok;
    if (tinyMCE.activeEditor && isEditorDirty()) {
      ok = confirm('You might have unsaved changes in your transcription or the header. Any changes will be lost if you continue. Are you sure you want to continue?');
      if (ok === false) {
        return;
      }
    }
    ipcRenderer.send('open:dialogue', data);
  };

  setEditorState = function(data) {
    if (data.dirty === true) {
      tinymce.activeEditor.isNotDirty = 0;
    } else if (data.dirty === false) {
      tinymce.activeEditor.isNotDirty = 1;
    }
  };

  startNew = function(data) {
    var base_xml, language, html = [];
    remote.getGlobal('header').current_header = null;
    siglum = data.siglum;
    language = data.language;
    current_filepath = undefined;

    fs.readFile(path.join(__dirname, 'assets', 'xml', 'header.xml'), 'utf-8', (err, header_str) => {
      var today, xmlDoc, $xml, header;
      if (err) {
        alert('An error ocurred reading the basetext file :' + err.message);
        return;
      }
      today = new Date();
      xmlDoc = $.parseXML(header_str);
      $xml = $(xmlDoc);
      $xml.find('editionStmt>edition>date').text(today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate());
      $xml.find('sourceDesc>msDesc>msIdentifier>altIdentifier:first>idno').text(siglum);
      $xml.find('title[type="document"]').text('A Transcription of the Yasna in ' + siglum);
      $xml.find('title[type="document"]').attr('n', siglum);
      $xml.find('respStmt>name:first').text(remote.getGlobal('preferences').transcriber);
      header = '<teiHeader>' + $xml.find('teiHeader').html() + '</teiHeader>';
      ipcRenderer.send('set:default_header', {
        header: header
      });
      html.push('<p id="detail_summary">You are editing ');
      html.push('<span id="details_summary_siglum">');
      html.push(siglum);
      html.push('</span>');
      html.push('.</p>');
      html.push('<p id="message_panel"></p><br class="clear"/>');
      html.push('<textarea id="wce_editor" style="width: 100%; height: ' + (window.innerHeight - 180) + 'px;"></textarea>');
      tinymce.remove();
      document.getElementById('container').innerHTML = html.join('');
      confirm_save = true;
      base_xml = '<TEI><teiHeader></teiHeader><text><body><div type="book" n="Y"></div></body></text></TEI>';
      setWceEditor('wce_editor', '', function() {
        setOteText(base_xml);
      }, 'en', '', siglum, language, function() {
        saveTranscription({
          'type': 'save'
        });
      });
      ipcRenderer.send('menu:enable');
    });
  };

  startBasetext = function(data) {
    var callback, current_filepath, language, xml, header, html = [];
    remote.getGlobal('header').current_header = null;
    siglum = data.siglum;
    language = data.language;
    current_filepath = undefined;
    HDR.getDefaultHeader(data.siglum);
    html.push('<p id="detail_summary">You are editing ');
    html.push('<span id="details_summary_siglum">');
    html.push(siglum);
    html.push('</span>');
    html.push('.</p>');
    html.push('<p id="message_panel"></p><br class="clear"/>');
    html.push('<textarea id="wce_editor" style="width: 100%; height: ' + (window.innerHeight - 180) + 'px;"></textarea>');
    tinymce.remove();
    document.getElementById('container').innerHTML = html.join('');
    confirm_save = true;
    xml = removeHeader(data.xml);
    setWceEditor('wce_editor', '', function() {
      setOteText(xml);
    }, 'en', '', siglum, language, function() {
      saveTranscription({
        'type': 'save'
      });
    });
    ipcRenderer.send('menu:enable');
  };

  saveTranscription = function(data) {
    var fake_header, tei;
    tei = getTEI();
    data.tei = replaceHeader(tei);
    if (remote.getGlobal('header').current_header !== null) {
      siglum = getSiglum(remote.getGlobal('header').current_header);
    }
    data.siglum = siglum;
    if (confirm_save === true && data.type === 'save') {
      data.type = 'saveas';
    }
    if (current_filepath !== undefined) {
      data.default_filepath = current_filepath;
    } else {
      data.default_filepath = path.join(remote.getGlobal('preferences').default_directory, 'Y_' + data.siglum + '.xml');
    }
    ipcRenderer.send('save:xml', data);
  };

  processSaveResult = function(data) {
    var date;
    date = new Date();
    if (data.status === 'success') {
      setEditorNotDirty(true);
      confirm_save = false;
      current_filepath = data.filepath;
      document.getElementById('details_summary_siglum').innerHTML = data.siglum;
      document.getElementById('message_panel').innerHTML = 'last saved: ' + pad2(date.getHours()) + ':' + pad2(date.getMinutes());
      return;
    }
    alert('An error occurred while saving the file. Please try again.');
    return;
  };

}());
