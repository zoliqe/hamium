/* eslint-disable class-methods-use-this */
import { Remotig } from './remotig/remotig.js'

class RemotigConnector {

  #iface
  #remotig
  #options

  constructor(tcvrAdapter, { options, keyerConfig }) {
    this.#options = options || {}
    this.#remotig = new Remotig(tcvrAdapter,
      async (cmd) => this.connected && this.#iface.send(cmd),
      { options, keyerConfig })
  }

  get id() {
    return 'remotig-ws'
  }

  async init({onready}) {
    const url = `ws://${this.#options.host || 'localhost:8088'}/ctl`
    // let cbOnready = onready
    console.info('WsRemotig: connecting to', url)
    this.#iface = new WebSocket(url)
    this.#iface.onmessage = event => this.onReceive(event.data)
    this.#iface.onopen = () => {
      this.onReceive('opened')
      onready && onready()
      // if (cbOnready) { 
      //   cbOnready()
      //   cbOnready = null
      // }
    }
    this.#iface.onclose = _ => {
      this.onReceive('closed')
      // setTimeout(_ => this.init(), 5000)
    }
    this.#iface.onerror = event => this.onReceiveError(event)
  }

  async connect() {
    // try {
      await this.#remotig.init()
    // } catch (error) {
    //   console.error('WsRemotig init error:', error)
    //   throw error
    // }
		window.sendRemotig = async data => this.#iface.send(data)
    return this
  }

  async disconnect() {
    if (!this.connected) return
    console.debug('WsRemotig: disconnect')
    await this.#remotig.off()
    // await delay(200) // for poweroff signals TODO
    this.#iface.close()
  }

  get connected() {
    return this.#iface != null && this.#iface.readyState == 1
  }

  async checkState() {
    return { id: this.id } // this.connected ? {id: this.id} : null
  }

  onReceive(data) {
    console.debug('WsRemotig rcvd:', data)
  }

  onReceiveError(error) {
    console.error('WsRemotig error:', error)
  }

  get tcvrProps() {
    return this.#remotig.tcvrProps
  }

  get tcvrDefaults() {
    return this.#remotig.tcvrDefaults
  }

  get signals() {
    return this.#remotig.signals
  }
}

export { RemotigConnector }
