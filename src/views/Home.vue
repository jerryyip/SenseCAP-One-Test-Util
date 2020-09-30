<i18n>
{
  "en": {
    "text: connectAsConfigMode": "Enter configuration mode automatically on device's booted",
    "text: clear data confirm": "This will clear all the storaged measurements in the flash. Once confirmed, the bootloader will launch the Application Firmware and storaged measurements will be wiped out.",
    "Maximum 32 chars allowed": "Maximum 32 non-whitespace chars",
    "end": "end"
  },
  "zh": {
    "Serial Port": "串口",
    "Baud Rate": "波特率",
    "text: connectAsConfigMode": "设备启动后自动进入配置模式",
    "Device Type": "设备类型",
    "Device EUI": "设备EUI",
    "Device ID": "设备ID",
    "Ref. Speed": "参考风速",
    "Ref. Dir": "参考风向",
    "Notes": "备注",
    "Work Dir": "工作目录",
    "Browse": "浏览",
    "Plot Point Number": "画点深度",
    "Start Capture": "开始拦截",
    "Stop Capture": "停止拦截",
    "Print Raw Signal": "打印原始信号",
    "Print Filtered Signal": "打印滤波信号",
    "Stop Printing": "停止打印信号",
    "Console": "串口终端",
    "APN Password": "APN密码",
    "Hardware Version": "硬件版本",
    "Software Version": "软件版本",
    "Read": "读取",
    "Write": "写入",
    "Update Fw": "更新固件",
    "Clear Data": "清空数据存储",
    "text: clear data confirm": "这个操作将会清空存储在Flash中的测量数据，点击\"清空\"后，设备将退出配置模式，进入正常工作模式，并执行清空操作。",
    "Do it": "清空",
    "Connect": "连接",
    "Disconnect": "断开",

    "Must between [5, 43200]": "必须在[5, 43200]范围内",
    "Must between [5, 720]": "必须在[5, 720]范围内",
    "Must between [1, 43200]": "必须在[1, 43200]范围内",
    "Must between [1, 65535]": "必须在[1, 65535]范围内",
    "Invalid LoRaWAN EUI (16 chars)": "无效的LoRaWAN EUI (16字符)",
    "Invalid LoRaPP EUI (32 chars)": "无效的LoRaPP EUI (32字符)",
    "Invalid domain": "不正确的域名格式",
    "Maximum 32 chars allowed": "最多32个(非空白)字符",

    "end": "结束"
  }
}
</i18n>
<template>
  <v-container fluid class="py-0 align-stretch" fill-height>
    <v-row v-resize="onWindowResize">
      <!-- 左半屏，输入框 -->
      <v-col cols="4" xl="3">
        <v-container fluid class="align-content-space-between pa-0" fill-height>
        <v-row class="pt-1">
          <!-- Fields -->
          <!-- connection -->
          <v-col cols="12" md="6" class="py-0">
            <v-select v-model="selectedSerialPort" :label="$t('Serial Port')"
              :items="serialPorts"
              :disabled="serialVSelectDisable"
              @focus="onSerialVSelectClicked"
              outlined dense>
            </v-select>
          </v-col>
          <v-col cols="12" md="6" class="py-0 d-flex justify-start">
            <v-btn rounded :color="connectBtnColor" width="120"
              @click="ConnectFn"
              dense>{{connectBtnText}}</v-btn>
          </v-col>
          <v-col cols="12" md="6" class="py-0">
            <v-combobox v-model="baudRate" :label="$t('Baud Rate')"
              :items="baudRates" :rules="[rules.int]"
              outlined dense>
            </v-combobox>
          </v-col>
          <v-col cols="12" md="6" class="py-0">
          </v-col>
          <!-- Device ID -->
          <v-col cols="12" md="12" class="py-0">
            <v-text-field v-model="deviceID" :label="$t('Device ID')"
              :rules="[rules.required]" outlined dense>
            </v-text-field>
          </v-col>
          <!-- ref speed and dir -->
          <v-col cols="12" md="6" class="py-0">
            <v-text-field v-model="refSpeed" :label="$t('Ref. Speed')"
              :rules="[rules.required]"
              :suffix="$t('m/s')"
              outlined dense>
            </v-text-field>
          </v-col>
          <v-col cols="12" md="6" class="py-0">
            <v-text-field v-model="refDir" :label="$t('Ref. Dir')"
              :rules="[rules.required]"
              :suffix="$t('degree')"
              outlined dense>
            </v-text-field>
          </v-col>
          <!-- Notes -->
          <v-col cols="12" md="12" class="py-0">
            <v-textarea v-model="notes" :label="$t('Notes')" rows="2"
              outlined dense no-resize>
            </v-textarea>
          </v-col>
          <!-- Buttons -->
          <v-col cols="12" class="py-2 d-flex justify-space-around">
            <v-btn rounded :color="capBtnColor" width="200"
              @click.stop="startCapFn()"
              :loading="capBtnLoading"
              :disabled="!serialOpened">{{capBtnText}}</v-btn>
          </v-col>
          <v-col cols="12" class="py-5 d-flex justify-space-around">
            <v-btn rounded :color="rawSigBtnColor" width="200"
              @click.stop="printRawFn()"
              :loading="rawSigBtnLoading"
              :disabled="!serialOpened || !isCapturing">{{rawSigBtnText}}</v-btn>
            <v-btn rounded :color="filteredSigBtnColor" width="200"
              @click.stop="printFilteredFn()"
              :loading="filteredSigBtnLoading"
              :disabled="!serialOpened || !isCapturing">{{filteredSigBtnText}}</v-btn>
          </v-col>
          <v-col cols="12" class="py-5 d-flex justify-space-around">
            <v-btn rounded color="secondary" width="200"
              @click.stop="openConsoleFn()">{{$t('Console')}}</v-btn>
            <v-btn rounded color="secondary" width="200"
              @click.stop="openDialog()"
              :disabled="!!dialog">{{$t('Settings')}}</v-btn>
          </v-col>
          <v-col cols="12" class="px-5 d-flex flex-wrap justify-start">
            <v-switch v-model="rawSpeedMaxSw" :label="$t('rawSpeedMax')" @change="lineSwitchChanged"></v-switch>
            <v-switch v-model="rawSpeedMinSw" :label="$t('rawSpeedMin')" @change="lineSwitchChanged"></v-switch>
            <v-switch v-model="rawSpeedAvgSw" :label="$t('rawSpeedAvg')" @change="lineSwitchChanged"></v-switch>
            <v-switch v-model="fSpeedMaxSw" :label="$t('fSpeedMax')" @change="lineSwitchChanged"></v-switch>
            <v-switch v-model="fSpeedMinSw" :label="$t('fSpeedMin')" @change="lineSwitchChanged"></v-switch>
            <v-switch v-model="fSpeedAvgSw" :label="$t('fSpeedAvg')" @change="lineSwitchChanged"></v-switch>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="2" class="d-flex align-center justify-center caption grey--text">
            <div>
              <v-tooltip top open-delay="1000" :disabled="!newVersion">
                <template v-slot:activator="{ on }">
                  <v-badge color="pink" dot top :value="newVersion">
                    <span v-on="on" @click="versionClicked()" id="versionText">v{{currentVersion}}</span>
                  </v-badge>
                </template>
                <span>v{{newVersion}} available</span>
              </v-tooltip>
            </div>
          </v-col>
        </v-row>
        </v-container>
      </v-col>

      <!-- 右半屏，plots -->
      <v-col cols="8" xl="9">
        <v-card outlined class="pa-2 d-flex align-content-stretch flex-wrap" height="100%">
          <v-card ref="chart1" class="col-12 pa-auto" width="100%">
            <ve-line :data="chartDataSpeed"
              :height="chartHeight1"
              :extend="chartExtend1"
              v-if="showCharts"></ve-line>
          </v-card>
          <v-card ref="chart2" class="col-12 mt-2">
            <ve-line :data="chartDataDir"
              :height="chartHeight2"
              :extend="chartExtend2"
              v-if="showCharts"></ve-line>
          </v-card>
        </v-card>
      </v-col>
    </v-row>


    <!-- dialog -->
    <v-dialog
      v-model="dialog"
      max-width="600"
    >
      <v-card>
        <v-card-title class="headline">{{$t('Settings')}}</v-card-title>
        <v-card flat class="mx-5 d-flex">
          <v-row>
            <v-col cols="12" class="d-flex flex-nowrap">
              <v-text-field v-model="dialogWorkDir" :label="$t('Work Dir')"
                :rules="[rules.required]"
                outlined dense>
              </v-text-field>
              <v-btn class="ml-2"
              @click.stop="openFileBrowseFn()">{{$t('Browse')}}</v-btn>
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="dialogLogFragSize" :label="$t('Log Fragment Size')"
                :rules="[rules.required, rules.int]"
                :suffix="$t('KB')"
                outlined dense>
              </v-text-field>
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="dialogPlotPointNum" :label="$t('Plot Point Number')"
                :rules="[rules.required, rules.int]"
                outlined dense>
              </v-text-field>
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="dialogVeuszPort" :label="$t('Veusz Service Port')"
                :rules="[rules.int]"
                outlined dense>
              </v-text-field>
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="dialogVeuszDatasetDesc" :label="$t('Veusz Dataset Descriptor')"
                outlined dense>
              </v-text-field>
            </v-col>
          </v-row>
        </v-card>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="green darken-1" text @click="dialog = false">
            {{$t('Cancel')}}
          </v-btn>

          <v-btn color="red darken-1" text @click="doConfigFn()">
            {{$t('OK')}}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
const { ipcRenderer } = require('electron')
const Store = require('electron-store')
const store = new Store()
const homedir = require('os').homedir();

const delayMs = ms => new Promise(res => setTimeout(res, ms))

export default {
  name: 'Home',
  data() {
    let rules = {
      required: value => !!value || value === 0 || this.$t("Required."),
      rangeWAN: value => (value >= 5 && value <=43200) || this.$t("Must between [5, 43200]"),
      rangePP: value => (value >= 5 && value <=720) || this.$t("Must between [5, 720]"),
      rangeSH: value => (value >= 1 && value <=43200) || this.$t("Must between [1, 43200]"),
      rangePort: value => (value >= 1 && value <=65535) || this.$t("Must between [1, 65535]"),
      int: value => (/\.+/.test(value)) ? this.$t("Must be integer.") : true,
      eui16: value => (/^\w{16}$/.test(value)) || this.$t("Invalid LoRaWAN EUI (16 chars)"),
      eui32: value => (/^\w{32}$/.test(value)) || this.$t("Invalid LoRaPP EUI (32 chars)"),
      char32AllowEmtpy: value => {
        if (value) return (/^\S{1,32}$/i.test(value)) || this.$t("Maximum 32 chars allowed")
        else return true
      },
      domain: value => (/(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]/i.test(value)) || (/^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/.test(value)) || this.$t("Invalid domain"),
    }
    this.chartExtend1 = {
      series: {
        symbol: 'rect',
        showSymbol: false
      },
      animation: false
    }
    this.chartExtend2 = {
      series: {
        symbol: 'circle',
        showSymbol: false
      },
      animation: false
    }
    return {
      //rules
      rules: rules,
      //Serial
      selectedSerialPort: null,
      serialPorts: [],
      baudRates: [9600, 19200, 38400, 115200, 230400, 460800, 921600, 2000000],
      baudRate: 2000000,
      serialOpened: false,
      //Vars
      deviceID: "",
      refSpeed: 10,
      refDir: 0,
      notes: "",
      //Buttons
      isCapturing: false,
      isPrinting: false,
      capBtnLoading: false,
      rawSigBtnLoading: false,
      filteredSigBtnLoading: false,

      //ota
      currentVersion: '',
      newVersion: '',
      //i18n
      selectedLocaleIso: 'us',
      locale: 'en',
      //hidden function
      logoClickCnt: 0,
      timeoutHandler: null,
      //dialog
      dialog: null,
      workDir: "",
      dialogWorkDir: "",
      logFragSize: 500,
      dialogLogFragSize: 500,  //k
      plotPointNum: 1000,
      dialogPlotPointNum: 1000,
      veuszPort: 23456,
      dialogVeuszPort: 23456,
      veuszDatasetDesc: "",
      dialogVeuszDatasetDesc: "",

      //dataset
      dsSpeedDir: [],

      //charts
      showCharts: true,
      chartHeight1: '100px',
      chartHeight2: '100px',
      chartHeight3: '100px',

      rawSpeedMaxSw: true,
      rawSpeedMinSw: true,
      rawSpeedAvgSw: true,
      fSpeedMaxSw: true,
      fSpeedMinSw: true,
      fSpeedAvgSw: true,


      chartDataSpeed: {
        columns: ['index', 'refSpeed', 'rawSpeedMax', 'rawSpeedMin', 'rawSpeedAvg', 'fSpeedMax', 'fSpeedMin', 'fSpeedAvg'],
        rows: []
      },
      chartDataDir: {
        columns: ['index', 'refDir', 'dir'],
        rows: []
      }
    }
  },
  computed: {
    flagIconClass: function() {
      return 'flag-icon-' + this.selectedLocaleIso.toLowerCase()
    },
    connectBtnText: function() {
      return this.serialOpened ? this.$t('Disconnect') : this.$t('Connect')
    },
    connectBtnColor: function() {
      return this.serialOpened ? 'primary' : 'secondary'
    },
    serialVSelectDisable: function() {
      return this.serialOpened
    },
    capBtnText: function () {
      return this.isCapturing ? this.$t("Stop Capture") : this.$t("Start Capture")
    },
    capBtnColor: function () {
      return this.isCapturing ? "primary" : "secondary"
    },
    rawSigBtnText: function () {
      return this.isPrinting ? this.$t("Stop Printing") : this.$t("Print Raw Signal")
    },
    rawSigBtnColor: function () {
      return this.isPrinting ? "primary" : "secondary"
    },
    filteredSigBtnText: function () {
      return this.isPrinting ? this.$t("Stop Printing") : this.$t("Print Filtered Signal")
    },
    filteredSigBtnColor: function () {
      return this.isPrinting ? "primary" : "secondary"
    },
  },
  methods: {
    onSerialVSelectClicked() {
      ipcRenderer.send('init-serial-req')
      return true
    },
    ConnectFn() {
      console.log(this.selectedSerialPort)
      if (!this.selectedSerialPort) return
      if (!this.serialOpened) {
        ipcRenderer.send('serial-open-req', this.selectedSerialPort, this.baudRate)
      } else {
        ipcRenderer.send('serial-close-req')
      }
    },
    openConsoleFn() {
      console.log('going to send IPC open-console-window')
      ipcRenderer.send('open-console-window')
    },
    async startCapFn() {
      if (!this.isCapturing) {
        //save test var
        store.set('deviceID', this.deviceID)
        store.set('refSpeed', this.refSpeed)
        store.set('refDir', this.refDir)
        store.set('notes', this.notes)

        console.log('start capture ...')
        this.isCapturing = true
        this.dsSpeedDir = []
        this.chartDataSpeed.rows = this.dsSpeedDir
        this.chartDataDir.rows = this.dsSpeedDir
        ipcRenderer.send('start-capture', this.refSpeed, this.refDir, this.deviceID, this.notes)
      } else {
        console.log('stop capture ...')
        if (this.isPrinting) {
          ipcRenderer.send('serial-rx', 'PFSP\r\n')
          await delayMs(1000)
          this.isPrinting = false
        }
        this.isCapturing = false
        console.log(this.chartDataSpeed)
        ipcRenderer.send('stop-capture')
        this.capBtnLoading = true
      }
    },
    printRawFn() {
      this.isPrinting = !this.isPrinting
      if (this.isPrinting) {
        ipcRenderer.send('serial-rx', 'PFSR\r\n')
      } else {
        ipcRenderer.send('serial-rx', 'PFSP\r\n')
      }
    },
    printFilteredFn() {
      this.isPrinting = !this.isPrinting
      if (this.isPrinting) {
        ipcRenderer.send('serial-rx', 'PFSF\r\n')
      } else {
        ipcRenderer.send('serial-rx', 'PFSP\r\n')
      }
    },
    openDialog() {
      this.dialog = true
    },
    openFileBrowseFn() {
      ipcRenderer.send('select-dir', this.selectedSerialPort)
    },
    doConfigFn() {
      this.workDir = this.dialogWorkDir
      this.logFragSize = this.dialogLogFragSize
      this.plotPointNum = this.dialogPlotPointNum
      this.veuszPort = this.dialogVeuszPort
      this.veuszDatasetDesc = this.dialogVeuszDatasetDesc
      store.set('workDir', this.workDir)
      store.set('logFragSize', this.logFragSize)
      store.set('plotPointNum', this.plotPointNum)
      store.set('veuszPort', this.veuszPort)
      store.set('veuszDatasetDesc', this.veuszDatasetDesc)
      this.dialog = false
    },
    addSpeedDirPoint(row) {
      // "index": chartIndex1 + '',
      //   "refSpeed": parseFloat(refSpeed),
      //   "refDir": parseFloat(refDir),
      //   "rawSpeedMax": lastSpeedMaxRaw,
      //   "rawSpeedMin": lastSpeedMinRaw,
      //   "rawSpeedAvg": lastSpeedAvgRaw,
      //   "fSpeedMax": lastSpeedMaxF,
      //   "fSpeedMin": lastSpeedMinF,
      //   "fSpeedAvg": lastSpeedAvgF,
      //   "dir": dir,
      //   "timeLabel": lastTimestamp

      if (!this.rawSpeedMaxSw) delete row["rawSpeedMax"]
      if (!this.rawSpeedMinSw) delete row["rawSpeedMin"]
      if (!this.rawSpeedAvgSw) delete row["rawSpeedAvg"]
      if (!this.fSpeedMaxSw) delete row["fSpeedMax"]
      if (!this.fSpeedMinSw) delete row["fSpeedMin"]
      if (!this.fSpeedAvgSw) delete row["fSpeedAvg"]
      this.dsSpeedDir.push(row)
      if (this.dsSpeedDir.length > parseInt(this.plotPointNum)) {
        this.dsSpeedDir.shift()
      }
    },
    formatLocale(locale) {
      if (locale.includes('en')) return 'en'
      else if (locale.includes('zh')) return 'zh'
      else if (locale.includes('cn')) return 'zh'
      return 'en'
    },
    versionClicked() {
      ipcRenderer.send('goto-new-version')
    },
    configModeChangedFn() {
      console.log(`connectAsConfigMode changed to: ${this.connectAsConfigMode}`)
      store.set('connectAsConfigMode', this.connectAsConfigMode)
    },
    onWindowResize() {
      this.showCharts = false
      setTimeout(this.resizeChartHeight, 1000)
    },
    resizeChartHeight() {
      let cardHeight1 = this.$refs.chart1.$el.clientHeight
      let cardHeight2 = this.$refs.chart2.$el.clientHeight
      // let cardHeight3 = this.$refs.chart3.$el.clientHeight
      console.log(`card heights: ${cardHeight1}, ${cardHeight2}`)
      cardHeight1 -= 24
      cardHeight2 -= 24
      // cardHeight3 -= 24
      this.chartHeight1 = cardHeight1 + 'px'
      this.chartHeight2 = cardHeight2 + 'px'
      // this.chartHeight3 = cardHeight3 + 'px'
      this.showCharts = true
    },
    lineSwitchChanged() {
      // ['index', 'refSpeed', 'rawSpeedMax', 'rawSpeedMin', 'rawSpeedAvg', 'fSpeedMax', 'fSpeedMin', 'fSpeedAvg']
      let columns = ['index', 'refSpeed']
      if (this.rawSpeedMaxSw) columns.push('rawSpeedMax')
      if (this.rawSpeedMinSw) columns.push('rawSpeedMin')
      if (this.rawSpeedAvgSw) columns.push('rawSpeedAvg')
      if (this.fSpeedMaxSw) columns.push('fSpeedMax')
      if (this.fSpeedMinSw) columns.push('fSpeedMin')
      if (this.fSpeedAvgSw) columns.push('fSpeedAvg')
      this.chartDataSpeed.columns = columns

      store.set('rawSpeedMaxSw', this.rawSpeedMaxSw)
      store.set('rawSpeedMinSw', this.rawSpeedMinSw)
      store.set('rawSpeedAvgSw', this.rawSpeedAvgSw)
      store.set('fSpeedMaxSw', this.fSpeedMaxSw)
      store.set('fSpeedMinSw', this.fSpeedMinSw)
      store.set('fSpeedAvgSw', this.fSpeedAvgSw)

    },
    saveCapture() {
      ipcRenderer.send('serial-rx', 'PFSP\r\n')
    }
  },
  created() {
    //locale
    ipcRenderer.send('locale-req')
    ipcRenderer.on('locale-resp', (event, arg) => {
      console.log('local-resp:', arg)
      let chosenLocale = arg
      this.$root.$i18n.locale = this.formatLocale(chosenLocale)
      this.locale = this.$root.$i18n.locale
      console.log(`locale after requested: ${this.locale}`)
    })
    this.locale = this.$root.$i18n.locale
    console.log(`locale when created: ${this.locale}`)

    if (this.locale === 'en') this.selectedLocaleIso = 'us'
    else if (this.locale === 'zh') this.selectedLocaleIso = 'cn'

    //load config
    this.workDir = this.dialogWorkDir = store.get('workDir', homedir)
    this.logFragSize = this.dialogLogFragSize = store.get('logFragSize', 500)
    this.plotPointNum = this.dialogPlotPointNum = store.get('plotPointNum', 1000)
    this.veuszPort = this.dialogVeuszPort = store.get('veuszPort', 23456)
    this.veuszDatasetDesc = this.dialogVeuszDatasetDesc = store.get('veuszDatasetDesc', "")

    //load last test var
    this.deviceID = store.get('deviceID', 'dev0')
    this.refSpeed = store.get('refSpeed', 10)
    this.refDir = store.get('refDir', 0)
    this.notes = store.get('notes', 'empty')

    this.rawSpeedMaxSw = store.get('rawSpeedMaxSw', true)
    this.rawSpeedMinSw = store.get('rawSpeedMinSw', true)
    this.rawSpeedAvgSw = store.get('rawSpeedAvgSw', true)
    this.fSpeedMaxSw = store.get('fSpeedMaxSw', true)
    this.fSpeedMinSw = store.get('fSpeedMinSw', true)
    this.fSpeedAvgSw = store.get('fSpeedAvgSw', true)

    this.lineSwitchChanged()
  },
  mounted() {
    //serial
    ipcRenderer.on('init-serial-resp', (event, arg) => {
      console.log('init-serial-resp:', arg)
      let {ports, selectedPort, opened} = arg
      this.serialPorts = []
      for (let p of ports) {
        this.serialPorts.push(p.path)
      }
      this.selectedSerialPort = selectedPort
      this.serialOpened = opened
    })
    ipcRenderer.send('init-serial-req')

    ipcRenderer.on('serial-open-resp', (event, arg) => {
      console.log('serial-open-resp:', arg)
      let {opened, reason} = arg
      if (opened) {
        this.serialOpened = true
      } else {
        console.error('serial open failed:', reason)
      }
    })
    ipcRenderer.on('serial-close-resp', (event, arg) => {
      console.log('serial-close-resp:', arg)
      let {closed, reason} = arg
      if (closed) {
        this.serialOpened = false
        this.isCapturing = false
      } else {
        console.error('serial close failed:', reason)
      }
    })
    ipcRenderer.on('add-data-row', (event, arg) => {
      let row = arg
      this.addSpeedDirPoint(row)
    })

    ipcRenderer.on('stop-capture-resp', (event, arg) => {
      this.capBtnLoading = false
    })

    //ota
    ipcRenderer.on('current-version-resp', (event, arg) => {
      console.log('current-version-resp:', arg)
      let {currentVersion} = arg
      this.currentVersion = currentVersion
    })
    ipcRenderer.send('current-version-req')

    //selected work dir
    ipcRenderer.on('select-dir-resp', (event, arg) => {
      console.log(`select-dir-resp: ${arg}`)
      this.dialogWorkDir = arg
    })

    ipcRenderer.on('update-available', (event, arg) => {
      console.log('update-available:', arg)
      this.newVersion = arg
      document.getElementById('versionText').style.cursor = 'pointer'
    })


  },
  beforeDestroy() {
    ipcRenderer.removeAllListeners()
  }

}
</script>
<style scoped>
.mytextarea {
  font-size: 12px;
  line-height: 12px;
}
</style>
