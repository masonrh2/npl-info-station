/**
 * Load the html page (function with name doGet is called automatically by google web app)
 */
function doGet () {
  return HtmlService.createTemplateFromFile('index').evaluate()
}
function include (filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent()
}
// Create maps that will take a key (e.g. density) and return the corresponding column that contains that data depending on which sheet contains the desired dbn
// Note that adding or deleting a column will temporarily break this, until the values below are changed

// maximum DBN (reject dbns larger than this)
var maxDbn = 3498

// For sheet Blocks DB
var blocksSheet1Map = ([
  ['dbn', 0],
  ['block', 2],
  ['status', 3],
  ['shipment', 4],
  ['comment', 6],
  ['sector', 7],
  ['volume', 40],
  ['mass', 42],
  ['density', 44],
  ['densityDate', 45],
  ['goodEnd', 47],
  ['fiberPercentage', 49],
  ['missingRow', 59],
  ['thirteenHoles', 60],
  ['lightTransDate', 64],
  ['scintillation', 65],
  ['scintRatio', 67],
  ['scintDate', 69],
  ['natLightDate', 70]
])
// For sheet Blocks1364DB
var blocksSheet2Map = new Map([
  ['dbn', 0],
  ['block', 2],
  ['status', 3],
  ['shipment', 4],
  ['sector', 6],
  ['comment', 7],
  ['volume', 40],
  ['mass', 42],
  ['density', 44],
  ['densityDate', 45],
  ['goodEnd', 47],
  ['fiberPercentage', 49],
  ['missingRow', 59],
  ['thirteenHoles', 60],
  ['lightTransDate', 64],
  ['scintillation', 65],
  ['scintRatio', 67],
  ['scintDate', 69],
  ['natLightDate', 70]
])

// declare variable that will be needed by other functions after loadFiles has run
var filesLoaded = false
var database
var blocksSheet1
var blocksSheet2
var lightTransOriginalFolder
var lightTransCroppedFolder
var lightTransArchiveOriginalFolder
var naturalLightFolder
var naturalLightArchiveFolder

/**
 * locate and save database sheets and all testing folders
 */
function loadFiles () {
  let testingFolder
  let QATestsFolder
  let lightTransTestFolder
  let databaseSheets
  // Note that changing the names or locations of the folders in google drive may temporarily break this, until the paths below are chagned
  // Begin spaghetti of if statements, although trees and recursion is another possiblity...
  // Locate testing folder... (for Mason's drive)
  // Consider just searching for folder/file names directly form drive when migrating to sphenix emcal account
  if (DriveApp.getFoldersByName('testing').hasNext()) {
  // ...found testing folder, now save it
    testingFolder = DriveApp.getFoldersByName('testing').next()
    // Locate sPHENIX folder...
    if (testingFolder.getFoldersByName('sPHENIX').hasNext()) {
      // ...found sPHENIX folder, now locate database...
      if (testingFolder.getFoldersByName('sPHENIX').next().getFilesByName('Blocks database').hasNext()) {
        // ...found database, now save it
        database = testingFolder.getFoldersByName('sPHENIX').next().getFilesByName('Blocks database').next()
        // Get database Spreadsheet (Sheet[]) from database file id and find the sheets Blocks DB and Blocks1364DB...
        databaseSheets = Sheets.Spreadsheets.get(database.getId()).sheets
        // ...loop through the sheets until you find the desired sheets, then save them...
        for (let i = 0; i < databaseSheets.length; i++) {
          if (databaseSheets[i].properties.title === 'Blocks DB') {
            blocksSheet1 = databaseSheets[i]
            continue
          }
          if (databaseSheets[i].properties.title === 'Blocks1364DB') {
            blocksSheet2 = databaseSheets[i]
          }
        }
        // ...check if you found both sheets
        if (blocksSheet1 == null || blocksSheet2 == null) {
          // Failed to locate both sheets
          Logger.log('failed to locate database sheet(s) in database spreadsheet')
        }
      } else {
        // ...failed to locate database
        Logger.log('failed to locate database in sPHENIX')
      }
    } else {
      // ...failed to locate sPHENIX folder
      Logger.log('failed to locate sPHENIX folder in testing folder')
    }
    // Locate sPHENIX--NEW folder...
    if (testingFolder.getFoldersByName('sPHENIX--NEW').hasNext()) {
      // ...found sPHENIX--NEW folder, now locate QA tests folder...
      if (testingFolder.getFoldersByName('sPHENIX--NEW').next().getFoldersByName('QA tests').hasNext()) {
        // ...found QA tests folder, now save it
        QATestsFolder = testingFolder.getFoldersByName('sPHENIX--NEW').next().getFoldersByName('QA tests').next()
        // Locate all light transmission and natural light folders
        // Locate light transmission test folder...
        if (QATestsFolder.getFoldersByName('Light Transmission Test').hasNext()) {
          // ...found light transmission test folder, now save it
          lightTransTestFolder = QATestsFolder.getFoldersByName('Light Transmission Test').next()
          // Locate light transmission block pictures folder...
          if (lightTransTestFolder.getFoldersByName('Block pictures').hasNext()) {
            // ...found block pictures folder
            // Locate original folder...
            if (lightTransTestFolder.getFoldersByName('Block pictures').next().getFoldersByName('Original').hasNext()) {
              // ...found original folder, now save it
              lightTransOriginalFolder = lightTransTestFolder.getFoldersByName('Block pictures').next().getFoldersByName('Original').next()
            } else {
              // ...failed to locate original folder
              Logger.log('failed to locate original folder in light transmission test/block pictures')
            }
            // Locate cropped folder...
            if (lightTransTestFolder.getFoldersByName('Block pictures').next().getFoldersByName('Cropped').hasNext()) {
              // ...found cropped folder, now save it
              lightTransCroppedFolder = lightTransTestFolder.getFoldersByName('Block pictures').next().getFoldersByName('Cropped').next()
            } else {
              // ...failed to find cropped folder
              Logger.log('failed to find cropped folder in light transmission test/block pictures')
            }
          } else {
            // ...failed to find light transmission block pictures folder
            Logger.log('failed to block pictures folder in light transmission test')
          }
        } else {
          // ...failed to locate light transmission test folder
          Logger.log('failed to locate light transmission test folder in QA tests')
        }
        // Locate light transmission archive folder...
        if (QATestsFolder.getFoldersByName('LightTransmissionArchive').hasNext()) {
          // ...found light transmission archive folder, now locate block pictures...
          if (QATestsFolder.getFoldersByName('LightTransmissionArchive').next().getFoldersByName('Block pictures').hasNext()) {
            // ...found block pictures folder, now locate original folder...
            if (QATestsFolder.getFoldersByName('LightTransmissionArchive').next().getFoldersByName('Block pictures').next().getFoldersByName('Original').hasNext()) {
              // ...found original folder, now save it
              lightTransArchiveOriginalFolder = QATestsFolder.getFoldersByName('LightTransmissionArchive').next().getFoldersByName('Block pictures').next().getFoldersByName('Original').next()
            } else {
              // ...failed to locate original folder
              Logger.log('failed to locate original folder in light transmission archive/block pictures')
            }
          } else {
            // ...failed to locate block pictures folder
            Logger.log('failed to locate block pictures folder in light transmission archive')
          }
        } else {
          // ...failed to locate light transmission archive folder
          Logger.log('failed to locate light transmission archive folder in QA tests')
        }
        // Locate natural light folder...
        if (QATestsFolder.getFoldersByName('Physical Pictures').hasNext()) {
          // ...found natural light folder, now save it
          naturalLightFolder = QATestsFolder.getFoldersByName('Physical Pictures').next()
        } else {
          // ...failed to find natural light folder
          Logger.log('failed to locate physical pictures in QA tests')
        }
        // Locate natural light archive folder...
        if (QATestsFolder.getFoldersByName('NaturalLightArchive').hasNext()) {
          // ...found natural light archive, now save it
          naturalLightArchiveFolder = QATestsFolder.getFoldersByName('NaturalLightArchive').next()
        } else {
          // ...failed to locate natural light archive
          Logger.log('failed to locate natural light archive in QA tests')
        }
      } else {
        // ... failed to locate QA tests folder
        Logger.log('failed to locate QA tests folder in sPHENIX--NEW')
      }
    } else {
      // ...failed to locate sPHENIX--NEW folder
      Logger.log('failed to locate sPHENIX--NEW folder in testing folder')
    }
  } else {
    // ...failed to locate testing folder
    Logger.log('unable to locate testing folder in drive')
  }
  filesLoaded = true
}

/**
 * Get all of this block's relevant data as stringified JSON
 * It seems to be necessary to convert to a string BEFORE the map is passed to the html script,
 * because passing a map object, which should work, returned a seemingly empty object to the html script
 * @param {number} dbn The block's DBN
 * @return {string} The Map that's usually returned by loadTestingData, but converted to a string so that it can be passed to the html
 */
function loadTestingDataAsStringifiedJSON (dbn) {
  return JSON.stringify(Array.from(loadTestingData(dbn).entries()))
}

/**
 * Get all of this block's relevant data from the database in a Map
 * @param {number} dbn The block's DBN
 * @return {Map} A Map whose keys are block properties (e.g. 'block' or 'lightTransDate') which point to the relevant information (e.g. 23 or 20201225)
 */
function loadTestingData (dbn) {
  // Default dbn for testing only:
  // dbn = 2000
  // if files aren't loaded, load them
  if (!filesLoaded) {
    loadFiles()
  }
  // check for NaN
  if (isNaN(dbn)) {
    // return an empty map
    return new Map()
  }
  // The dbn passed from the html doesn't seem to be an int, so make sure it is (dbn 1 would return info for dbn 10 otherwise)
  dbn = Math.floor(dbn)
  // Reject invalid dbns and choose the correct sheet and map for valid dbns
  if (dbn < 0 || dbn > maxDbn) {
    Logger.log('the input dbn was out of range')
    return new Map()
  } else if (dbn < 2000) {
    var currentSheet = blocksSheet1
    var currentSheetId = blocksSheet1.properties.sheetId
    var currentSheetName = blocksSheet1.properties.title
    var currentRowOffset = 2
    var currentSheetMap = blocksSheet1Map
  } else {
    var currentSheet = blocksSheet2
    var currentSheetId = blocksSheet2.properties.sheetId
    var currentSheetName = blocksSheet2.properties.title
    var currentRowOffset = 2 - 2000
    var currentSheetMap = blocksSheet2Map
  }
  var row = dbn + currentRowOffset
  // Construct a cell range in A1 format for the block's row
  var ref = "'" + currentSheetName + "'!" + 'A' + row + ':BZ' + row
  Logger.log('the cell range generated was: ' + ref)
  var blockData = Sheets.Spreadsheets.Values.get(database.getId(), ref).values[0]
  // Create a new map that maps block properites to their actual values
  var blockMap = new Map()
  for (let pair of currentSheetMap) {
    // Logger.log("currentSheetMap has key " + pair[0] + " -> " + blockData[pair[1]]);
    blockMap.set(pair[0], blockData[pair[1]])
  }
  // Logger.log('stringify currentSheetMap produced: ' + JSON.stringify(Array.from(currentSheetMap.entries())))
  // Logger.log('stringify blockMap produced: ' + JSON.stringify(Array.from(blockMap.entries())))
  return blockMap
}

/**
 * Get urls for each of this block's test images
 * @param {number} dbn The block's DBN
 * @return {string[]} Array of image urls [LT_W, LT_N, LT_cropped_W, LT_cropped_N, NL_W, NL_N]
 */
function getImageUrls (dbn) {
  // Default dbn for testing only:
  // var dbn = 811
  // if files aren't loaded, load them
  if (!filesLoaded) {
    loadFiles()
  }
  let blockMap = loadTestingData(dbn)
  let lightTransImgWId
  let lightTransImgNId
  let lightTransCroppedImgWId
  let lightTransCroppedImgNId
  let natLightImgWId
  let natLightImgNId
  // Set the folders to search (archive or normal folder...)
  if (parseInt(blockMap.get('lightTransDate').substring(0, 4)) === 2019) {
    // If light transmission picture date is from 2019, use the archive
    var currentlightTransOriginalFolder = lightTransArchiveOriginalFolder
  } else {
    // Otherwise, use the normal folder
    var currentlightTransOriginalFolder = lightTransOriginalFolder
  }
  if (parseInt(blockMap.get('lightTransDate').substring(0, 4)) === 2019) {
    // If natural light picture date is from 2019, use the archive
    var currentNatLightFolder = naturalLightArchiveFolder
  } else {
    // Otherwise, use the normal folder
    var currentNatLightFolder = naturalLightFolder
  }

  // Check necessary folders and files in the drive
  // Get all possible file names for light transmission images (wide and narrow)
  let lightTransImgNamesWithoutExtensionWide = formatFileNamePrefixesForLightTrans(dbn)
  lightTransImgNamesWithoutExtensionWide.forEach(function (element, index, array) {
    array[index] = element + '-W'
  })
  let lightTransImgNamesWithoutExtensionNarrow = formatFileNamePrefixesForLightTrans(dbn)
  lightTransImgNamesWithoutExtensionNarrow.forEach(function (element, index, array) {
    array[index] = element + '-N'
  })
  // Locate the light transmission date folder
  // Assumes that the date in database matches the date folder name always (though getDateFolder could be adapted to handle LT as well...)
  if (currentlightTransOriginalFolder.getFoldersByName(blockMap.get('lightTransDate')).hasNext()) {
    // ...found light transmission date folder, now locate wide and narrow images
    let dateFolder = currentlightTransOriginalFolder.getFoldersByName(blockMap.get('lightTransDate')).next()
    lightTransImgWId = searchFolderForFiles(dateFolder, lightTransImgNamesWithoutExtensionWide)
    // Logger.log('tried to set lightTransImgWId to ' + searchFolderForFiles(dateFolder, lightTransImgNamesWithoutExtensionWide) + ' for names ' + lightTransImgNamesWithoutExtensionWide)
    lightTransImgNId = searchFolderForFiles(dateFolder, lightTransImgNamesWithoutExtensionNarrow)
    // Logger.log('tried to set lightTransImgNId to ' + searchFolderForFiles(dateFolder, lightTransImgNamesWithoutExtensionNarrow) + ' for names ' + lightTransImgNamesWithoutExtensionNarrow)
  } else {
    // ...failed to locate light transmission date folder
    // Logger.log('could not locate ' + blockMap.get('lightTransDate') + ' in ' + currentlightTransOriginalFolder.getName())
  }

  // Locate cropped light transmission images...
  lightTransCroppedImgWId = searchFolderForFiles(lightTransCroppedFolder, lightTransImgNamesWithoutExtensionWide)
  lightTransCroppedImgNId = searchFolderForFiles(lightTransCroppedFolder, lightTransImgNamesWithoutExtensionNarrow)

  // Locate natural light date folder...
  let natLightDateFolder = getDateFolder(currentNatLightFolder, blockMap.get('natLightDate'), dbn)
  if (natLightDateFolder != null) {
    if (currentNatLightFolder.getFoldersByName(natLightDateFolder).hasNext()) {
      // ...found natural light date folder, now find
      // Loop through all files
      let fileIterator = currentNatLightFolder.getFoldersByName(natLightDateFolder).next().getFiles()
      while (fileIterator.hasNext()) {
        let file = fileIterator.next()
        let splitName = file.getName().split(/[._-]/)
        splitName.shift() // discard first element of array ('DBN')
        splitName.pop() // discard last element of array ('JPG')
        if (splitName.includes(dbn.toString())) {
          // This is one of the files we need!
          // Check if it's N or W and save it's file Id to whichever it is
          if (splitName[splitName.length - 1] === 'W') {
            natLightImgWId = file.getId()
          } else if (splitName[splitName.length - 1] === 'N') {
            natLightImgNId = file.getId()
          } else {
            Logger.log('unable to identify W or N for file name ' + file.getName())
          }
        }
      }
    } else {
      // ...failed to find natural light folder
      Logger.log('failed to find the folder returned by getDateFolder')
    }
  } else {
    // getDateFolder failed to find a suitable folder
    Logger.log('getDateFolder failed to find a suitable folder for dbn ' + dbn + ' with date ' + blockMap.get('natLightDate') + ' in ' + currentNatLightFolder.getName())
  }
  // Logger.log('!our new function returned ' + getDateFolder(naturalLightFolder, '20200305', 811))
  var imageUrls = [
    lightTransImgWId,
    lightTransImgNId,
    lightTransCroppedImgWId,
    lightTransCroppedImgNId,
    natLightImgWId, // currentNatLightFolder.getFoldersByName(blockMap.get('natLightDate')).next().getFilesByName(lightTransImgNameWide).next().getId(),
    natLightImgNId // currentNatLightFolder.getFoldersByName(blockMap.get('natLightDate')).next().getFilesByName(lightTransImgNameNarrow).next().getId()
  ]
  imageUrls.forEach(function (element, index, array) {
    if (element != null) {
      array[index] = 'https://drive.google.com/uc?id=' + element
    }
  })
  Logger.log('getImageUrls returned: ' + imageUrls)
  return imageUrls
}
/**
 * Get file id of the first matching file in fileNameWithoutExtensionArray that appears in folderToSearch
 * @param {*} folderToSearch Folder to search
 * @param {*} fileNameWithoutExtensionArray Array of files names to search, searching for the first name first
 * @return {string} File id of the first matching file
 */
function searchFolderForFiles (folderToSearch, fileNameWithoutExtensionArray) {
  // First check for .JPG, since that covers ALMOST all of the images, and this process is much faster...
  // Logger.log('fileNameWithoutExtensionArray was ' + fileNameWithoutExtensionArray)
  let jpgArray = [...fileNameWithoutExtensionArray]
  jpgArray.forEach(function (element, index, array) {
    array[index] = element + '.JPG'
  })
  // Logger.log('jpgArray is now ' + jpgArray)
  for (let i = 0; i < jpgArray.length; i++) {
    if (folderToSearch.getFilesByName(jpgArray[i]).hasNext()) {
      Logger.log('correctly identified a good file name')
      return folderToSearch.getFilesByName(jpgArray[i]).next().getId()
    } else {
      Logger.log('rejected a good file name...')
    }
  }
  Logger.log("this probably shouldn't have happened unless you were passed weird dbn that has .png")
  // Otherwise, look for something weird like a random .png...this process is much less efficient...
  // and only search the file name at the end of the array (no zeroes added), because these random .png files seem to
  // consistenly follow this nonstandard naming convention (less nice DBN_642 instead of standard DBN_0642)
  let noZeroesName = fileNameWithoutExtensionArray[fileNameWithoutExtensionArray.length - 1]
  let fileIterator = folderToSearch.getFiles()
  while (fileIterator.hasNext()) {
    let file = fileIterator.next()
    // Logger.log('rare case, and searchFolderForFiles is going to compare ' + file.getName().substring(0, noZeroesName.length + 1) + ' and ' + noZeroesName)
    if (file.getName().substring(0, noZeroesName.length) === noZeroesName) {
      return file.getId()
    }
  }
  // Otherwise, we tried our damnedest, but could not find a matching file...
  return null
}

/**
 * Gets an array of all possible image file name prefixes for the block's light transmission
 * e.g. dbn 12 returns [DBN_12, DBN_012, DBN_0012] and dbn 1234 returns [DBN_1234]
 * @param {number} inputDbn The block's DBN
 * @return {string} The formatted block name without -W or -N, e.g. DBN_0123
 */
function formatFileNamePrefixesForLightTrans (inputDbn) {
  // Default dbn for testing only:
  // var inputDbn = 1
  let dbnString = inputDbn.toString()
  let formattedNames = []
  // Add the approriate number of zeros the appropriate number of times...
  for (let i = dbnString.length; i < 5; i++) {
    let numZeroes = 4 - i
    let zeroes = ''
    for (let j = numZeroes; j > 0; j--) {
      zeroes += '0'
    }
    formattedNames.push('DBN_' + zeroes + dbnString)
  }
  // Logger.log('prefixes for dbn ' + inputDbn + ' are ' + formattedNames)
  return formattedNames
}

/**
 * Get the most recent date folder in the passed folder that contains an image of the passed dbn
 * Currently is designed only for use with natural light folders
 * @param {Folder} folder Folder to search
 * @param {sting} date Date to search
 * @param {number} dbn Block DBN
 * @return {string} Most recent matching folder
 */
function getDateFolder (folderToSearch, date, dbn) {
  let folderToReturnName
  // Find the date folder
  // Otherwise, search folderToSearch for candidate folders with the correct date
  // Find folder names to add to the array by looping through all of the passed folder's subfolders
  let subFolderIterator = folderToSearch.getFolders()
  while (subFolderIterator.hasNext()) {
    let folder = subFolderIterator.next()
    // Check if folder has name that starts with the date...
    if (folder.getName().substring(0, 8) === date) {
      // ...this folder is the correct date, now see if it contains an image of the passed dbn...
      let fileIterator = folder.getFiles()
      while (fileIterator.hasNext()) {
        let file = fileIterator.next()
        let splitName = file.getName().split(/[_-]/)
        splitName.shift()
        splitName.pop()
        if (splitName.includes(dbn.toString())) {
          // This folder matches date and has a file with the dbn
          Logger.log('FOUND a matching file!')
          // Check if we've already found a folder...
          if (folderToReturnName == null) {
            // ...we haven't found a folder yet, so save this one
            folderToReturnName = folder.getName()
            break
          } else {
            // ... already found a matching folder, overwrite it if this one is more recent
            // Compare the length of the folder names
            if (folder.getName().length > folderToReturnName.length) {
              // This folder has a longer name, so assume it's more recent and overwrite return folder
              folderToReturnName = folder.getName()
              break
            } else if (folder.getName().length === folderToReturnName.length) {
              // They have the same length, so compare their suffixes as ints
              if (parseInt(folder.getName().split(/[.-]/)[1]) > parseInt(folderToReturnName.split(/[.-]/)[1])) {
                // This folder has a more recent prefix, so overwrite return folder
                folderToReturnName = folder.getName()
                break
              }
            }
          }
        }
      }
    }
  }
  return folderToReturnName
}
