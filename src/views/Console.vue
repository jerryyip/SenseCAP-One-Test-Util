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
    "text: connectAsConfigMode": "设备启动后自动进入配置模式",
    "Device Type": "设备类型",
    "Device EUI": "设备EUI",
    "App Key": "App密钥",
    "Card ICCID": "SIM卡ICCID",
    "Signal RSSI": "网络信号",
    "Data Interval": "上报周期",
    "Server Address": "服务器IP/域名",
    "Server Port": "端口",
    "Enable GPS": "使能GPS",
    "OTA Prepub": "使能OTA预发布固件",
    "APN Username": "APN用户名",
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
      <v-col cols="12" class="d-flex flex-column">
        <!--Terminal-->
        <v-card outlined class="pl-2 pt-2 flex-grow-1 flex-shrink-0 d-flex flex-row align-stretch" >
          <div id="terminal" style="width: 100%"></div>
        </v-card>
        <!--Settings and Buttons-->
        <v-card flat class="pt-2 flex-shrink-0 d-flex flex-row align-center">
          <v-card flat class="col-2 pl-0">
            <v-text-field v-model="terminalFontSize" :label="$t('Font Size')"
              :rules="[rules.required, rules.int]"
              outlined dense hide-details>
            </v-text-field>
          </v-card>
          <v-card flat class="col-6">
            <v-btn rounded color="secondary" width="100"
              @click.stop="changeFontSizeFn()">{{$t('OK')}}</v-btn>
            <v-btn rounded color="secondary" width="100" class="ml-5"
              @click.stop="clearTerminalFn()">{{$t('Clear')}}</v-btn>
          </v-card>
        </v-card>
      </v-col>
    </v-row>

<!--    <v-row class="align-self-end">-->

<!--    </v-row>-->
  </v-container>
</template>

<script>
// @ is an alias to /src
// import HelloWorld from '@/components/HelloWorld.vue'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
const { ipcRenderer } = require('electron')
const Store = require('electron-store');
const store = new Store();

const delayMs = ms => new Promise(res => setTimeout(res, ms))
const fitAddon = new FitAddon()

export default {
  name: 'Console',
  data() {
    let rules = {
      required: value => !!value || this.$t("Required."),
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
    return {
      //rules
      rules: rules,
      //i18n
      locale: 'en',
      ///
      term: null,
      terminalFontSize: 10,
      terminalFontSizeReal: 10,
      hTimeoutResize: null,
    }
  },
  methods: {
    fitTerminal() {
      this.hTimeoutResize = null
      fitAddon.fit()
    },
    onWindowResize() {
      // refit the terminal area when user resized the window
      if (this.hTimeoutResize) clearTimeout(this.hTimeoutResize)
      this.term.resize(80, 20)
      this.hTimeoutResize = setTimeout(this.fitTerminal, 1000)
    },
    changeFontSizeFn() {
      if (this.hTimeoutResize) clearTimeout(this.hTimeoutResize)
      this.terminalFontSizeReal = this.terminalFontSize
      this.term.setOption("fontSize", this.terminalFontSizeReal)
      this.term.resize(80, 20)
      this.hTimeoutResize = setTimeout(this.fitTerminal, 1000)
      store.set('terminalFontSize', this.terminalFontSizeReal)
    },
    clearTerminalFn() {
      this.term.clear()
    }
  },
  created() {
    this.terminalFontSizeReal = this.terminalFontSize = store.get('terminalFontSize', 10)
  },
  mounted() {

    let terminalContainer = document.getElementById('terminal')
    this.term = new Terminal({
      theme: {
        background: '#ffffff',
        foreground: '#78909C',
        cursor: '#15780F',
        selection: '#76FF0344'
      },
      fontSize: this.terminalFontSizeReal,
      cursorBlink: true,
      scrollback: 10000,
    })

    this.term.loadAddon(fitAddon)
    this.term.open(terminalContainer)
    fitAddon.fit()

    this.term.onData((data) => {
      // the bootloader does echo-back
      if (data === '\r') data = '\r\n'
      this.term.write(data)
      ipcRenderer.send('serial-rx', data)
    })

    ipcRenderer.on('serial-tx', (event, arg) => {
      this.term.write(arg)
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
