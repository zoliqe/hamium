/* eslint-disable class-methods-use-this */
// import { delay } from '../utils.js'
import { Remotig, defaultOptions } from './remotig/remotig.js'
import { SerialInterface } from '../interfaces/serial.js'

class RemotigConnector {

	#iface
	#remotig

	constructor(tcvrAdapter, { options, keyerConfig }) {
		this.#iface = new SerialInterface(4800)
		this.#iface.receive = this.onReceive
		this.#iface.receiveError = this.onReceiveError
		options = options || { ...defaultOptions }
		options.useStartSeq = true
		this.#remotig = new Remotig(tcvrAdapter,
			async (cmd) => this.#iface.send(cmd), { options, keyerConfig })
	}

	get id() {
		return 'remotig-serial'
	}

	async connect() {
		try {
			await this.#iface.connect()
			await this.#remotig.init()
		} catch (error) {
			if (error === 'unsupported') {
				window.alert('Serial not supported by browser. Cannot connect to transceiver.')
				throw new Error('SerialRemotig: API is not supported!')
			}
			console.error('SerialRemotig Connection error:', error)
			throw error
		}
		window.sendRemotig = async data => this.#iface.send(data)
		return this
	}

	async disconnect() {
		if (!this.connected) return

		await this.#remotig.off()
		// await delay(1000) // for poweroff signals 
		await this.#iface.disconnect()
	}

	get connected() {
		return this.#iface.connected
	}

	async checkState() {
		// TODO maybe check present device by navigator.usb.getDevices()?
		return { id: this.id } // this.connected ? {id: this.id} : null
	}

	onReceive(data) {
		console.debug('SerialRemotig rcvd:', data)
	}

	onReceiveError(error) {
		console.error('SerialRemotig error:', error)
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
