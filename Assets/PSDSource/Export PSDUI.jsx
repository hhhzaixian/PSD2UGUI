﻿// **************************************************
// This file created by Brett Bibby (c) 2010-2013
// You may freely use and modify this file as you see fit
// You may not sell it
//**************************************************
// hidden object game exporter
//$.writeln("=== Starting Debugging Session ===");

// enable double clicking from the Macintosh Finder or the Windows Explorer
#target photoshop

// debug level: 0-2 (0:disable, 1:break on error, 2:break at beginning)
// $.level = 0;
// debugger; // launch debugger on next line

var sceneData;
var sourcePsd;
var duppedPsd;
var destinationFolder;
var uuid;
var sourcePsdName;

main();

function main(){
    // got a valid document?
    if (app.documents.length <= 0)
    {
        if (app.playbackDisplayDialogs != DialogModes.NO)
        {
            alert("You must have a document open to export!");
        }
        // quit, returning 'cancel' makes the actions palette not record our script
        return 'cancel';
    }

    // ask for where the exported files should go
    destinationFolder = Folder.selectDialog("Choose the destination for export.");
    if (!destinationFolder)
    {
        return;
    }

    // cache useful variables
    uuid = 1;
    sourcePsdName = app.activeDocument.name;
    var layerCount = app.documents[sourcePsdName].layers.length;
    var layerSetsCount = app.documents[sourcePsdName].layerSets.length;

    if ((layerCount <= 1) && (layerSetsCount <= 0))
    {
        if (app.playbackDisplayDialogs != DialogModes.NO)
        {
            alert("You need a document with multiple layers to export!");
            // quit, returning 'cancel' makes the actions palette not record our script
            return 'cancel';
        }
    }

    // setup the units in case it isn't pixels
    var savedRulerUnits = app.preferences.rulerUnits;
    var savedTypeUnits = app.preferences.typeUnits;
    app.preferences.rulerUnits = Units.PIXELS;
    app.preferences.typeUnits = TypeUnits.PIXELS;

    // duplicate document so we can extract everythng we need
    duppedPsd = app.activeDocument.duplicate();
    duppedPsd.activeLayer = duppedPsd.layers[duppedPsd.layers.length - 1];

    hideAllLayers(duppedPsd);

    // export layers
    sceneData = "<?xml version=\"1.0\" encoding=\"utf-8\"?>";
    sceneData += "<PSDUI>";
    
    sceneData += "<psdSize>";
    sceneData += "<width>" + duppedPsd.width.value + "</width>";
    sceneData += "<height>" + duppedPsd.height.value+ "</height>";
    sceneData += "</psdSize>";
    
    exportLayerSet(app.activeDocument);

    sceneData += "</PSDUI>";
    //$.writeln(sceneData);

    duppedPsd.close(SaveOptions.DONOTSAVECHANGES);

    // create export
    var sceneFile = new File(destinationFolder + "/" + destinationFolder.name + ".xml");
    sceneFile.open('w');
    sceneFile.writeln(sceneData);
    sceneFile.close();

    app.preferences.rulerUnits = savedRulerUnits;
    app.preferences.typeUnits = savedTypeUnits;
}

function exportLayerSet(obj)
{
    sceneData += "<layers>";
    for (var i = obj.layers.length - 1; 0 <= i; i--)
    {
        if (obj.layers[i].typename == "LayerSet")
        {
            if (obj.layers[i].name.search("ScrollView") >= 0)
            {
                exportScrollView(obj.layers[i]);
            }
            else if (obj.layers[i].name.search("Grid") >= 0)
            {
                exportGrid(obj.layers[i]);
            }
            else if (obj.layers[i].name.search("Button") >= 0)
            {
                exportButton(obj.layers[i]);
            }
            else
            {
                sceneData += "<Layer>";
                 sceneData += "<type>Normal</type>";
                sceneData += "<name>" + obj.layers[i].name + "</name>";
                exportLayerSet(obj.layers[i]);
                sceneData += "<images>";
                for (var j = obj.layers[i].artLayers.length - 1; 0 <= j; j--)
                {
                    exportArtLayer(obj.layers[i].artLayers[j]);
                }
                sceneData += "</images>";
                sceneData += "</Layer>";
            }
        }
    }
    sceneData += "</layers>";
}

function exportScrollView(obj)
{
    var itemName = obj.name.substring(0, obj.name.search("@"));
    sceneData += ("<Layer>\n<type>ScrollView</type>\n<name>" + itemName + "</name>\n");

    var params = obj.name.split(":");

    if (params.length < 4)
    {
        alert(obj.name + "-------Layer's name is illegal------------");
    }

    var recSize;
    if (obj.layers[obj.layers.length - 1].name.search("@Size") < 0)
    {
        alert("Bottom layer's name doesn't contain '@Size'");
    }
    else
    {
        obj.layers[obj.layers.length - 1].visible = true;

        recSize = getLayerRec(duppedPsd.duplicate());

        sceneData += "<position>";
        sceneData += "<x>" + recSize.x + "</x>";
        sceneData += "<y>" + recSize.y + "</y>";
        sceneData += "</position>";

        sceneData += "<size>";
        sceneData += "<width>" + recSize.width + "</width>";
        sceneData += "<height>" + recSize.height + "</height>";
        sceneData += "</size>";

        obj.layers[obj.layers.length - 1].visible = false;
    }

    var totalContentCount = obj.layers.length - 1;  
    
    obj.layers[0].visible = true;
    var rec0 = getLayerRec(duppedPsd.duplicate());
    obj.layers[0].visible = false;
    
    var renderHorizontalGap = params[2] > 1 ? (recSize.width - rec0.width * params[2])/(params[2] - 1) : 0;
    var renderVerticalGap = params[1] > 1 ? (recSize.height - rec0.height * params[1])/(params[1] - 1) : 0;

    sceneData += "<arguments>";
    sceneData += "<string>" + params[1] + "</string>";   //行数
    sceneData += "<string>" + params[2] + "</string>";   //列数
    sceneData += "<string>" + rec0.width + "</string>";   //render width
    sceneData += "<string>" + rec0.height + "</string>";   //render height
    sceneData += "<string>" + renderHorizontalGap + "</string>"; //水平间距
    sceneData += "<string>" + renderVerticalGap + "</string>"; //垂直间距
    sceneData += "<string>" + params[3] + "</string>";     //滑动方向
    sceneData += "</arguments>";



    //~     sceneData += "<images>\n";
    //~     
    //~     for(var i = obj.layers.length-1; 0<=i; i--)
    //~     {
    //~         exportArtLayer(obj.layers[i]);
    //~     }
    //~     
    //~     sceneData += "\n</images>";
    sceneData += "</Layer>";
}

function exportGrid(obj)
{
    var itemName = obj.name.substring(0, obj.name.search("@"));
    sceneData += ("<Layer>\n<type>Grid</type>\n<name>" + itemName + "</name>\n");

    var params = obj.name.split(":");

    if (params.length < 3)
    {
        alert("Layer's name is illegal");
    }

    var recSize;
    if (obj.layers[obj.layers.length - 1].name.search("@Size") < 0)
    {
        alert("Bottom layer's name doesn't contain '@Size'");
    }
    else
    {
        obj.layers[obj.layers.length - 1].visible = true;

        recSize = getLayerRec(duppedPsd.duplicate());

        sceneData += "<position>";
        sceneData += "<x>" + recSize.x + "</x>";
        sceneData += "<y>" + recSize.y + "</y>";
        sceneData += "</position>";

        sceneData += "<size>";
        sceneData += "<width>" + recSize.width + "</width>";
        sceneData += "<height>" + recSize.height + "</height>";
        sceneData += "</size>";

        obj.layers[obj.layers.length - 1].visible = false;
    }

    var totalContentCount = obj.layers.length - 1;  
    
    obj.layers[0].visible = true;
    var rec0 = getLayerRec(duppedPsd.duplicate());
    obj.layers[0].visible = false;
    
    var renderHorizontalGap = params[2] > 1 ? (recSize.width - rec0.width * params[2])/(params[2] - 1) : 0;
    var renderVerticalGap = params[1] > 1 ? (recSize.height - rec0.height * params[1])/(params[1] - 1) : 0;

    sceneData += "<arguments>";
    sceneData += "<string>" + params[1] + "</string>";   //行数
    sceneData += "<string>" + params[2] + "</string>";   //列数
    sceneData += "<string>" + rec0.width + "</string>";   //render width
    sceneData += "<string>" + rec0.height + "</string>";   //render height
    sceneData += "<string>" + renderHorizontalGap + "</string>"; //水平间距
    sceneData += "<string>" + renderVerticalGap + "</string>"; //垂直间距
    sceneData += "</arguments>";

    //~     sceneData += "<images>\n";
    //~     
    //~     for(var i = obj.layers.length-1; 0<=i; i--)
    //~     {      
    //~         exportArtLayer(obj.layers[i]);
    //~     }
    //~     sceneData += "\n</images>\n</Layer>\n";

    sceneData += "</Layer>";
}

function exportButton(obj)
{
    var itemName = obj.name.substring(0, obj.name.search("@"));
    sceneData += ("<Layer>\n<type>Button</type>\n<name>" + itemName + "</name>\n");

    sceneData += "<images>\n";

    for (var i = obj.layers.length - 1; 0 <= i; i--)
    {
        exportArtLayer(obj.layers[i]);
    }

    sceneData += "\n</images>\n</Layer>";
}

function exportArtLayer(obj)
{
    sceneData += "<Image>\n";
    if (LayerKind.TEXT == obj.kind)
    {
        exportLabel(obj);
    }
    else if (obj.name.search("Texture") >= 0)
    {
        exportTexture(obj);
    }
    else
    {
        exportImage(obj);
    }
    sceneData += "</Image>\n";
}

function exportLabel(obj)
{
    sceneData += "<imageType>" + "Label" + "</imageType>\n";
    var validFileName = makeValidFileName(obj.name);
    sceneData += "<name>" + validFileName + "</name>\n";
    obj.visible = true;
    saveScenePng(duppedPsd.duplicate(), validFileName, false);
    obj.visible = false;
    sceneData += "<arguments>";
    sceneData += "<string>" + obj.textItem.color.rgb.hexValue + "</string>";
    sceneData += "<string>" + obj.textItem.font + "</string>";
    sceneData += "<string>" + obj.textItem.size.value + "</string>";
    sceneData += "<string>" + obj.textItem.contents + "</string>";
    sceneData += "</arguments>";
}

function exportTexture(obj)
{
    var validFileName = makeValidFileName(obj.name);
    sceneData += "<imageType>" + "Texture" + "</imageType>\n";
    sceneData += "<name>" + validFileName + "</name>\n";
    obj.visible = true;
    saveScenePng(duppedPsd.duplicate(), validFileName, false);
    obj.visible = false;
}

function exportImage(obj)
{
    var validFileName = makeValidFileName(obj.name);
    sceneData += "<name>" + validFileName + "</name>\n";

    if (obj.name.search("Common") >= 0)
    {
        sceneData += "<imageSource>" + "Common" + "</imageSource>\n";
        obj.visible = true;
        saveScenePng(duppedPsd.duplicate(), validFileName, false);
        obj.visible = false;
    }
    else
    {
        sceneData += "<imageSource>" + "Custom" + "</imageSource>\n";

        obj.visible = true;
        saveScenePng(duppedPsd.duplicate(), validFileName, true);
        obj.visible = false;
    }

    if (obj.name.search("9Slice") >= 0)
    {
        sceneData += "<imageType>" + "SliceImage" + "</imageType>\n";
    }
    else
    {
        sceneData += "<imageType>" + "Image" + "</imageType>\n";
    }
}

function hideAllLayers(obj)
{
    hideLayerSets(obj);
}

function hideLayerSets(obj)
{
    for (var i = obj.layers.length - 1; 0 <= i; i--)
    {
        if (obj.layers[i].typename == "LayerSet")
        {
            hideLayerSets(obj.layers[i]);
        }
        else
        {
            obj.layers[i].visible = false;
        }
    }
}

function getLayerRec(psd)
{
    // we should now have a single art layer if all went well
    psd.mergeVisibleLayers();
    // figure out where the top-left corner is so it can be exported into the scene file for placement in game
    // capture current size
    var height = psd.height.value;
    var width = psd.width.value;
    var top = psd.height.value;
    var left = psd.width.value;
    // trim off the top and left
    psd.trim(TrimType.TRANSPARENT, true, true, false, false);
    // the difference between original and trimmed is the amount of offset
    top -= psd.height.value;
    left -= psd.width.value;
    // trim the right and bottom
    psd.trim(TrimType.TRANSPARENT);
    // find center
    top += (psd.height.value / 2)
    left += (psd.width.value / 2)
    // unity needs center of image, not top left
    top = -(top - (height / 2));
    left -= (width / 2);

    height = psd.height.value;
    width = psd.width.value;

    psd.close(SaveOptions.DONOTSAVECHANGES);

    return {
        y: top,
        x: left,
        width: width,
        height: height
    };
}

function saveScenePng(psd, fileName, writeToDisk)
{
    // we should now have a single art layer if all went well
    psd.mergeVisibleLayers();
    // figure out where the top-left corner is so it can be exported into the scene file for placement in game
    // capture current size
    var height = psd.height.value;
    var width = psd.width.value;
    var top = psd.height.value;
    var left = psd.width.value;
    // trim off the top and left
    psd.trim(TrimType.TRANSPARENT, true, true, false, false);
    // the difference between original and trimmed is the amount of offset
    top -= psd.height.value;
    left -= psd.width.value;
    // trim the right and bottom
    psd.trim(TrimType.TRANSPARENT);
    // find center
    top += (psd.height.value / 2)
    left += (psd.width.value / 2)
    // unity needs center of image, not top left
    top = -(top - (height / 2));
    left -= (width / 2);

    height = psd.height.value;
    width = psd.width.value;


     if (writeToDisk)
     {
        // save the image
        var pngFile = new File(destinationFolder + "/" + fileName + ".png");
        var pngSaveOptions = new PNGSaveOptions();
        psd.saveAs(pngFile, pngSaveOptions, true, Extension.LOWERCASE);
    }
    psd.close(SaveOptions.DONOTSAVECHANGES);

    var rec = {
        y: top,
        x: left,
        width: width,
        height: height
    };
    // save the scene data
    sceneData += "<position>";
    sceneData += "<x>" + rec.x + "</x>";
    sceneData += "<y>" + rec.y + "</y>";
    sceneData += "</position>";

    sceneData += "<size>";
    sceneData += "<width>" + rec.width + "</width>";
    sceneData += "<height>" + rec.height + "</height>";
    sceneData += "</size>";
}

function makeValidFileName(fileName)
{
    var validName = fileName.replace(/^\s+|\s+$/gm, ''); // trim spaces
    validName = validName.replace(/[\\\*\/\?:"\|<>]/g, ''); // remove characters not allowed in a file name
    validName = validName.replace(/[ ]/g, '_'); // replace spaces with underscores, since some programs still may have troubles with them
    
    if (validName.match("Common"))
    {
        validName = validName.substring (validName.lastIndexOf ("@") + 1);  //截取@后面之后的字符串作为图片的名称。
    }
    else if(!sourcePsdName.match("Common"))    // 判断是否为公用的PSD素材文件，如果不是，则自动为图片增加后缀，防止重名。 公用psd文件的图片层不允许重名。
    {
        validName += "_" + uuid++;
    }
    
    // $.writeln(validName);
    return validName;
}