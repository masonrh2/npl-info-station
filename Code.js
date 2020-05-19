/**
 * Load the HTML page (called automatically when the web app url page is loaded)
 */
function doGet () {
  return HtmlService.createTemplateFromFile('index').evaluate()
}
/**
 * Allows index.html to access other files (such as css.html)
 * Includes the specified file in the HTML when called in the HTML
 * @param {string} filename
 */
function include (filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent()
}

// Maximum DBN (reject dbns larger than this)
var maxDbn = 3498

// Declare variables that will be needed by other functions after loadFiles has run
var filesLoaded = false
var error
var database
var blocksSheet1
var blocksSheet2
var lightTransOriginalFolder
var lightTransCroppedFolder
var lightTransArchiveOriginalFolder
var lightTransAnalysisFolder
var lightTransArchiveAnalysisFolder
var naturalLightFolder
var naturalLightArchiveFolder
var imageUrlsSheet

/**
 * Locates and saves database sheets and all testing folders as variables to be used by other functions
 */
function loadFiles () {
  let QATestsFolder
  let lightTransTestFolder
  let errorMessage = ''
  // Note that changing the names or locations of the folders in google drive may temporarily break this, until the paths below are chagned
  if (DriveApp.getFilesByName('Blocks database').hasNext()) {
    // ...found database, now save it
    database = DriveApp.getFilesByName('Blocks database').next()
    blocksSheet1 = SpreadsheetApp.open(database).getSheetByName('Blocks DB')
    blocksSheet2 = SpreadsheetApp.open(database).getSheetByName('Blocks1364DB')
    // ...check if you found both sheets
    if (blocksSheet1 == null || blocksSheet2 == null) {
      // Failed to locate both sheets
      Logger.log('failed to locate database sheet(s) in database spreadsheet')
    }
  } else {
    // ...failed to locate database
    Logger.log('failed to locate file "Blocks Database" in drive')
    errorMessage += 'failed to locate file "Blocks Database" in drive; '
  }
  if (DriveApp.getFilesByName('imageUrlsSheet').hasNext()) {
    imageUrlsSheet = SpreadsheetApp.open(DriveApp.getFilesByName('imageUrlsSheet').next())
  } else {
    Logger.log('failed to locate file "imageUrlsSheet" in drive')
  }
  if (DriveApp.getFoldersByName('sPHENIX--NEW').hasNext()) {
    if (DriveApp.getFoldersByName('sPHENIX--NEW').next().getFoldersByName('QA tests').hasNext()) {
      QATestsFolder = DriveApp.getFoldersByName('sPHENIX--NEW').next().getFoldersByName('QA tests').next()
      if (QATestsFolder.getFoldersByName('Light Transmission Test').hasNext()) {
        lightTransTestFolder = QATestsFolder.getFoldersByName('Light Transmission Test').next()
        if (lightTransTestFolder.getFoldersByName('Block pictures').hasNext()) {
          if (lightTransTestFolder.getFoldersByName('Block pictures').next().getFoldersByName('Original').hasNext()) {
            lightTransOriginalFolder = lightTransTestFolder.getFoldersByName('Block pictures').next().getFoldersByName('Original').next()
          } else {
            Logger.log('failed to locate original folder in light transmission test/block pictures')
          }
          if (lightTransTestFolder.getFoldersByName('Block pictures').next().getFoldersByName('Cropped').hasNext()) {
            lightTransCroppedFolder = lightTransTestFolder.getFoldersByName('Block pictures').next().getFoldersByName('Cropped').next()
          } else {
            Logger.log('failed to find cropped folder in light transmission test/block pictures')
          }
        } else {
          Logger.log('failed to block pictures folder in light transmission test')
        }
        if (lightTransTestFolder.getFoldersByName('Analysis').hasNext()) {
          lightTransAnalysisFolder = lightTransTestFolder.getFoldersByName('Analysis').next()
        } else {
          Logger.log('failed to locate analysis folder in light transmission folder')
        }
      } else {
        Logger.log('failed to locate light transmission test folder in QA tests')
      }
      if (QATestsFolder.getFoldersByName('LightTransmissionArchive').hasNext()) {
        if (QATestsFolder.getFoldersByName('LightTransmissionArchive').next().getFoldersByName('Block pictures').hasNext()) {
          if (QATestsFolder.getFoldersByName('LightTransmissionArchive').next().getFoldersByName('Block pictures').next().getFoldersByName('Original').hasNext()) {
            lightTransArchiveOriginalFolder = QATestsFolder.getFoldersByName('LightTransmissionArchive').next().getFoldersByName('Block pictures').next().getFoldersByName('Original').next()
          } else {
            Logger.log('failed to locate original folder in light transmission archive/block pictures')
          }
        } else {
          Logger.log('failed to locate block pictures folder in light transmission archive')
        }
        if (QATestsFolder.getFoldersByName('LightTransmissionArchive').next().getFoldersByName('Analysis').hasNext()) {
          lightTransArchiveAnalysisFolder = QATestsFolder.getFoldersByName('LightTransmissionArchive').next().getFoldersByName('Analysis').next()
        } else {
          Logger.log('failed to locate analysis folder in light transmission archive')
        }
      } else {
        Logger.log('failed to locate light transmission archive folder in QA tests')
      }
      if (QATestsFolder.getFoldersByName('Physical Pictures').hasNext()) {
        naturalLightFolder = QATestsFolder.getFoldersByName('Physical Pictures').next()
      } else {
        Logger.log('failed to locate physical pictures in QA tests')
      }
      if (QATestsFolder.getFoldersByName('NaturalLightArchive').hasNext()) {
        naturalLightArchiveFolder = QATestsFolder.getFoldersByName('NaturalLightArchive').next()
      } else {
        Logger.log('failed to locate natural light archive in QA tests')
      }
    } else {
      Logger.log('failed to locate QA tests folder in sPHENIX--NEW')
    }
  } else {
    Logger.log('failed to locate "sPHENIX--NEW" folder in drive')
    errorMessage += 'failed to locate "sPHENIX--NEW" folder in drive; '
  }
  filesLoaded = true
  error = errorMessage
}

function getDatabase () {
  if (!filesLoaded) {
    loadFiles()
  }
  if (error !== '') {
    // an error occured while loading files, do don't try to pass database var to fns
    // also pass the error to HTML so the user can be alerted
    return [null, null, error]
  } else {
    const sheets = SpreadsheetApp.open(database).getSheets()
    return [sheets[0].getDataRange().getDisplayValues(), sheets[1].getDataRange().getDisplayValues(), error]
  }
}

/**
 * Get urls for each of this block's test images
 * This is the default method of finding images, which grabs the image urls from the date folder specified in database
 * (if images of the specified dbn exist in these folders)
 * Called by HTML to retrieve image urls when LT or NL data is present for a given dbn
 * @param {number} dbn The block's DBN
 * @return {string[]} Array of image urls [LT_W, LT_N, LT_cropped_W, LT_cropped_N, NL_W, NL_N]
 */
function getImageUrls (blockMap) {
  // Default dbn for testing only:
  // var dbn = 811
  // if files aren't loaded, load them
  const dbn = blockMap[0]
  if (!filesLoaded) {
    loadFiles()
  }
  let lightTransImgWId
  let lightTransImgNId
  let lightTransCroppedImgWId
  let lightTransCroppedImgNId
  let natLightImgWId
  let natLightImgNId
  let currentlightTransOriginalFolder
  let currentNatLightFolder
  // Set the folders to search (archive or normal folder...)
  if (parseInt(blockMap[1].substring(0, 4)) === 2019) {
    // If light transmission picture date is from 2019, use the archive
    currentlightTransOriginalFolder = lightTransArchiveOriginalFolder
  } else {
    // Otherwise, use the normal folder
    currentlightTransOriginalFolder = lightTransOriginalFolder
  }
  if (parseInt(blockMap[2].substring(0, 4)) === 2019) {
    // If natural light picture date is from 2019, use the archive
    currentNatLightFolder = naturalLightArchiveFolder
  } else {
    // Otherwise, use the normal folder
    currentNatLightFolder = naturalLightFolder
  }

  // Check necessary folders and files in the drive
  // Get all possible file names for light transmission images (wide and narrow)
  const lightTransImgNamesWithoutExtensionWide = formatFileNamePrefixesForLightTrans(dbn)
  lightTransImgNamesWithoutExtensionWide.forEach(function (element, index, array) {
    array[index] = element + '-W'
  })
  const lightTransImgNamesWithoutExtensionNarrow = formatFileNamePrefixesForLightTrans(dbn)
  lightTransImgNamesWithoutExtensionNarrow.forEach(function (element, index, array) {
    array[index] = element + '-N'
  })
  // Locate the light transmission date folder
  // Assumes that the date in database matches the date folder name (i.e. including "-1" or "".2" suffix)
  if (currentlightTransOriginalFolder.getFoldersByName(blockMap[1]).hasNext()) {
    // ...found light transmission date folder, now locate wide and narrow images
    const dateFolder = currentlightTransOriginalFolder.getFoldersByName(blockMap[1]).next()
    lightTransImgWId = searchFolderForFiles(dateFolder, lightTransImgNamesWithoutExtensionWide)
    lightTransImgNId = searchFolderForFiles(dateFolder, lightTransImgNamesWithoutExtensionNarrow)
  } else {
    // ...failed to locate light transmission date folder
    // Logger.log('could not locate ' + blockMap[1] + ' in ' + currentlightTransOriginalFolder.getName())
  }

  // Locate cropped light transmission images...
  lightTransCroppedImgWId = searchFolderForFiles(lightTransCroppedFolder, lightTransImgNamesWithoutExtensionWide)
  lightTransCroppedImgNId = searchFolderForFiles(lightTransCroppedFolder, lightTransImgNamesWithoutExtensionNarrow)

  // Locate natural light date folder...
  const natLightDateFolder = getDateFolder(currentNatLightFolder, blockMap[2], dbn)
  if (natLightDateFolder != null) {
    if (currentNatLightFolder.getFoldersByName(natLightDateFolder).hasNext()) {
      // ...found natural light date folder, now find
      // Loop through all files
      const fileIterator = currentNatLightFolder.getFoldersByName(natLightDateFolder).next().getFiles()
      while (fileIterator.hasNext()) {
        const file = fileIterator.next()
        const splitName = file.getName().split(/[._-]/)
        splitName.shift() // discard first element of array (assumedly 'DBN')
        splitName.pop() // discard last element of array (assumedly 'JPG')
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
    Logger.log('getDateFolder failed to find a suitable folder for dbn ' + dbn + ' with date ' + blockMap[2] + ' in ' + currentNatLightFolder.getName())
  }
  // Construct an array with the file IDs from google drive
  var imageUrls = [
    lightTransImgWId,
    lightTransImgNId,
    lightTransCroppedImgWId,
    lightTransCroppedImgNId,
    natLightImgWId,
    natLightImgNId
  ]
  // Add the appropriate prefix to make these file IDs urls accessable by anyone who has the testing folders shared
  imageUrls.forEach(function (element, index, array) {
    if (element != null) {
      array[index] = 'https://drive.google.com/uc?id=' + element
    }
  })
  Logger.log('getImageUrls returned: ' + imageUrls)
  return imageUrls
}

/**
 * Get file ID of the first matching file in fileNameWithoutExtensionArray that appears in folderToSearch
 * @param {*} folderToSearch Folder to search
 * @param {*} fileNameWithoutExtensionArray Array of files names to search, searching for the first name first
 * @return {string} File id of the first matching file
 */
function searchFolderForFiles (folderToSearch, fileNameWithoutExtensionArray) {
  // First check for .JPG, since that covers ALMOST all of the images, and this process is much faster...
  // Logger.log('fileNameWithoutExtensionArray was ' + fileNameWithoutExtensionArray)
  const jpgArray = [...fileNameWithoutExtensionArray]
  jpgArray.forEach(function (element, index, array) {
    array[index] = element + '.JPG'
  })
  // Logger.log('jpgArray is now ' + jpgArray)
  for (let i = 0; i < jpgArray.length; i++) {
    if (folderToSearch.getFilesByName(jpgArray[i]).hasNext()) {
      return folderToSearch.getFilesByName(jpgArray[i]).next().getId()
    }
  }
  Logger.log("this probably shouldn't have happened unless you were passed weird dbn that has .png")
  // Otherwise, look for something weird like a random .png...this process is much less efficient...
  // and only search the file name at the end of the array (no zeroes added), because these random .png files seem to
  // consistenly follow this nonstandard naming convention (less nice DBN_642 instead of standard DBN_0642)
  const noZeroesName = fileNameWithoutExtensionArray[fileNameWithoutExtensionArray.length - 1]
  const fileIterator = folderToSearch.getFiles()
  while (fileIterator.hasNext()) {
    const file = fileIterator.next()
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
  const dbnString = inputDbn.toString()
  const formattedNames = []
  // Add the approriate number of zeros the appropriate number of times...
  for (let i = dbnString.length; i < 5; i++) {
    const numZeroes = 4 - i
    let zeroes = ''
    for (let j = numZeroes; j > 0; j--) {
      zeroes += '0'
    }
    formattedNames.push('DBN_' + zeroes + dbnString)
  }
  return formattedNames
}

/**
 * Get the most recent date folder (name) in the passed folder that contains an image of the passed dbn
 * Ex. search NL archive for an image of the passed DBN
 * Only for use with natural light folders
 * @param {Folder} folder Folder to search
 * @param {sting} date Date to search (WITHOUT and suffixes, e.g. 20201225 not 20201225.5)
 * @param {number} dbn Block DBN
 * @return {string} Most recent matching folder's name
 */
function getDateFolder (folderToSearch, date, dbn) {
  let folderToReturnName
  // Search folderToSearch for candidate folders with the correct date
  const subFolderIterator = folderToSearch.getFolders()
  while (subFolderIterator.hasNext()) {
    const folder = subFolderIterator.next()
    // Check if folder has name that starts with the date...
    if (folder.getName().substring(0, 8) === date) {
      // ...this folder is the correct date, now see if it contains an image of the passed dbn...
      const fileIterator = folder.getFiles()
      while (fileIterator.hasNext()) {
        const file = fileIterator.next()
        const splitName = file.getName().split(/[_-]/)
        splitName.shift() // discard first element of array (assumedly 'DBN')
        splitName.pop() // discard last element of array (assumedly 'N.JPG', e.g.)
        // this should leave only DBNs in the array
        if (splitName.includes(dbn.toString())) {
          // This folder matches date and has a file with the dbn, so check if we've already found a folder...
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

/**
 * An experimental function that crosschecks the LT and NL dates found in the database with those found by loadBigArray
 * @param {*} bigArray
 */
function checkBigArraySheet (bigArray) {
  if (!filesLoaded) {
    loadFiles()
  }
  if (bigArray == null) {
    bigArray = loadBigArray()
  }
  // Checks if a value (say, returned by a map) is significant (not null, empty, #NUM!, or #DIV/0!)
  function dataPresent (data) {
    return (data != null && data !== '' && data !== '#NUM!' && data !== '#DIV/0!')
  }
  Logger.log('checking bigArraySheet')
  const values1 = blocksSheet1.getDataRange().getDisplayValues()
  const values2 = blocksSheet2.getDataRange().getDisplayValues()
  for (let i = 0; i < values1.length - 1; i++) {
    let lightTransDateDB = values1[i + 1][64]
    if (!dataPresent(lightTransDateDB)) {
      lightTransDateDB = null
    }
    let natLightDateDB = values1[i + 1][70]
    if (!dataPresent(natLightDateDB)) {
      natLightDateDB = null
    }
    let lightTransDateBAA
    let natLightDateBAA
    if (bigArray[i] != null) {
      if (bigArray[i][0] != null && bigArray[i][1] != null) {
        lightTransDateBAA = Math.max(bigArray[i][0][1], bigArray[i][1][1])
      }
      if (bigArray[i][4] != null && bigArray[i][5] != null) {
        natLightDateBAA = Math.max(bigArray[i][4][1], bigArray[i][5][1])
      }
    }
    if (lightTransDateDB == null && lightTransDateBAA == null) {
      continue
    } else if (lightTransDateDB != null && lightTransDateBAA == null) {
      Logger.log('database has LT date but BAA does not for DBN ' + i)
    } else if (lightTransDateDB == null && lightTransDateBAA != null) {
      Logger.log('BAA has LT date but database does not for DBN ' + i)
    } else if (parseInt(lightTransDateDB.substring(0, 8)) !== parseInt(lightTransDateBAA)) {
      Logger.log('INCONS. at DBN ' + i + ', database has LT date ' + lightTransDateDB + ' but BAA has ' + lightTransDateBAA)
    }
    if (natLightDateDB == null && natLightDateBAA == null) {
      continue
    } else if (natLightDateDB != null && natLightDateBAA == null) {
      Logger.log('database has NL date but BAA does not for DBN ' + i)
    } else if (natLightDateDB == null && natLightDateBAA != null) {
      Logger.log('BAA has NL date but database does not for DBN ' + i)
    } else if (parseInt(natLightDateDB) !== parseInt(natLightDateBAA)) {
      Logger.log('INCONS. at DBN ' + i + ', database has NL date ' + natLightDateDB + ' but BAA has ' + natLightDateBAA)
    }
  }
  for (let j = 1; j < values2.length; j++) {
    const i = j + 1999
    let lightTransDateDB = values2[j][64]
    if (!dataPresent(lightTransDateDB)) {
      lightTransDateDB = null
    }
    let natLightDateDB = values2[j][70]
    if (!dataPresent(natLightDateDB)) {
      natLightDateDB = null
    }
    let lightTransDateBAA
    let natLightDateBAA
    if (bigArray[i] != null) {
      if (bigArray[i][0] != null && bigArray[i][1] != null) {
        lightTransDateBAA = Math.max(bigArray[i][0][1], bigArray[i][1][1])
      }
      if (bigArray[i][4] != null && bigArray[i][5] != null) {
        natLightDateBAA = Math.max(bigArray[i][4][1], bigArray[i][5][1])
      }
    }
    if (lightTransDateDB == null && lightTransDateBAA == null) {
      continue
    } else if (lightTransDateDB != null && lightTransDateBAA == null) {
      Logger.log('database has LT date but BAA does not for DBN ' + i)
    } else if (lightTransDateDB == null && lightTransDateBAA != null) {
      Logger.log('BAA has LT date but database does not for DBN ' + i)
    } else if (parseInt(lightTransDateDB.substring(0, 7)) !== parseInt(lightTransDateBAA)) {
      Logger.log('INCONS. at DBN ' + i + ', database has LT date ' + lightTransDateDB + ' but BAA has ' + lightTransDateBAA)
    }
    if (natLightDateDB == null && natLightDateBAA == null) {
      continue
    } else if (natLightDateDB != null && natLightDateBAA == null) {
      Logger.log('database has NL date but BAA does not for DBN ' + i)
    } else if (natLightDateDB == null && natLightDateBAA != null) {
      Logger.log('BAA has NL date but database does not for DBN ' + i)
    } else if (parseInt(natLightDateDB) !== parseInt(natLightDateBAA)) {
      Logger.log('INCONS. at DBN ' + i + ', database has NL date ' + natLightDateDB + ' but BAA has ' + natLightDateBAA)
    }
  }
}

/**
 * An experimental function that writes all data from bigArray to a google sheet named "imageUrlsSheet" in the user's drive
 */
function putBigArray(bigArray) {
  if (bigArray == null) {
    bigArray = loadBigArray()
  }
  for (let i = 0; i < bigArray.length; i++) {
    if (bigArray[i] != null) {
      const toPut = new Array(19)
      toPut[0] = i
      for (let j = 0; j < 6; j++) {
        if (bigArray[i][j] != null) {
          for (let k = 0; k < 3; k++) {
            toPut[1 + 3 * j + k] = bigArray[i][j][k]
          }
        }
      }
      Logger.log('at not string ' + (i + 3) + ', put: ' + toPut)
      // Logger.log('string?: ' + (i + 3))
      imageUrlsSheet.getSheets()[0].getRange(i + 3, 1, 1, 19).setValues([toPut])
    }
  }
}

/**
 * an experimental fucntion that loads iterates through all testing folders to find the most recent testing
 * images for each block (takes a long time)
 */
function loadBigArray () {
  if (!filesLoaded) {
    loadFiles()
  }
  const imgTypeMap = new Map([['LT', 0], ['LTCropped', 1], ['NL', 2]])
  const endMap = new Map([['W', 0], ['N', 1]])
  const bigArray = new Array(maxDbn + 1)
  /**
   * @param {Folder} folder the folder that contains date folders (which contain images) to search
   * @param {string} imageType LT, LTCropped, or NL
   * @returns {Array} bigArray indexed by dbn -> [[LT W img url, date, x], [LT N img url, date, x], [LTCropped img url, date, x], [LTCropped img url, date, x], [NL img url, date, x], [NL img url, date, x]]
   * where x is 0 for single-block images, 1 for 2 blocks, this one on left, and 2 for 2 blocks, this one on right
   */
  function massIteration (folder, imageType) {
    if (imageType === 'LTCropped') {
      iterate(folder)
    } else {
      const folderIterator = folder.getFolders()
      while (folderIterator.hasNext()) {
        iterate(folderIterator.next())
      }
    }
    function iterate (subfolder) {
      const fileIterator = subfolder.getFiles()
      while (fileIterator.hasNext()) {
        const file = fileIterator.next()
        const items = file.getName().split(/[_.-]/)
        for (let i = 0; i < items.length; i++) {
          items[i] = removeZeroes(items[i])
          if (isNaN(items[i]) && items[i].length !== 1) {
            items.splice(i, 1)
            i--
          }
        }
        const end = items.splice(-1, 1).toString()
        for (let i = 0; i < items.length; i++) {
          let side
          if (items.length > 1) {
            side = i + 1
          } else {
            side = 0
          }
          let img
          let date
          if (imageType === 'LTCropped' || isNaN(subfolder.getName().substring(0, 8))) {
            date = null
          } else {
            date = subfolder.getName().substring(0, 8)
          }
          if (imgTypeMap.has(imageType) && endMap.has(end)) {
            img = 2 * imgTypeMap.get(imageType) + endMap.get(end)
          }
          if (img == null || items[i] < 0 || items[i] > maxDbn) {
            Logger.log('rejected at dbn ' + items[i] + ' and img ' + img + ' from image type ' + imageType + ' and end ' + end)
            continue
          } else {
            if (bigArray[items[i]] == null) {
              bigArray[items[i]] = new Array(6)
              bigArray[items[i]][img] = ['https://drive.google.com/uc?id=' + file.getId(), date, side]
            } else if (bigArray[items[i]][img] == null) {
              bigArray[items[i]][img] = ['https://drive.google.com/uc?id=' + file.getId(), date, side]
            } else if (bigArray[items[i]][img][1] == null || parseInt(date) > parseInt(bigArray[items[i]][img][1])) {
              // Logger.log('OVERWROTE OLD date ' + parseInt(bigArray[items[i]][img][1]) + ', new date ' + parseInt(date))
              bigArray[items[i]][img] = ['https://drive.google.com/uc?id=' + file.getId(), date, side]
            } else {
              // Logger.log('KEPT OLD date ' + parseInt(bigArray[items[i]][img][1]) + ', new date ' + parseInt(date))
            }
          }
        }
      }
    }
  }
  massIteration(lightTransOriginalFolder, 'LT')
  massIteration(lightTransArchiveOriginalFolder, 'LT')
  massIteration(lightTransCroppedFolder, 'LTCropped')
  massIteration(naturalLightFolder, 'NL')
  massIteration(naturalLightArchiveFolder, 'NL')
  return bigArray
}
function getHistograms (fromHTML) {
  const dbn = fromHTML[0]
  const date = fromHTML[1]
  const urls = [null, null]
  if (!filesLoaded) {
    loadFiles()
  }
  let analysisFolder
  // Set the folders to search (archive or normal folder...)
  if (parseInt(date.substr(0, 4)) === 2019) {
    // If light transmission picture date is from 2019, use the archive
    analysisFolder = lightTransArchiveAnalysisFolder
  } else {
    // Otherwise, use the normal folder
    analysisFolder = lightTransAnalysisFolder
  }
  let folderToSearch
  const subfolderIterator = analysisFolder.getFolders()
  while (subfolderIterator.hasNext()) {
    const subfolder = subfolderIterator.next()
    const folderName = subfolder.getName()
    const folderDate = folderName.split(/(_pic)/)[0]
    if (folderDate === date) {
      folderToSearch = subfolder
      break
    } else if (folderDate.substr(0, 8) === date.substr(0, 8)) {
      folderToSearch = subfolder
    }
  }
  const fileIterator = folderToSearch.getFiles()
  while (fileIterator.hasNext() && (urls[1] == null || urls[2] == null)) {
    const file = fileIterator.next()
    const name = file.getName()
    if (file.getMimeType() === 'application/pdf') {
      const bits = name.split(/[_-]/)
      bits.shift() // 'DBN'
      bits.pop() // 'histograms.pdf'
      if (removeZeroes(bits[0]) == dbn) {
        if (bits[1] === 'W') {
          urls[0] = 'https://drive.google.com/uc?id=' + file.getId()
        } else if (bits[1] === 'N') {
          urls[1] = 'https://drive.google.com/uc?id=' + file.getId()
        }
      }
    }
  }
  return urls
}

/**
 * recursively removes zeroes from the front of a string
 * @param {string} string to be trimmed
 * @returns {string} string with beginning zeroes removed
 */
function removeZeroes (string) {
  let toReturn = string
  while (toReturn.charAt(0) === '0' && toReturn.length > 1) {
    toReturn = toReturn.substr(1)
  }
  return toReturn
}

/**
 * Converts a Javascript date object to a String in format such as 20201225
 * @param {Date} date
 */
function dateToEight (date) {
  const yr = date.getFullYear().toString()
  let mo = (date.getMonth() + 1).toString()
  let day = date.getDate().toString()
  if (mo.length < 2) {
    mo = '0' + mo
  }
  if (day.length < 2) {
    day = '0' + day
  }
  return yr + mo + day
}
