// 'use strict'

import { app, protocol, BrowserWindow, shell, ipcMain, dialog } from 'electron'
import {
  createProtocol,
  /* installVueDevtools */
} from 'vue-cli-plugin-electron-builder/lib'
const SerialPort = require('serialport')
const Menu = require("electron-create-menu")
import i18next from 'i18next'
const { autoUpdater } = require("electron-updater")
const {yModem} = require('./ymodem')
const path = require('path')
const fs = require('fs')
const fsPromises = fs.promises
const Store = require('electron-store')
const store = new Store()
const { Readable } = require('stream')
const RegexParser = require('@serialport/parser-regex')
const ReadlineParser = require('@serialport/parser-readline')
const csvStringify = require('csv-stringify')
const dateFormat = require('dateformat')
const { tppl } = require('tppl')
const { tplSource } = require('./veusz-template')


let appName = "SenseCAP One Test Util"
app.name = appName

const logger = require("electron-log")
autoUpdater.logger = logger

const isDevelopment = process.env.NODE_ENV !== 'production'
autoUpdater.logger.transports.file.level = isDevelopment ? "debug" : "info"

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win
let winConsole
let sysLocale

let serialPorts = []
let selectedSerialPort
let selectedSerialBaud
let serial
let ymodem = new yModem(true, logger.debug)
let updating = false

let isCapturing = false
let smParseWaveSignal = 'idle'  //idle, open
let customParseCallback = null
let pauseParseLine = false
let deviceID = ""
let refSpeed = 10
let refDir = 0
let notes = ""
let lastTimestamp = 0
let lastSpeedMaxRaw = 0
let lastSpeedMinRaw = 0
let lastSpeedAvgRaw = 0
let lastSpeedMaxF = 0
let lastSpeedMinF = 0
let lastSpeedAvgF = 0
let lastDirAvgRaw = 0
let chartIndex1 = 1
let chartIndex2 = 1
let dsSpeedDir = []  //item: [timestamp, refSpeed, refDir, rawSpeedMax, rawSpeedMin, rawSpeedAvg,
                     //       fSpeedMax, fSpeedMin, fSpeedAvg, dir]
let dsSignal = []    //item: [timeIndex, signalVal, label]

//stream
const stream = new Readable({
  read: (size) => {}
})

//tppl render func
const tpplRender = tppl(tplSource)

//parser
const parser = stream.pipe(new ReadlineParser())

const homedir = require('os').homedir()

//auto update
let autoUpdateTimeHandler = null

const delayMs = ms => new Promise(res => setTimeout(res, ms))




/**
 * The Menu's locale only follows the system, the user selection from the GUI doesn't affect
 */
async function translateMenu() {
  sysLocale = store.get('chosenLocale') || process.env.LOCALE || app.getLocale()
  logger.info('the sys locale:', sysLocale)

  await i18next.init({
    lng: sysLocale,
    fallbackLng: 'en',
    debug: isDevelopment,
    resources: {
      zh: {
        translation: {
          "File": "文件",
          "Edit": "编辑",
          "Speech": "语音",
          "View": "视图",
          "Window": "窗口",
          "Help": "帮助",
          "About": "关于",
          "Hide": "隐藏",
          "Quit": "退出",
          "Report an issue": "报告错误",
        } //other keywords are translated by the OS automatically
      }
    }
  }).then((t) => {
    Menu((defaultMenu, separator) => {
      defaultMenu[0].submenu[0].label = t('About') + " " + appName
      defaultMenu[0].submenu[4].label = t('Hide') + " " + appName
      defaultMenu[0].submenu[8].label = t('Quit') + " " + appName
      if (!isDevelopment) defaultMenu[3].submenu[2].showOn = 'neverMatch'
      defaultMenu[4].label = t('Window')
      defaultMenu[5].label = t('Help')
      defaultMenu[5].submenu.push({
        label: t('Report an issue'),
        click: () => {
          shell.openExternal('https://github.com/KillingJacky/SenseCAP-One-Test-Util/issues')
        }
      })
      logger.debug(JSON.stringify(defaultMenu))
      return defaultMenu
    },
    // This function is used to translate the default labels
    t
  )})
}

if (process.platform === 'darwin') {
  app.setAboutPanelOptions({
    applicationName: appName,
  })
}

// AutoUpdater
autoUpdater.on('update-available', (info) => {
  logger.info('update-available', JSON.stringify(info))
  let {version} = info
  if (win && version) win.webContents.send('update-available', version)
})

autoUpdater.on('update-not-available', (info) => {
  logger.info('update-not-available', JSON.stringify(info))
})

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([{scheme: 'app', privileges: { secure: true, standard: true } }])

function createMainWindow () {
  // Create the browser window.
  let w = 1600
  let h = 900

  if (process.platform === 'win32') {
    h += 30  //for menu bar
  }

  win = new BrowserWindow({
    show: false,
    width: w,
    height: h,
    minWidth: w,
    minHeight: h,
    webPreferences: {
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
      enableRemoteModule: true
    }
  })

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    if (!process.env.IS_TEST) win.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
  }

  win.on('closed', () => {
    win = null
  })

  win.once('ready-to-show', () => {
    win.show()
  })
}

function createConsoleWindow () {
  // Create the browser window.
  let w = 600
  let h = 900

  if (process.platform === 'win32') {
    h += 30  //for menu bar
  }

  winConsole = new BrowserWindow({
    show: false,
    width: w,
    height: h,
    minWidth: w,
    minHeight: h,
    webPreferences: {
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
      enableRemoteModule: true
    },
    menuBarVisible: false
  })

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    winConsole.loadURL(process.env.WEBPACK_DEV_SERVER_URL + "#console")
    logger.debug(`load the console windows from dev server...`)
    if (!process.env.IS_TEST) win.webContents.openDevTools()
  } else {
    // Load the index.html when not in development
    winConsole.loadURL('app://./index.html#console')
  }

  winConsole.on('closed', () => {
    winConsole = null
  })

  winConsole.once('ready-to-show', () => {
    winConsole.show()
  })
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    serialClose()
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createMainWindow()
  }
})

app.on('before-quit', () => {
  if (autoUpdateTimeHandler) clearTimeout(autoUpdateTimeHandler)
  serialClose()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {

  await translateMenu()

  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    // Devtools extensions are broken in Electron 6.0.0 and greater
    // See https://github.com/nklayman/vue-cli-plugin-electron-builder/issues/378 for more info
    // Electron will not launch with Devtools extensions installed on Windows 10 with dark mode
    // If you are not using Windows 10 dark mode, you may uncomment these lines
    // In addition, if the linked issue is closed, you can upgrade electron and uncomment these lines
    // try {
    //   await installVueDevtools()
    // } catch (e) {
    //   console.error('Vue Devtools failed to install:', e.toString())
    // }

    logger.debug(`process.env.WEBPACK_DEV_SERVER_URL: ${process.env.WEBPACK_DEV_SERVER_URL}`)

  }

  createMainWindow()

  autoUpdateTimeHandler = setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify()
    autoUpdateTimeHandler = null
  }, 10000)
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', data => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      serialClose()
      ipcMain.removeAllListeners()
      app.quit()
    })
  }
}

// IPC
ipcMain.on('init-serial-req', (event, arg) => {
  logger.info('init-serial-req ...')

  SerialPort.list().then(ports => {
    serialPorts = ports
    logger.debug(ports)

    let opened = false
    if (serial && serial.isOpen) opened = true

    let resp = {
      ports: ports,
      selectedPort: selectedSerialPort,
      opened: opened
    }

    event.reply('init-serial-resp', resp)
  })
})

function serialOpen(event) {
  serial = new SerialPort(selectedSerialPort, {
    baudRate: selectedSerialBaud || 115200,
    autoOpen: false
  })

  let h = setTimeout(() => {
    event.reply('serial-open-resp', {opened: false, reason: 'timeout'})
  }, 5000)

  serial.on('open', () => {
    clearTimeout(h)
    event.reply('serial-open-resp', {opened: true, reason: ''})
  })

  serial.on('data', (data) => {
    // if (win) {
    //   win.webContents.send('serial-tx', data)
    // }
    if (isCapturing) stream.push(data)

    if (winConsole) {
      winConsole.webContents.send('serial-tx', data)
    }

    if (ymodem && updating) {
      ymodem.emit('rx', data)
    }
  })

  serial.on('error', (err) => {
    logger.warn('serial error:', err)
  })

  serial.open()
}

function serialClose(cb) {
  if (serial) {
    serial.close((err) => {
      serial = null
      if (cb) cb()
    })
  }
}

async function serialCloseAsync() {
  return new Promise((resolve, reject) => {
    serialClose(resolve)
  })
}

ipcMain.on('serial-open-req', (event, selPort, baud) => {
  logger.info(`serial-open-req, ${selPort}, ${baud} ...`)

  if (serial && serial.isOpen) {
    if (selPort === selectedSerialPort) {
      logger.info('already opened')
      event.reply('serial-open-resp', {opened: true, reason: 'already opened'})
      return
    } else {
      logger.warn('request to open another port, rather', selectedSerialPort)
      selectedSerialPort = selPort
      selectedSerialBaud = baud
      serialClose(() => {
        serialOpen(event)
      })
    }
  } else {
    selectedSerialPort = selPort
    selectedSerialBaud = baud
    serialOpen(event)
  }
})

ipcMain.on('serial-close-req', (event, arg) => {
  logger.info('serial-close-req ...')

  if (!serial || !serial.isOpen) {
    logger.info('already closed')
    event.reply('serial-close-resp', {closed: true, reason: 'already closed'})
    return
  }

  let h = setTimeout(() => {
    event.reply('serial-close-resp', {closed: false, reason: 'timeout'})
  }, 1000)

  serialClose(() => {
    clearTimeout(h)
    event.reply('serial-close-resp', {closed: true, reason: ''})
  })
})

ipcMain.on('serial-rx', (event, arg) => {
  if (serial && serial.isOpen) {
    serial.write(arg)
  }
})

ipcMain.on('current-version-req', (event, arg) => {
  logger.info('current-version-req ...')
  let currentVersion = autoUpdater.currentVersion.version
  logger.info(`the current version is: ${currentVersion}`)
  event.reply('current-version-resp', {currentVersion: currentVersion})
})

async function sendToTerm(str) {
  if (win) {
    await win.webContents.send('serial-tx', str)
  }
}

let updateTimeoutHandler
async function progressCallback(val) {
  let percent = `${val.toFixed(1)}%`
  await sendToTerm('\r' + percent)
}

async function updateTimeout() {
  if (win) {
    win.webContents.send('update-fw-end')
  }
  updating = false
  updateTimeoutHandler = null
}

function ymodemWrite(chunk, resolve, reject) {
  if (serial) {
    serial.write(chunk, (err) => {
      if (err) reject()
      else resolve()
    })
  }
}

ipcMain.on('select-dir', async (event, selPort) => {
  logger.info('select dir ...')
  let {canceled, filePaths} = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory', 'noResolveAliases']
  })

  if (!canceled) {
    let filePath = filePaths[0]
    logger.info('selected dir:', filePath)
    if (!filePath) return

    try {
      await fsPromises.access(filePath, fs.constants.R_OK)
    } catch (error) {
      logger.warn('can not access file:', filePath)
      logger.debug(error)
      return
    }

    event.reply('select-dir-resp', filePath)

  } else {
    logger.info('dir selection cancelled by user')
  }

})

// locale
ipcMain.on('locale-req', (event) => {
  logger.info('locale-req ...')
  event.reply('locale-resp', sysLocale)
})

ipcMain.on('locale-change', (event, arg) => {
  logger.info('locale-change, ', arg)
  if (arg === sysLocale) return
  i18next.changeLanguage(arg)
  translateMenu()
})

ipcMain.on('goto-new-version', (event) => {
  shell.openExternal('https://github.com/KillingJacky/SenseCAP-One-Test-Util/releases/latest')
})

//Console Window
ipcMain.on('open-console-window', (event) => {
  logger.info('ipc: open-console-window ...')
  if (winConsole) {
    winConsole.show()
    winConsole.focus()
  } else {
    createConsoleWindow()
  }
})

//Data Capture and Parse

function addSpeedDirPoint() {
  //item: [timestamp, refSpeed, refDir, rawSpeedMax, rawSpeedMin, rawSpeedAvg,
  //       fSpeedMax, fSpeedMin, fSpeedAvg, dir]
  let dir = lastDirAvgRaw
  if (dir - parseFloat(refDir) > 180) dir -= 360
  let row = {
    "index": chartIndex1 + '',
    "refSpeed": parseFloat(refSpeed),
    "refDir": parseFloat(refDir),
    "rawSpeedMax": lastSpeedMaxRaw,
    "rawSpeedMin": lastSpeedMinRaw,
    "rawSpeedAvg": lastSpeedAvgRaw,
    "fSpeedMax": lastSpeedMaxF,
    "fSpeedMin": lastSpeedMinF,
    "fSpeedAvg": lastSpeedAvgF,
    "dir": dir,
    "timeLabel": lastTimestamp
  }

  dsSpeedDir.push(row)
  chartIndex1++

  if (win) {
    win.webContents.send('add-data-row', row)
  }
}

function addWaveSignalPoint (adcValue, label) {
  let indexSigLabel = label ? chartIndex2 + '' : ""
  let labelYPos = label ? "1000" : ""
  let row = {
    "indexSig": chartIndex2 + '',
    "adcValue": adcValue,
    "labelSig": label,
    "indexSigLabel": indexSigLabel,
    "labelYPos": labelYPos
  }
  dsSignal.push(row)
  chartIndex2++

}

function parseLine(line) {
  if (customParseCallback) {
    customParseCallback(line)
  }

  let found
  found = line.match(/^(\w+)_TX_BEG/i)
  if (found) {
    logger.debug('found TX_BEG:', found[0])
    addWaveSignalPoint(0, found[1] + '-TX-BEG, ' + chartIndex1)
    smParseWaveSignal = 'open'
    return
  }
  found = line.match(/^\w+_TX_END/i)
  if (found) {
    logger.debug('found TX_END:', found[0])
    //addWaveSignalPoint(0, found[0] + ', ' + chartIndex1)
    smParseWaveSignal = 'idle'
    return
  }
  if (smParseWaveSignal === 'open') {
    found = line.match(/^-?\d+/i)
    if (found) {
      addWaveSignalPoint(parseInt(found), '')
    }
    return
  }

  found = line.match(/^\d{7}\.\d{3}/i)
  if (found) {
    logger.debug('found timestamp:', found[0])
    lastTimestamp = parseFloat(found[0])
    return
  }
  found = line.match(/SPEED_MAX_R:\s+(\d+\.\d+)/i)
  if (found) {
    logger.debug('found SPEED_MAX_R:', found[1])
    lastSpeedMaxRaw = parseFloat(found[1])
    return
  }
  found = line.match(/SPEED_MIN_R:\s+(\d+\.\d+)/i)
  if (found) {
    logger.debug('found SPEED_MIN_R:', found[1])
    lastSpeedMinRaw = parseFloat(found[1])
    return
  }
  found = line.match(/SPEED_AVG_R:\s+(\d+\.\d+)/i)
  if (found) {
    logger.debug('found SPEED_AVG_R:', found[1])
    lastSpeedAvgRaw = parseFloat(found[1])
    return
  }
  found = line.match(/SPEED_MAX_F:\s+(\d+\.\d+)/i)
  if (found) {
    logger.debug('found SPEED_MAX_F:', found[1])
    lastSpeedMaxF = parseFloat(found[1])
    return
  }
  found = line.match(/SPEED_MIN_F:\s+(\d+\.\d+)/i)
  if (found) {
    logger.debug('found SPEED_MIN_F:', found[1])
    lastSpeedMinF = parseFloat(found[1])
    return
  }
  found = line.match(/SPEED_AVG_F:\s+(\d+\.\d+)/i)
  if (found) {
    logger.debug('found SPEED_AVG_F:', found[1])
    lastSpeedAvgF = parseFloat(found[1])
    return
  }
  found = line.match(/DIRECTION_AVG_R:\s+(\d+\.\d+)/i)
  if (found) {
    logger.debug('found DIRECTION_AVG_R:', found[1])
    lastDirAvgRaw = parseFloat(found[1])
    addSpeedDirPoint()
    return
  }
}

function genFilePath(ext) {
  let now = new Date()
  let datetimeStr = dateFormat(now, "yyyymmdd-HHMMss")
  let _devID = `${deviceID}` || "devXXX"
  let _refSpeed = `${refSpeed}` || "refSpeed"
  let _refDir = `${refDir}` || "refDir"
  let _ext = ext || "txt"

  return `${_devID}-${_refSpeed}-${_refDir}-${datetimeStr}.${_ext}`
}

function buildVeuszFile(workDir, filePath, sigFilePath) {
  //'rawSpeedMax', 'rawSpeedMin', 'rawSpeedAvg',
  //     'fSpeedMax', 'fSpeedMin', 'fSpeedAvg'
  let data = {
    workDir: workDir,
    signalCSVFilePath: sigFilePath,
    csvFilePath: filePath,
    notes: notes,
    plots: [
      {name: "refSpeed", hide: "False"},
      {name: "rawSpeedMax", hide: "True"},
      {name: "rawSpeedMin", hide: "True"},
      {name: "rawSpeedAvg", hide: "False"},
      {name: "fSpeedMax", hide: "True"},
      {name: "fSpeedMin", hide: "True"},
      {name: "fSpeedAvg", hide: "False"},
    ]
  }
  return tpplRender(data)
}

parser.on('data', (line) => {
  // logger.debug(line, 'len:', line.length)
  parseLine(line)
})

ipcMain.on('start-capture', (event, _refSpeed, _refDir, _deviceID, _notes) => {
  logger.info('start-capture ...')
  refSpeed = _refSpeed
  refDir = _refDir
  deviceID = _deviceID
  notes = _notes
  isCapturing = true
  dsSpeedDir = []
  dsSignal = []
  chartIndex1 = 1
  chartIndex2 = 1
})

ipcMain.on('stop-capture', async (event) => {
  logger.info('stop-capture ...')
  isCapturing = false

  //Save Capture
  let workDir = store.get('workDir', homedir)
  let filePath = workDir + "/" + genFilePath("csv")
  let filePathSig = ""
  let filePathVeusz = workDir + "/" + genFilePath("vsz")
  let writeStream1 = fs.createWriteStream(filePath)

  const rowHeader = ['index', 'refSpeed', 'refDir', 'rawSpeedMax', 'rawSpeedMin', 'rawSpeedAvg',
    'fSpeedMax', 'fSpeedMin', 'fSpeedAvg', 'dir', 'timeLabel']
  const csvStringifier1 = csvStringify({
    header: true,
    columns: rowHeader
  })

  csvStringifier1.pipe(writeStream1)

  for (let row of dsSpeedDir) {
    let rowArray = []
    for (const field of rowHeader) {
      rowArray.push(row[field])
    }
    csvStringifier1.write(rowArray)
  }

  csvStringifier1.end()

  logger.info(`write to ${filePath} done!`)

  let htimeout = setTimeout(() => {
    event.reply('stop-capture-resp', true)
  }, 30000)

  writeStream1.on('close', () => {
    event.reply('stop-capture-resp', true)
    clearTimeout(htimeout)
  })

  if (dsSignal.length > 0) {
    filePathSig = workDir + "/" + genFilePath("signal.csv")
    let writeStream2 = fs.createWriteStream(filePathSig)

    const rowHeader2 = ['indexSig', 'adcValue', 'labelSig', 'indexSigLabel', 'labelYPos']
    const csvStringifier2 = csvStringify({
      header: true,
      quoted_string: true,
      columns: rowHeader2
    })

    csvStringifier2.pipe(writeStream2)

    for (let row of dsSignal) {
      let rowArray = []
      for (const field of rowHeader2) {
        rowArray.push(row[field])
      }
      csvStringifier2.write(rowArray)
    }

    csvStringifier2.end()

    logger.info(`write to ${filePathSig} done!`)
  }

  //write the veusz file
  const fileSrcStream = new Readable({
    read: (size) => {}
  })
  let writeStream3 = fs.createWriteStream(filePathVeusz)
  fileSrcStream.pipe(writeStream3)
  fileSrcStream.push(buildVeuszFile(workDir, filePath, filePathSig))
  fileSrcStream.push(null)
})








