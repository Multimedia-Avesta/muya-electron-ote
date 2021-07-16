/* This file reads the default header */

var HDR = (function () {
    
    //public declaration functions
    var getDefaultHeader;
    
    //public functions
    getDefaultHeader = function (siglum) {
        
        fs.readFile(path.join(__dirname, 'assets', 'xml', 'header.xml'), 'utf-8', (err, header_str) => {
            var today, xmlDoc, $xml, header;
            if(err){
                alert('An error ocurred reading the basetext file :' + err.message);
                return;
            }
            today = new Date();
            xmlDoc = $.parseXML(header_str);
            $xml = $(xmlDoc);
            $xml.find('editionStmt>edition>date').text(today.getFullYear() + '-' + (today.getMonth()+1) + '-' + today.getDate());
            $xml.find('sourceDesc>msDesc>msIdentifier>altIdentifier:first>idno').text(siglum);
            $xml.find('title[type="document"]').text('A Transcription of the Yasna in ' + siglum);
            $xml.find('title[type="document"]').attr('n', siglum);
            $xml.find('respStmt>name:first').text(remote.getGlobal('preferences').transcriber);
            header = '<teiHeader>' + $xml.find('teiHeader').html() + '</teiHeader>';
            ipcRenderer.send('set:default_header', {header: header});
            return header;
        });
    }
    
    return {
        getDefaultHeader: getDefaultHeader
    }
        
}());