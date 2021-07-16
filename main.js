/*jshint esversion: 6 */

const electron = require('electron');
const url = require('url');
const path = require('path');

const {app, BrowserWindow, Menu, ipcMain} = electron;
const dialog = require('electron').dialog;
const fs = require('fs');
const settings_file = 'MUYA-OTE-settings.json';

//SET environment
process.env.NODE_ENV = 'production'; // 'development'; // 


//globals
global.preferences = {};
global.header = {'default_header': null, 'current_header': null};

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow, headerWindow, headerProblemWindow, settingsWindow, startBasetextWindow, startBlankWindow, aboutWindow, helpWindow;


//listeners
//listen for app to be ready
app.on('ready', createWindow);
app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
      createWindow();
    }
});
//Quit when all windows are closed.
app.on('window-all-closed', function () {closeApplication();});

ipcMain.on('close:preferences', function (e) {settingsWindow.close();});
ipcMain.on('close:header', function (e) {headerWindow.close();});
ipcMain.on('save:preferences', function(event, data) {saveSettings(data, function() {settingsWindow.close();});});
ipcMain.on('save:xml', function(event, data){saveTranscription(data);});
ipcMain.on('open:dialogue', function(event, data){createStartDialogue(data);});
ipcMain.on('menu:enable', function(event){enableMenuSaveItems();});
ipcMain.on('menu:disable', function(event){disableMenuSaveItems();});
ipcMain.on('set:current_header', function(event, data){setCurrentHeader(data);});
ipcMain.on('set:default_header', function(event, data){setDefaultHeader(data);});
ipcMain.on('edit:header', function(event, data){doEditHeader(data);});
ipcMain.on('open:problem_header', function(event, data){addressProblemHeader(data);});
ipcMain.on('cancel:loading', function(event) {headerProblemWindow.close();});


//catch siglum for new transcription
ipcMain.on('start:new', function (e, data) {
   mainWindow.webContents.send('start:new', data);
   startBlankWindow.close();
});
ipcMain.on('open:replaceheader', function (e, data) {
    mainWindow.webContents.send('open:replaceheader', data);
    headerProblemWindow.close();
 });
ipcMain.on('start:basetext', function (e, data) {
    //read the basetext file and add it to data
    fs.readFile(data.basetext_path, 'utf-8', (err, basetext_xml) => {
        if(err){
            alert('An error ocurred reading the basetext file :' + err.message);
            return;
        }
        //pass the data to the renderer function to execute
        data.xml = basetext_xml;
        mainWindow.webContents.send('start:basetext', data);
        startBasetextWindow.close();
    });
});

function setCurrentHeader(data) {
    global.header.current_header = data.header;
    if (data.hasOwnProperty('dirty') && data.dirty === true) {
        mainWindow.webContents.send('setEditorState', {'dirty': true});
    }
}

function setDefaultHeader(data) {
    global.header.default_header = data.header;
}


function addressProblemHeader(filename) {

    try {
        headerProblemWindow.focus();
    } catch (err) {
        headerProblemWindow = new BrowserWindow({width: 550, height: 300, title: 'Details Required', webPreferences: {
            nodeIntegration: true,
        }});
        if (process.env.NODE_ENV === 'production') {
            headerProblemWindow.setMenu(null);
        }
        headerProblemWindow.loadURL(url.format({
            pathname: path.join(__dirname, 'noHeaderDialogue.html'),
            protocol: 'file:',
            slashes: true
        }));

        headerProblemWindow.webContents.on('did-finish-load', function() {
            headerProblemWindow.webContents.send('set:filename', {filename: filename});
        });

        headerProblemWindow.focus();

    }

    //Garbage collection
    headerProblemWindow.on('close', function (){
        headerProblemWindow = null;
    });

}

function saveSettings (settings, callback) {
    var filePath = path.join(app.getPath('userData'), settings_file);
    //if this is our first save of the settings our user may have
    //chosen our default directory so we need to make it if they have
    if (settings.initialisation === 'true') {
        if (process.platform === 'win32') {
            if (settings.default_directory === path.join(process.env.USERPROFILE, 'MUYA-transcriptions') ||
                    settings.default_basetext_directory === path.join(process.env.USERPROFILE, 'MUYA-transcriptions')) {
                fs.mkdir(path.join(process.env.USERPROFILE, 'MUYA-transcriptions'), function(err){
                    if (err) {
                        console.log('failed to create directory: ' + err.message);
                    }
                });
            }
        } else {
            if (settings.default_directory === path.join(process.env.HOME, 'MUYA-transcriptions') ||
                    settings.default_basetext_directory === path.join(process.env.HOME, 'MUYA-transcriptions')) {
                fs.mkdir(path.join(process.env.HOME, 'MUYA-transcriptions'), function(err){
                    if (err) {
                        console.log('failed to create directory: ' + err.message);
                    }
                });
            }
        }
    }
	delete settings.initialisation;
    setPreferences(settings);
    fs.writeFile(filePath, JSON.stringify(settings), function (err) {
        if (err) {
            console.info("There was an error attempting to save your data.");
            console.warn(err.message);
            return;
        } else if (callback) {
            callback();
        }
    });
}

function readSettings (success_callback, error_callback) {
    fs.readFile(path.join(app.getPath('userData'), settings_file), 'utf-8', (err, data) => {
        if(err){
            if (error_callback) {
                error_callback();
            }
            return;
        }
        if (success_callback) {
            success_callback(JSON.parse(data));
        }
        return;
    });
}


function editSettings () {
    var success_callback, error_callback;
    success_callback = function (settings) {
        doEditSettings(settings);
    };
    error_callback = function () {
        var settings = {};
        settings.initialisation = 'true';
        if (process.platform === 'win32') {
            settings.transcriber = process.env.USERNAME;
            settings.default_directory = path.join(process.env.USERPROFILE, 'MUYA-transcriptions');
            settings.default_basetext_directory = path.join(process.env.USERPROFILE, 'MUYA-transcriptions');
        } else {
            settings.transcriber = process.env.USERNAME;
            settings.default_directory = path.join(process.env.HOME, 'MUYA-transcriptions');
            settings.default_basetext_directory = path.join(process.env.HOME, 'MUYA-transcriptions');
        }
        doEditSettings(settings);
    };

    readSettings(success_callback, error_callback);
    return;
}

function doEditSettings (settings) {

    try {
        settingsWindow.focus();
    } catch (err) {
        if (settings.hasOwnProperty('initialisation') && settings.initialisation === 'true') {
            settingsWindow = new BrowserWindow({title: 'Preferences', parent: mainWindow, frame: false, modal: true, width: 700, height: 350, webPreferences: {
                nodeIntegration: true,
            }});
        } else {
            settingsWindow = new BrowserWindow({title: 'Preferences', parent: mainWindow, modal: true, width: 700, height: 300, webPreferences: {
                nodeIntegration: true,
            }});
        }
        if (process.env.NODE_ENV === 'production') {
            settingsWindow.setMenu(null);
        }

        settingsWindow.loadURL(url.format({
            pathname: path.join(__dirname, 'preferences.html'),
            protocol: 'file:',
            slashes: true
        }));

        settingsWindow.focus();
        settingsWindow.webContents.on('did-finish-load', function() {
            settingsWindow.webContents.send('showPreferences', {preferences: settings});
        });
    }

    //Garbage collection
    settingsWindow.on('close', function (){
        settingsWindow = null;
    });
}


function setPreferences(settings) {
    global.preferences = settings;
}


function createWindow () {
    // Create the browser window.
    mainWindow = new BrowserWindow({title: 'MUYA Transcription Editor',
        icon: path.join(__dirname, 'assets/icons/png/64x64.png'),
        webPreferences: {
            nodeIntegration: true,
        }
        //minWidth: 1209
    });

    //maximize the window
    mainWindow.maximize();
    // and load the index.html of the app.
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    //build menu from template
    const menu = Menu.buildFromTemplate(menuTemplate);
    //insert menu
    Menu.setApplicationMenu(menu);
    //try to read settings file if there is one set preferences if not make use add them
    readSettings(function(data) {setPreferences(data);}, function() {editSettings();});

    mainWindow.on('close', function (e) {
        closeApplication();
    });
}


//handle dialogue
function createStartDialogue(type) { //basetext|blank

    if (type === 'basetext') {
        if (startBasetextWindow === undefined || startBasetextWindow === null) {
            startBasetextWindow = new BrowserWindow({width: 400, height: 250, title: 'Start new transcription', webPreferences: {
                nodeIntegration: true,
            }});
            if (process.env.NODE_ENV === 'production') {
                startBasetextWindow.setMenu(null);
            }
            startBasetextWindow.loadURL(url.format({
                pathname: path.join(__dirname, 'startBasetextDialogue.html'),
                protocol: 'file:',
                slashes: true
            }));

            //Garbage collection
            startBasetextWindow.on('close', function (){
                startBasetextWindow = null;
            });
        } else {
            startBasetextWindow.focus();
        }
    } else {
        if (startBlankWindow === undefined || startBlankWindow === null) {
            startBlankWindow = new BrowserWindow({width: 400,
                                                  height: 200,
                                                  title: 'Start New Transcription',
                                                  webPreferences: {
                                                      nodeIntegration: true,
                                                  }});
            if (process.env.NODE_ENV === 'production') {
                startBlankWindow.setMenu(null);
            }
            startBlankWindow.loadURL(url.format({
                pathname: path.join(__dirname, 'startNewDialogue.html'),
                protocol: 'file:',
                slashes: true
            }));

            //Garbage collection
            startBlankWindow.on('close', function (){
                startBlankWindow = null;
            });
        } else {
            startBlankWindow.focus();
        }
    }
}

function closeApplication() {
    try {
        settingsWindow.close();
    } catch (err) {

    }
    try {
        mainWindow.webContents.send('remove:ote');
    } catch (err) {

    }
    app.quit();
}

function saveTranscription(data) {
    if (data.type === 'saveas') {
        saveTranscriptionAs(data);
        return;
    }
    fs.writeFile(data.default_filepath, data.tei, (err) => {
        if (err) {
            console.log("An error ocurred saving the file :" + err.message);
            mainWindow.webContents.send('save:feedback', {status: 'failed'});
            return;
        }
        mainWindow.webContents.send('save:feedback', {filepath: data.default_filepath, siglum: data.siglum, status: 'success'});
        return;
    });
}

function getFileMenu() {
    var menu;
    menu = Menu.getApplicationMenu();
    for (let i=0; i < menu.items.length; i+=1) {
        if(menu.items[i].label === 'File') {
            return menu.items[i];
        }
    }
    return null;
}

function enableMenuSaveItems() {
    var file_menu;
    file_menu = getFileMenu();
    if (file_menu !== null) {
        file_menu.submenu.items[3].enabled = true;
        file_menu.submenu.items[5].enabled = true;
        file_menu.submenu.items[6].enabled = true;
        file_menu.submenu.items[7].enabled = true;
    }
}

function disableMenuSaveItems() {
    var file_menu;
    file_menu = getFileMenu();
    if (file_menu !== null) {
        file_menu.submenu.items[3].enabled = false;
        file_menu.submenu.items[5].enabled = false;
        file_menu.submenu.items[6].enabled = false;
        file_menu.submenu.items[7].enabled = false;
    }
}

function saveTranscriptionAs(data) {
    dialog.showSaveDialog({defaultPath: data.default_filepath}, function (filepath) {
        if (filepath === undefined) {
            console.log('You did not press save');
            return;
        }
        fs.writeFile(filepath, data.tei, (err) => {
            if (err) {
                console.log("An error ocurred creating the file :" + err.message);
                mainWindow.webContents.send('save:feedback', {status: 'failed'});
                return;
            }
            console.log('file saved');
            mainWindow.webContents.send('save:feedback', {filepath: filepath, siglum: data.siglum, status: 'success'});
            return;

        });
    });
}

function editHeader() {
    //first thing is to ask the indexRenderer which hands are in the transcription
    mainWindow.webContents.send('get:hands');
}

function doEditHeader (hands) {

    try {
        headerWindow.focus();
    } catch (err) {
        headerWindow = new BrowserWindow({width: 770, height: 500, title: 'Edit Header', webPreferences: {
            nodeIntegration: true,
        }});
        if (process.env.NODE_ENV === 'production') {
            headerWindow.setMenu(null);
        }
        headerWindow.loadURL(url.format({
            pathname: path.join(__dirname, 'editHeader.html'),
            protocol: 'file:',
            slashes: true
        }));

        headerWindow.focus();
        headerWindow.webContents.on('did-finish-load', function() {
            headerWindow.webContents.send('showHeader', hands);
        });
    }

    //Garbage collection
    headerWindow.on('close', function (){
        headerWindow = null;
    });
}


function openHelpPage() {
    try {
        helpWindow.focus();
    } catch (err) {
        helpWindow = new BrowserWindow({width: 770, height: 500, title: 'Help',webPreferences: {
            nodeIntegration: true,
        }});
        if (process.env.NODE_ENV === 'production') {
            helpWindow.setMenu(null);
        }
        helpWindow.loadURL(url.format({
            pathname: path.join(__dirname, 'MUYA_OTE_Help.html'),
            protocol: 'file:',
            slashes: true
        }));
        helpWindow.focus();
    }

    //Garbage collection
    helpWindow.on('close', function (){
        helpWindow = null;
    });
}

function openAboutPage() {
    try {
        aboutWindow.focus();
    } catch (err) {
        aboutWindow = new BrowserWindow({width: 770, height: 400, title: 'About', webPreferences: {
            nodeIntegration: true,
        }});
        if (process.env.NODE_ENV === 'production') {
            aboutWindow.setMenu(null);
        }
        aboutWindow.loadURL(url.format({
            pathname: path.join(__dirname, 'about.html'),
            protocol: 'file:',
            slashes: true
        }));
        aboutWindow.focus();
    }

    //Garbage collection
    aboutWindow.on('close', function (){
        aboutWindow = null;
    });
}

function openAboutOtePage() {
    try {
        aboutOteWindow.focus();
    } catch (err) {
        aboutOteWindow = new BrowserWindow({width: 770, height: 500, title: 'About', webPreferences: {
            nodeIntegration: true,
        }});
        if (process.env.NODE_ENV === 'production') {
            aboutOteWindow.setMenu(null);
        }
        aboutOteWindow.loadURL(url.format({
            pathname: path.join(__dirname, 'ote', 'wce-ote', 'plugin', 'changelog.htm'),
            protocol: 'file:',
            slashes: true
        }));
        aboutOteWindow.focus();
    }

    //Garbage collection
    aboutOteWindow.on('close', function (){
        aboutOteWindow = null;
    });
}

function closeHeaderWindow() {
    try {
        headerWindow.close();
    } catch (err) {

    }
}


//create menu template
const menuTemplate = [
    {
        label: 'MUYA OTE',
        submenu: [
            {
                label: 'About',
                click() {
                    openAboutPage();
                }
            },
            {
                label: 'About OTE',
                click() {
                    openAboutOtePage();
                }
            },
            {
                label: 'Help',
                click() {
                    openHelpPage();
                }

            },
            {type: 'separator'},
            {
                label: 'Preferences',
                click() {
                    editSettings();
                }
            },
            {type: 'separator'},
            {
                label: 'Quit',
                accelerator: 'CmdOrCtrl+Q',
                click(){
                   closeApplication();
               }
           }
        ]
    },
    {
        label: 'File',
        submenu: [
            {
                label: 'Open',
                accelerator: 'CmdOrCtrl+O',
                click(){
                    closeHeaderWindow();
                    mainWindow.webContents.send('open:existing');
                }
            },
            {
                label: 'New',
                submenu: [
                    {
                        label: 'With Basetext',
                        click(){
                            closeHeaderWindow();
                            mainWindow.webContents.send('checkEditorState', 'basetext');
                        }
                    },
                    {
                        label: 'Without Basetext',
                        click(){
                            closeHeaderWindow();
                            mainWindow.webContents.send('checkEditorState', 'blank');
                        }
                    }
                ]
            },
            {type: 'separator'},
            {
                label: 'Edit header',
                enabled: false,
                click() {
                    editHeader();
                }
            },
            {type: 'separator'},
            {
                label: 'Close',
                accelerator: 'CmdOrCtrl+W',
                enabled: false,
                click() {
                    closeHeaderWindow();
                    mainWindow.webContents.send('editor:close');
                }
            },
            {
                label: 'Save',
                accelerator: 'CmdOrCtrl+S',
                enabled: false,
                click() {
                    mainWindow.webContents.send('save:xml' , {'type': 'save'});
                }
            },
            {
                label: 'Save as...',
                enabled: false,
                click() {
                    mainWindow.webContents.send('save:xml' , {'type': 'saveas'});
                }
            }
        ]
    }
];

//add developer tools item if not in production
if(process.env.NODE_ENV !== 'production'){
    menuTemplate.push({
        label: 'Developer tools',
        submenu: [
                  {
                    label: 'Toggle DevTools',
                    click(item, focusedWindow){
                        focusedWindow.toggleDevTools();
                    },
                  },
                  {role: 'reload'}
                 ]
    });
}

//add cut and paste for mac first attempt - did not work!
// if (process.platform === 'darwin') {
//     menuTemplate.push(
//       {
//         label: 'Cut',
//         accelerator: 'CmdOrCtrl+X',
//         selector: 'cut:'
//       }
//     )
//     menuTemplate.push(
//       {
//         label: 'Copy',
//         accelerator: 'CmdOrCtrl+C',
//         selector: 'copy:'
//       }
//     )
//     menuTemplate.push(
//       {
//         label: 'Paste',
//         accelerator: 'CmdOrCtrl+V',
//         selector: 'paste:'
//       }
//     )
// }
