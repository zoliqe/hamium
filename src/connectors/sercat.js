/* eslint-disable class-methods-use-this */
/* eslint-disable no-unused-expressions */
import { SignalsBinder } from '../signals.js'
import { SerialInterface } from '../interfaces/serial.js'

class SercatConnector {

	#iface

	#adapter

	#signals

	constructor(tcvrAdapter) {
		this.#adapter = tcvrAdapter
		this.#iface = new SerialInterface(this.#adapter.baudrate, [])
		this.#iface.receive = this.onReceive
		this.#iface.receiveError = this.onReceiveError

		this._initSignals()
	}

	get id() {
		return 'sercat'
	}

	async connect() {
		try {
			await this.#iface.connect()
			await this._on()
		} catch (error) {
			if (error === 'unsupported') {
				window.alert('Serial not supported by browser. Cannot connect to transceiver.')
				throw new Error('SERCAT: API is not supported!')
			}
			console.error('SERCAT Connection error:', error)
			throw error
		}
		window.sendCat = async data => this.#iface.send(data)
		return this
	}

	async disconnect() {
		if (!this.connected) return
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
		console.debug('SERCAT rcvd:', data)
	}

	onReceiveError(error) {
		console.error('SERCAT error:', error)
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


export { SercatConnector }
