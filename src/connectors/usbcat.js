/* eslint-disable class-methods-use-this */
/* eslint-disable no-unused-expressions */
import { SignalsBinder } from '../signals.js'
import { USBInterface } from '../interfaces/usb.js'

class UsbcatConnector {

	#adapter

	#signals

	#iface

	constructor(tcvrAdapter) {
		this.#adapter = tcvrAdapter

		this.#iface = new USBInterface()
		this.#iface.receive = this.onReceive
		this.#iface.receiveError = this.onReceiveError

		this._initSignals()
	}

	get id() {
		return 'usbcat'
	}

	async init() {
		await this.#iface.init()
	}

	async connect() {
		try {
			await this.#iface.connect()
			await this._on()
		} catch (error) {
			if (error === 'unsupported') {
				window.alert('USB not supported by browser. Cannot connect to transceiver.')
				throw new Error('USBCAT: API is not supported!')
			}
			console.error('USBCAT Connection error:', error)
			throw error
		}
		window.sendCat = async data => this.#iface.send(data)
		return this
	}

	async disconnect() {
		await this._off()
		await this.#iface.disconnect()
	}

	async _on() {
		this.#adapter.init && (await this.#adapter.init(async (data) => this.#iface.send(data)))
	}

	async _keepAlive() {
		// do nothing
	}

	async _off() {
		this.#adapter.close && (await this.#adapter.close())
	}

	get connected() {
		return this.#iface.connected
	}

	async checkState() {
		return { id: this.id } // this.connected ? {id: this.id} : null
	}

	get tcvrProps() {
		return this.#adapter.properties
	}

	get tcvrDefaults() {
		return this.#adapter.defaults
	}

	onReceive(data) {
		console.debug('USBCAT rcvd:', data)
	}

	onReceiveError(error) {
		console.error('USBCAT error:', error)
	}

	_initSignals() {
		this.#signals = new SignalsBinder(this.id, {
			ptt: async (value) => this.#adapter.ptt(value),
			wpm: async (value) => this.#adapter.wpm(value),
			keyMsg: async (value) => this.#adapter.keymsg(value),
			mode: async (value) => this.#adapter.mode(value),
			filter: async (value) => this.#adapter.filter(value),
			gain: async (value) => this.#adapter.gain(value),
			agc: async (value) => this.#adapter.agc(value),
			freq: async (value) => this.#adapter.frequency(value),
			split: async (value) => this.#adapter.split(value),
			rit: async (value) => this.#adapter.rit(value),
			xit: async (value) => this.#adapter.xit(value),
		})
	}

	get signals() {
		return this.#signals
	}
}


export { UsbcatConnector }
