/*jshint esversion: 6 */

/* This is the renderer javascript for the header editing window
 * The relevant html files is editHeader.html
 * Also associated with this is the html for the form view of the
 * header at assets/html_fagments/headerForm.html
 *   */

const electron = require('electron');
const {ipcRenderer} = electron;
const path = require('path');
const remote = require('electron').remote;
const dialog = require('electron').remote.dialog;
const fs = require('fs');
require("codemirror/mode/xml/xml");
const CodeMirror = require('codemirror');

// const Popper = require('popper.js') //bootstrap requires the capital P here
// const bootstrap = require('bootstrap');


var EHDR = (function() {

  //public function declarations
  var showHeaderDialogue, saveHeader, closeHeader;

  //private function declarations
  var handSort, getOrderedHands, getHeaderHands, saveXML, addHandlers, getDefaultValue,
    resetCounters, showForm, showXML, saveForm, populateForm, addAltIdentifier, saveAltIdentifiers,
    addTitle, saveTitles, saveHands, addCreator, saveCreators, addFunder, saveFunders, addDistributor,
    saveDistributors, deleteElement;

  //variables
  var xml_editor, working_header;
  var distributor_count = 0;
  var funder_count = 0;
  var additional_title_count = 0;
  var creator_count = 0;
  var altidentifier_count = 0;

  //listeners
  ipcRenderer.on('showHeader', function(event, data) {
    showHeaderDialogue(data);
  });

  $(document).ready(function() {
    //add event handlers
    $('#save-btn').on('click', function() {
      saveHeader();
    });
    $('#close-btn').on('click', function() {
      closeHeader();
    });

  });

  function enableListSort(className) {
    $('.' + className + ' li').each(function () {
      $(this).attr('draggable', true);
      $(this).on('drag', doDrag);
      $(this).on('dragend', doDrop);
    });
  }

  function getSwapItem(selectedItem, x, y) {
    var swapItem = document.elementFromPoint(x, y);
    if (swapItem === null) {
      return selectedItem;
    }
    return swapItem;
  }

  function doDrag(item) {
    var selectedItem, list, x, y, swapItem;
    selectedItem = item.target;
    list = selectedItem.parentNode;
    x = event.clientX;
    y = event.clientY;
    selectedItem.classList.add('dragged');

    swapItem = getSwapItem(selectedItem, x, y);
    if (list === swapItem.parentNode) {
      if (swapItem === selectedItem.nextSibling) {
        swapItem = swapItem.nextSibling;
      }
      list.insertBefore(selectedItem, swapItem);
    }
  }

  function doDrop(item) {
    $(item).removeClass('dragged');
  }

  handSort = function(a, b) {
    //always put firsthand first
    if (a === 'firsthand') {
      return -1;
    }
    if (b === 'firsthand') {
      return 1;
    }
    //put 'corrector' at the end
    if (a === 'corrector') {
      return 1;
    }
    if (b === 'corrector') {
      return -1;
    }
    if (a.indexOf('corrector') !== -1 && b.indexOf('corrector') !== -1) {
      return parseInt(a.replace('corrector', '')) - parseInt(b.replace('corrector', ''));
    }
    return 0;
  };

  getOrderedHands = function(transcription_hands, header_hands) {
    var hands;
    //first sort the transcription hands to a decent default
    transcription_hands.sort(handSort);
    hands = [];
    for (let i = 0; i < header_hands.length; i += 1) {
      if (transcription_hands.indexOf(header_hands[i]) !== -1) {
        hands.push(header_hands[i]);
        transcription_hands.splice(transcription_hands.indexOf(header_hands[i]), 1);
      }
    }
    //now add any transcription hands that are left
    for (let i = 0; i < transcription_hands.length; i += 1) {
      hands.push(transcription_hands[i]);
    }
    return hands;
  };

  getHeaderHands = function() {
    var xmlDoc, $xml, hands;
    xmlDoc = $.parseXML(working_header);
    $xml = $(xmlDoc);
    hands = [];
    $xml.find('listWit>witness').each(function(i, element) {
      hands.push($(element).attr('xml:id'));
    });
    return hands;
  };

  saveXML = function() {
    try {
      xmlDoc = $.parseXML(xml_editor.getValue().replace(/\n/g, ''));
    } catch (err) {
      alert('There is an error in the XML. Please fix this error.');
      return false;
    }
    working_header = xml_editor.getValue().replace(/\n/g, '');
    return true;

  };

  addHandlers = function() {

    $('#add_altidentifier').on('click', function() {
      addAltIdentifier();
    });
    $('#add_title').on('click', function() {
      addTitle();
    });
    $('#add_creator').on('click', function() {
      addCreator();
    });
    $('#add_distributor').on('click', function() {
      addDistributor();
    });
    $('#add_funder').on('click', function() {
      addFunder();
    });
    $('#editorial_populate').on('click', function() {
      getDefaultValue('encodingDesc>editorialDecl>p', 'editorial_declaration');
      document.getElementById('editorial_populate').style.display = 'none';
    });
    $('#project_populate').on('click', function() {
      getDefaultValue('encodingDesc>projectDesc>p', 'project_description');
      document.getElementById('project_populate').style.display = 'none';
    });
    $('#license_populate').on('click', function() {
      getDefaultValue('publicationStmt>availability>p', 'license');
      document.getElementById('license_populate').style.display = 'none';
    });


  };

  getDefaultValue = function(path, element_id) {
    var def_header, xmlDoc, $xml, value;
    def_header = remote.getGlobal('header').default_header;
    xmlDoc = $.parseXML(def_header);
    $xml = $(xmlDoc);
    value = [];
    $xml.find(path).each(function(i, element) {
      value.push($(element).text());
    });
    document.getElementById(element_id).value = value.join('');
  };

  resetCounters = function() {
    distributor_count = 0;
    funder_count = 0;
    additional_title_count = 0;
    creator_count = 0;
    altidentifier_count = 0;
  };

  showForm = function(ordered_hands) {
    fs.readFile(path.join(__dirname, 'assets', 'html_fragments', 'headerForm.html'), 'utf-8', (err, html) => {
      if (err) {
        console.log('could not find html fragment "headerForm.html"');
        return;
      }
      document.getElementById('form_view').innerHTML = html;
      resetCounters();
      populateForm(ordered_hands);
      addHandlers();
    });
  };

  showXML = function() {
    xml_editor.setValue(vkbeautify.xml(working_header));
  };

  saveForm = function() {
    var xmlDoc, $xml, siglum_type, ed_no, license, projectDesc, editorialDecl;
    //because we are not necessarily replacing all of the XML the data from the form
    //needs to be saved based on xpaths and the rest should remain untouched.
    //saves to working_header
    xmlDoc = $.parseXML(working_header);
    $xml = $(xmlDoc);
    //basic details
    //we always need to keep the title element because it contains the siglum we use when loading in
    //so it is okay to set title to an empty string if one is not provided
    $xml.find('title[type="document"]').attr('n', document.getElementById('siglum').value);
    $xml.find('title[type="document"]').text(document.getElementById('document_title').value);
    siglum_type = document.getElementById('siglum_type').value.trim();
    if (siglum_type !== '') {
      $xml.find('sourceDesc>msDesc>msIdentifier>altIdentifier:first').attr('type', siglum_type);
    } else {
      $xml.find('sourceDesc>msDesc>msIdentifier>altIdentifier:first').removeAttr('type');
    }
    ed_no = document.getElementById('edition_number').value.trim();
    if (ed_no !== '') {
      $xml.find('editionStmt>edition').attr('n', ed_no);
    }
    saveHands($xml);

    //altIdentifiers
    saveAltIdentifiers($xml);
    //additional titles
    saveTitles($xml);
    //scribe name
    scribe_name = document.getElementById('scribe_name').value.trim();
    if (scribe_name !== '') {
      if ($xml.find('physDesc').length === 0) {
        $xml.find('msDesc').append('<physDesc></physDesc>');
      }
      if ($xml.find('physDesc>handDesc').length === 0) {
        $xml.find('physDesc').append('<handDesc></handDesc>');
      }
      if ($xml.find('physDesc>handDesc>p').length === 0) {
        $xml.find('physDesc>handDesc').append('<p></p>');
      }
      $xml.find('physDesc>handDesc>p').text(scribe_name);
    } else {
      $xml.find('physDesc>handDesc>p').each(function(i, element) {
        deleteElement(element);
      });
      if ($xml.find('physDesc>handDesc').children().length === 0) {
        $xml.find('physDesc>handDesc').each(function(i, element) {
          deleteElement(element);
        });
      }
      if ($xml.find('physDesc').children().length === 0) {
        $xml.find('physDesc').each(function(i, element) {
          deleteElement(element);
        });
      }
    }
    //phys desc
    phys_desc = document.getElementById('phys_desc').value.trim();
    if (phys_desc !== '') {
      if ($xml.find('physDesc').length === 0) {
        $xml.find('msDesc').append('<physDesc></physDesc>');
      }
      if ($xml.find('physDesc>p').length === 0) {
        $xml.find('physDesc').append('<p></p>');
      }
      $xml.find('physDesc>p').text(phys_desc);
    } else {
      $xml.find('physDesc>p').each(function(i, element) {
        deleteElement(element);
      });
      if ($xml.find('physDesc').children().length === 0) {
        $xml.find('physDesc').each(function(i, element) {
          deleteElement(element);
        });
      }
    }


    //creator
    saveCreators($xml);
    //funder
    saveFunders($xml);
    //distributor
    saveDistributors($xml);
    //license
    license = document.getElementById('license').value.trim();
    if (license !== '') {
      if ($xml.find('publicationStmt').length === 0) {
        $xml.find('editionStmt').after('<publicationStmt></publicationStmt>');
      }
      if ($xml.find('publicationStmt>availability').length === 0) {
        $xml.find('publicationStmt').append('<availability></availability>');
      }
      if ($xml.find('publicationStmt>availability>p').length === 0) {
        $xml.find('publicationStmt>availability').append('<p></p>');
      }
      $xml.find('publicationStmt>availability>p').text(license);
    } else {
      $xml.find('publicationStmt>availability').each(function(i, element) {
        deleteElement(element);
      });
    }
    //projectDesc
    projectDesc = document.getElementById('project_description').value.trim();
    if (projectDesc !== '') {
      if ($xml.find('encodingDesc').length === 0) {
        $xml.find('fileDesc').after('<encodingDesc></encodingDesc>');
      }
      if ($xml.find('encodingDesc>projectDesc').length === 0) {
        $xml.find('encodingDesc').append('<projectDesc></projectDesc>');
      }
      if ($xml.find('encodingDesc>projectDesc>p').length === 0) {
        $xml.find('encodingDesc>projectDesc').append('<p></p>');
      }
      $xml.find('encodingDesc>projectDesc>p').text(projectDesc);
    } else {
      $xml.find('encodingDesc>projectDesc').each(function(i, element) {
        deleteElement(element);
      });
    }
    //editorialDecl
    editorialDecl = document.getElementById('editorial_declaration').value.trim();
    if (editorialDecl !== '') {
      if ($xml.find('encodingDesc').length === 0) {
        $xml.find('fileDesc').after('<encodingDesc></encodingDesc>');
      }
      if ($xml.find('encodingDesc>editorialDecl').length === 0) {
        $xml.find('encodingDesc').append('<editorialDecl></editorialDecl>');
      }
      if ($xml.find('encodingDesc>editorialDecl>p').length === 0) {
        $xml.find('encodingDesc>editorialDecl').append('<p></p>');
      }
      $xml.find('encodingDesc>editorialDecl>p').text(editorialDecl);
    } else {
      $xml.find('encodingDesc>editorialDecl').each(function(i, element) {
        deleteElement(element);
      });
    }
    working_header = '<teiHeader>' + $xml.find('teiHeader').html() + '</teiHeader>';
  };

  populateForm = function(ordered_hands) {
    var xmlDoc, $xml, value, siglum_type, projectDesc, license, editorialDecl, ed_no;
    xmlDoc = $.parseXML(working_header);
    $xml = $(xmlDoc);
    //siglum
    siglum = $xml.find('title[type="document"]').attr('n');
    document.getElementById('siglum').value = siglum;
    //only get the attribute type for the first siglum if it agrees with the siglum in the title
    if (siglum === $xml.find('sourceDesc>msDesc>msIdentifier>altIdentifier:first>idno').text()) {
      siglum_type = $xml.find('sourceDesc>msDesc>msIdentifier>altIdentifier:first').attr('type');
      if (siglum_type !== undefined) {
        document.getElementById('siglum_type').value = siglum_type;
      }
    }
    //main title
    document.getElementById('document_title').value = $xml.find('title[type="document"]').text();
    //edition Number
    ed_no = $xml.find('editionStmt>edition').attr('n');
    if (ed_no !== undefined) {
      document.getElementById('edition_number').value = ed_no;
    }
    //other titles
    $xml.find('title:not([type="document"])').each(function(i, title) {
      addTitle(title);
    });
    if (additional_title_count === 0) {
      addTitle();
    }
    //altidentifier
    $xml.find('sourceDesc>msDesc>msIdentifier>altIdentifier').each(function(i, altidentifier) {
      if (i !== 0) {
        addAltIdentifier(altidentifier);
      }
    });
    if (altidentifier_count === 0) {
      addAltIdentifier();
    }
    //scribe name
    document.getElementById('scribe_name').value = $xml.find('msDesc>physDesc>handDesc>p').text();
    //MS description
    document.getElementById('phys_desc').value = $xml.find('msDesc>physDesc>p').text();
    //creator
    $xml.find('respStmt').each(function(i, creator) {
      addCreator(creator);
    });
    if (creator_count === 0) {
      addCreator();
    }
    //deal with hands
    if (ordered_hands === undefined) {
      ordered_hands = getHeaderHands();
    }
    if (ordered_hands.length > 1) { //just firsthand and we don't need to worry
      for (let i = 0; i < ordered_hands.length; i += 1) {
        li = document.createElement('li');
        li.innerHTML = '<span class="hand">' + ordered_hands[i] + '</span>';
        document.getElementById('corrector_hands_list').appendChild(li);
      }
      document.getElementById('corrector_hands_div').style.display = 'block';
      enableListSort('sortable_list');
    }
    //funder
    $xml.find('titleStmt>funder').each(function(i, funder) {
      addFunder(funder);
    });
    if (funder_count === 0) {
      addFunder();
    }
    //distributor
    $xml.find('publicationStmt>distributor>name').each(function(i, name) {
      addDistributor(name);
    });
    if (distributor_count === 0) {
      addDistributor();
    }
    //license
    license = $xml.find('publicationStmt>availability>p').text();
    if (license !== '') {
      document.getElementById('license').value = license;
      document.getElementById('license_populate').style.display = 'none';
    }
    //project desc
    projectDesc = $xml.find('encodingDesc>projectDesc>p').text();
    if (projectDesc !== '') {
      document.getElementById('project_description').value = projectDesc;
      document.getElementById('project_populate').style.display = 'none';
    }
    //editorial decl
    editorialDecl = $xml.find('encodingDesc>editorialDecl>p').text();
    if (editorialDecl !== '') {
      document.getElementById('editorial_declaration').value = editorialDecl;
      document.getElementById('editorial_populate').style.display = 'none';
    }
  };

  setDragging = function (ev) {
    console.log(ev.target.id);
    ev.dataTransfer.setData("text", ev.target.id);
  };



  addAltIdentifier = function(altidentifier) {
    var add_link, parent, div, type;
    add_link = document.getElementById('add_altidentifier');
    parent = add_link.parentNode;
    div = document.createElement('div');
    div.setAttribute('class', 'alt_id');
    div.setAttribute('id', 'altidentifier_' + altidentifier_count);
    div.setAttribute('name', 'altidentifier');
    div.innerHTML = '<label class="label1">Id:</label>' +
      '<input type="text" id="altidentifier_' +
      altidentifier_count + '_siglum" name="siglum" class="input_middle"/>' +
      '<label class="label2">Type:</label>' +
      '<input type="text" id="altidentifier_' +
      altidentifier_count + '_type" name="type" class="input_small"/>' +
      '<div class="del"><img class="delete_logo" height="20px" width="20px" id="delete_altidentifier_' +
      altidentifier_count + '" title="Delete this entry" src="assets/img/delete.png"/></div>';
    parent.insertBefore(div, add_link);
    if (altidentifier !== undefined) {
      document.getElementById('altidentifier_' + altidentifier_count + '_siglum').value = $(altidentifier).find('idno').text();
      type = $(altidentifier).attr('type');
      if (type !== undefined) {
        document.getElementById('altidentifier_' + altidentifier_count + '_type').value = type;
      }
    }
    $('#delete_altidentifier_' + altidentifier_count).on('click', function(event) {
      deleteElement(event.target.parentNode.parentNode);
    });
    altidentifier_count += 1;
  };

  saveAltIdentifiers = function($xml) {
    //first remove all of the altIdentifiers after the first one
    $xml.find('sourceDesc>msDesc>msIdentifier>altIdentifier:not(:first)').each(function(i, element) {
      deleteElement(element);
    });
    //then cycle through the data you have creating new elements for each
    $('div[name="altidentifier"]').each(function(i, element) {
      var siglum, type, new_string;
      siglum = $(element).find('input[name="siglum"]')[0].value.trim();
      type = $(element).find('input[name="type"]')[0].value.trim();
      if (siglum !== '') { //only do this if we have a siglum to use
        if (type !== '') {
          new_string = '<altIdentifier type="' + type + '"><idno>' + siglum + '</idno></altIdentifier>';
        } else {
          new_string = '<altIdentifier><idno>' + siglum + '</idno></altIdentifier>';
        }
        $xml.find('sourceDesc>msDesc>msIdentifier').append(new_string);
      }
    });
  };

  addTitle = function(title) {
    var add_link, parent, div, type_data, language_data, select_optns;
    type_data = [{
      'id': 'work',
      'text': 'Work'
    }, {
      'id': 'short',
      'text': 'Short'
    }, {
      'id': 'collection',
      'text': 'Collection'
    }];
    add_link = document.getElementById('add_title');
    parent = add_link.parentNode;
    div = document.createElement('div');
    div.setAttribute('class', 'add_title');
    div.setAttribute('id', 'title_' + additional_title_count);
    div.setAttribute('name', 'additionalTitle');
    div.innerHTML = '<label class="label1">Title:</label>' +
      '<input type="text" id="title_' +
      additional_title_count + '_text" name="text" class="input_middle"/>' +
      '<label class="label2">Type:</label>' +
      '<input type="text" id="title_' +
      additional_title_count + '_type" name="type" class="input_small"/>' +
      '<div class="del"><img class="delete_logo" height="20px" width="20px" id="delete_title_' +
      additional_title_count + '" title="Delete this entry" src="assets/img/delete.png"/></div>';
    parent.insertBefore(div, add_link);
    if (title !== undefined) {
      document.getElementById('title_' + additional_title_count + '_text').value = $(title).text();
      if ($(title).attr('type') !== undefined) {
        document.getElementById('title_' + additional_title_count + '_type').value = $(title).attr('type');
      }
    }
    $('#delete_title_' + additional_title_count).on('click', function(event) {
      deleteElement(event.target.parentNode.parentNode);
    });
    additional_title_count += 1;
  };

  saveTitles = function($xml) {
    $xml.find('title:not([type="document"])').each(function(i, element) {
      deleteElement(element);
    });
    $('div[name="additionalTitle"]').each(function(i, element) {
      var title, type, new_string;
      title = $(element).find('input[name="text"]')[0].value.trim();
      type = $(element).find('input[name="type"]')[0].value.trim();
      if (title !== '') { //only do this if we have a title to use
        if (type !== '') {
          new_string = '<title type="' + type + '">' + title + '</title>';
        } else {
          new_string = '<title>' + title + '</title>';
        }
        if ($xml.find('titleStmt>respStmt').length > 0) {
          $xml.find('titleStmt>respStmt:first').before(new_string);
        } else {
          $xml.find('titleStmt').append(new_string);
        }
      }
    });
  };

  saveHands = function($xml) {
    $xml.find('listWit').each(function(i, element) {
      deleteElement(element);
    });
    $xml.find('sourceDesc').append('<listWit></listWit>');
    if ($('span.hand').length > 0) {
      $('span.hand').each(function(i, element) {
        $xml.find('sourceDesc>listWit').append('<witness xml:id="' + $(element).text() + '"/>');
      });
    } else { //always add firsthand just in case we have firsthand corrections
      $xml.find('sourceDesc>listWit').append('<witness xml:id="firsthand"/>');
    }

  };

  addCreator = function(creator) {
    var add_link, parent, div;
    add_link = document.getElementById('add_creator');
    parent = add_link.parentNode;
    div = document.createElement('div');
    div.setAttribute('class', 'add_creator');
    div.setAttribute('id', 'creator_' + creator_count);
    div.setAttribute('name', 'creator');
    div.innerHTML = '<label class="label1">Role:</label>' +
      '<input type="text" class="input_middle" id="creator_' +
      creator_count + '_role" name="role"/>' +
      '<label class="label2">Name:</label>' +
      '<input type="text" class="input_small" id="creator_' +
      creator_count + '_name" name="name"/>' +
      '<div class="col-1"><img class="delete_logo" height="20px" width="20px" id="delete_creator_' +
      creator_count + '" title="Delete this entry" src="assets/img/delete.png"/></div>';
    parent.insertBefore(div, add_link);
    if (creator !== undefined) {
      document.getElementById('creator_' + creator_count + '_role').value = $($(creator).find('resp')).text();
      document.getElementById('creator_' + creator_count + '_name').value = $($(creator).find('name')).text();
    }
    $('#delete_creator_' + creator_count).on('click', function(event) {
      deleteElement(event.target.parentNode.parentNode);
    });
    creator_count += 1;
  };

  saveCreators = function($xml) {
    $xml.find('titleStmt>respStmt').each(function(i, element) {
      deleteElement(element);
    });
    $('div[name="creator"]').each(function(i, element) {
      var role, name, xml;
      xml = [];
      role = $(element).find('input[name="role"]')[0].value.trim();
      name = $(element).find('input[name="name"]')[0].value.trim();
      if (name !== '' || role !== '') {
        xml.push('<respStmt>');
        if (role !== '') {
          xml.push('<resp>' + role + '</resp>');
        }
        if (name !== '') {
          xml.push('<name>' + name + '</name>');
        }
        xml.push('</respStmt>');
        if ($xml.find('titleStmt>funder').length > 0) {
          $xml.find('titleStmt>funder').before(xml.join(''));
        } else if ($xml.find('titleStmt>principal').length > 0) {
          $xml.find('titleStmt>principal').before(xml.join(''));
        } else {
          $xml.find('titleStmt').append(xml.join(''));
        }
      }
    });
  };

  addFunder = function(funder) {
    var add_link, parent, div;
    add_link = document.getElementById('add_funder');
    parent = add_link.parentNode;
    div = document.createElement('div');
    div.setAttribute('class', 'add_funder');
    div.setAttribute('id', 'funder_' + funder_count);
    div.innerHTML = '<label class="label1">Name:</label>' +
      '<input type="text" class="input_long" id="funder_' +
      funder_count + '_name" name="funder"/>' +
      '<div class="del"><img class="delete_logo" height="20px" width="20px" id="delete_funder_' +
      funder_count + '" title="Delete this entry" src="assets/img/delete.png"/></div>';
    parent.insertBefore(div, add_link);
    if (funder !== undefined) {
      document.getElementById('funder_' + funder_count + '_name').value = $(funder).text();
    }
    $('#delete_funder_' + funder_count).on('click', function(event) {
      deleteElement(event.target.parentNode.parentNode);
    });
    funder_count += 1;
  };

  saveFunders = function($xml) {
    $xml.find('titleStmt>funder').each(function(i, element) {
      deleteElement(element);
    });
    $('input[name="funder"]').each(function(i, element) {
      var funder, new_string;
      funder = element.value.trim();
      if (funder !== '') {
        new_string = '<funder>' + funder + '</funder>';
        if ($xml.find('titleStmt>funder').length > 0) {
          $xml.find('titleStmt>funder').after(new_string);
        } else if ($xml.find('titleStmt>principal').length > 0) {
          $xml.find('titleStmt>principal').before(new_string);
        } else {
          $xml.find('titleStmt').append(new_string);
        }
      }
    });
  };

  addDistributor = function(name) {
    var add_link, parent, div, type_data, select_optns;
    type_data = [{
      'id': 'org',
      'text': 'Organisation (org)'
    }, {
      'id': 'place',
      'text': 'Place'
    }, {
      'id': 'person',
      'text': 'Person'
    }];
    add_link = document.getElementById('add_distributor');
    parent = add_link.parentNode;
    div = document.createElement('div');
    div.setAttribute('class', 'add_distributer');
    div.setAttribute('id', 'distributor_' + distributor_count);
    div.setAttribute('name', 'distributor');
    div.innerHTML = '<label class="label1">Name:</label>' +
      '<input type="text" class="input_middle" id="distributor_' +
      distributor_count + '_name" name="name"/>' +
      '<label class="label2">Type:</label><select id="distributor_' +
      distributor_count + '_type" name="type" class="input_small"></select>' +
      '<div class="del"><img class="delete_logo" height="20px" width="20px" id="delete_distributor_' +
      distributor_count + '" title="Delete this entry" src="assets/img/delete.png"/></div>';
    parent.insertBefore(div, add_link);
    select_optns = {
      'value_key': 'id',
      'text_keys': 'text'
    };
    if (name !== undefined) {
      document.getElementById('distributor_' + distributor_count + '_name').value = $(name).text();
      select_optns.selected = $(name).attr('type');
    }
    forms.populateSelect(type_data, document.getElementById('distributor_' + distributor_count + '_type'), select_optns);
    $('#delete_distributor_' + distributor_count).on('click', function(event) {
      deleteElement(event.target.parentNode.parentNode);
    });
    distributor_count += 1;
  };

  saveDistributors = function($xml) {
    $xml.find('publicationStmt>distributor').each(function(i, element) {
      deleteElement(element);
    });
    $('div[name="distributor"]').each(function(i, element) {
      var name, type, new_string;
      name = $(element).find('input[name="name"]')[0].value.trim();
      type = $(element).find('select[name="type"]')[0].value.trim();
      if (name !== '') {
        if (type !== 'none') {
          new_string = '<name type="' + type + '">' + name + '</name>';
        } else {
          new_string = '<name>' + name + '</name>';
        }
        if ($xml.find('publicationStmt').length === 0) {
          $xml.find('editionStmt').after('<publicationStmt></publicationStmt>');
        }
        if ($xml.find('publicationStmt>distributor').length === 0) {
          $xml.find('publicationStmt').prepend('<distributor></distributor>');
        }
        $xml.find('publicationStmt>distributor').append(new_string);
      }
    });
  };

  deleteElement = function(elem) {
    elem.parentNode.removeChild(elem);
  };

  showView = function (viewType) {
    $('.tabcontent').css('display', 'none');
    $('.tablinks').removeClass('active');
    $('#' + viewType.replace('view', 'tab')).addClass('active');
    document.getElementById(viewType).style.display = "block";
  };

  //public functions
  showHeaderDialogue = function(data) {
    var transcription_hands, header_hands, ordered_hands;
    transcription_hands = data.hands;
    if (remote.getGlobal('header').current_header !== null) {
      working_header = remote.getGlobal('header').current_header;
    } else {
      working_header = remote.getGlobal('header').default_header;
    }
    header_hands = getHeaderHands();
    ordered_hands = getOrderedHands(transcription_hands, header_hands);

    xml_editor = CodeMirror.fromTextArea(document.getElementById('xml_editor'), {
      theme: 'default'
    });
    xml_editor.setSize(724, 380);
    $('#xml_tab').on('click', function() {
      saveForm();
      showView('xml_view');
      showXML();
    });
    $('#form_tab').on('click', function() {
      var success;
      success = saveXML();
      if (success === true) {
        showView('form_view');
        showForm();
      }
    });
    $('#xml_link').on('shown.bs.tab', function(e) {
      setTimeout(function() {
        xml_editor.refresh();
      }, 200);
    });
    showView('form_view');
    showForm(ordered_hands);
  };

  saveHeader = function() {
    //first save what is in whatever view you are in to the working header
    if ($("div.tab button.active")[0].id === 'form_tab') {
      saveForm();
    } else {
      saveXML();
    }
    //then save to the global
    ipcRenderer.send('set:current_header', {
      header: working_header,
      dirty: true
    });
    $('#save-btn').blur();
  };

  closeHeader = function() {
    ipcRenderer.send('close:header');
  };

}());
