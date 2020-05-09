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

// declare variable that will be needed by other functions after loadFiles has run
var filesLoaded = false
var error
var database
var blocksSheet1
var blocksSheet2
var lightTransOriginalFolder
var lightTransCroppedFolder
var lightTransArchiveOriginalFolder
var naturalLightFolder
var naturalLightArchiveFolder
var imageUrlsSheet

/**
 * locate and save database sheets and all testing folders
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
  // Locate sPHENIX--NEW folder...
  if (DriveApp.getFoldersByName('sPHENIX--NEW').hasNext()) {
    // ...found sPHENIX--NEW folder, now locate QA tests folder...
    if (DriveApp.getFoldersByName('sPHENIX--NEW').next().getFoldersByName('QA tests').hasNext()) {
      // ...found QA tests folder, now save it
      QATestsFolder = DriveApp.getFoldersByName('sPHENIX--NEW').next().getFoldersByName('QA tests').next()
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
  }
  const sheets = SpreadsheetApp.open(database).getSheets()
  return [sheets[0].getDataRange().getDisplayValues(), sheets[1].getDataRange().getDisplayValues(), error]
}

/**
 * Get urls for each of this block's test images
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
  if (parseInt(blockMap[1].substring(0, 4)) === 2019) {
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
  // Assumes that the date in database matches the date folder name always (though getDateFolder could be adapted to handle LT as well...)
  if (currentlightTransOriginalFolder.getFoldersByName(blockMap[1]).hasNext()) {
    // ...found light transmission date folder, now locate wide and narrow images
    const dateFolder = currentlightTransOriginalFolder.getFoldersByName(blockMap[1]).next()
    lightTransImgWId = searchFolderForFiles(dateFolder, lightTransImgNamesWithoutExtensionWide)
    // Logger.log('tried to set lightTransImgWId to ' + searchFolderForFiles(dateFolder, lightTransImgNamesWithoutExtensionWide) + ' for names ' + lightTransImgNamesWithoutExtensionWide)
    lightTransImgNId = searchFolderForFiles(dateFolder, lightTransImgNamesWithoutExtensionNarrow)
    // Logger.log('tried to set lightTransImgNId to ' + searchFolderForFiles(dateFolder, lightTransImgNamesWithoutExtensionNarrow) + ' for names ' + lightTransImgNamesWithoutExtensionNarrow)
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
    Logger.log('getDateFolder failed to find a suitable folder for dbn ' + dbn + ' with date ' + blockMap[2] + ' in ' + currentNatLightFolder.getName())
  }
  // Logger.log('!our new function returned ' + getDateFolder(naturalLightFolder, '20200305', 811))
  var imageUrls = [
    lightTransImgWId,
    lightTransImgNId,
    lightTransCroppedImgWId,
    lightTransCroppedImgNId,
    natLightImgWId, // currentNatLightFolder.getFoldersByName(blockMap[2]).next().getFilesByName(lightTransImgNameWide).next().getId(),
    natLightImgNId // currentNatLightFolder.getFoldersByName(blockMap[2]).next().getFilesByName(lightTransImgNameNarrow).next().getId()
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
  const jpgArray = [...fileNameWithoutExtensionArray]
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
function checkBigassArraySheet (bigassArray) {
  if (!filesLoaded) {
    loadFiles()
  }
  if (bigassArray == null) {
    bigassArray = loadBigassArray()
  }
  // Checks if a value (say, returned by a map) is significant (not null, empty, #NUM!, or #DIV/0!)
  function dataPresent (data) {
    return (data != null && data !== '' && data !== '#NUM!' && data !== '#DIV/0!')
  }
  Logger.log('checking bigassArraySheet')
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
    if (bigassArray[i] != null) {
      if (bigassArray[i][0] != null && bigassArray[i][1] != null) {
        lightTransDateBAA = Math.max(bigassArray[i][0][1], bigassArray[i][1][1])
      }
      if (bigassArray[i][4] != null && bigassArray[i][5] != null) {
        natLightDateBAA = Math.max(bigassArray[i][4][1], bigassArray[i][5][1])
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
    if (bigassArray[i] != null) {
      if (bigassArray[i][0] != null && bigassArray[i][1] != null) {
        lightTransDateBAA = Math.max(bigassArray[i][0][1], bigassArray[i][1][1])
      }
      if (bigassArray[i][4] != null && bigassArray[i][5] != null) {
        natLightDateBAA = Math.max(bigassArray[i][4][1], bigassArray[i][5][1])
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
function putBigassArray(bigassArray) {
  if (bigassArray == null) {
    bigassArray = loadBigassArray()
  }
  for (let i = 0; i < bigassArray.length; i++) {
    if (bigassArray[i] != null) {
      const toPut = new Array(19)
      toPut[0] = i
      for (let j = 0; j < 6; j++) {
        if (bigassArray[i][j] != null) {
          for (let k = 0; k < 3; k++) {
            toPut[1 + 3 * j + k] = bigassArray[i][j][k]
          }
        }
      }
      Logger.log('at not string ' + (i + 3) + ', put: ' + toPut)
      // Logger.log('string?: ' + (i + 3))
      imageUrlsSheet.getSheets()[0].getRange(i + 3, 1, 1, 19).setValues([toPut])
    }
  }
}
//
function loadBigassArray () {
  if (!filesLoaded) {
    loadFiles()
  }
  const imgTypeMap = new Map([['LT', 0], ['LTCropped', 1], ['NL', 2]])
  const endMap = new Map([['W', 0], ['N', 1]])
  const bigassArray = new Array(maxDbn + 1)
  /**
   * @param {Folder} folder the folder that contains date folders (which contain images) to search
   * @param {string} imageType LT, LTCropped, or NL
   * @returns {Array} bigass array indexed by dbn -> [[LT W img url, date, x], [LT N img url, date, x], [LTCropped img url, date, x], [LTCropped img url, date, x], [NL img url, date, x], [NL img url, date, x]]
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
            if (bigassArray[items[i]] == null) {
              bigassArray[items[i]] = new Array(6)
              bigassArray[items[i]][img] = ['https://drive.google.com/uc?id=' + file.getId(), date, side]
            } else if (bigassArray[items[i]][img] == null) {
              bigassArray[items[i]][img] = ['https://drive.google.com/uc?id=' + file.getId(), date, side]
            } else if (bigassArray[items[i]][img][1] == null || parseInt(date) > parseInt(bigassArray[items[i]][img][1])) {
              // Logger.log('OVERWROTE OLD date ' + parseInt(bigassArray[items[i]][img][1]) + ', new date ' + parseInt(date))
              bigassArray[items[i]][img] = ['https://drive.google.com/uc?id=' + file.getId(), date, side]
            } else {
              // Logger.log('KEPT OLD date ' + parseInt(bigassArray[items[i]][img][1]) + ', new date ' + parseInt(date))
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
  return bigassArray
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
