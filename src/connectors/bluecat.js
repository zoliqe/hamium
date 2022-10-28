/* eslint-disable class-methods-use-this */
/* eslint-disable no-unused-expressions */
import { BluetoothInterface } from '../interfaces/bluetooth.js'
import { SignalsBinder } from '../signals.js'
import { BufferedWriter } from './bufwriter.js'

// Sky is blue and your CAT is looking for another mouse...

class BlueCatConnector {
	#adapter
	#device
	#signals
	#writer

	constructor(tcvrAdapter) {
		this.#adapter = tcvrAdapter
		this._initSignals()
	}

	get id() {
		return 'bluecat'
	}

	async connect() {
		if (!BluetoothInterface || !navigator.bluetooth) {
			window.alert('Bluetooth connection supported. Cannot connect to transceiver.')
			throw new Error('BLUECAT: WebBluetooth is not supported!')
		}

		this.#device = new BluetoothInterface()

		try {
			await this.#device.connect()
		} catch (error) {
			console.error('BLUECAT: Connection error', error)
			throw error
		}
		console.info(`BLUECAT device ${this.#device.getDeviceName()} connected :-)`)
		this.#writer = new BufferedWriter(async (data) => this.#device.send(data))
		await this._on()
		this.#device.receive = data => this.onReceive(data)
		window.sendCat = async data => this._send(data)

		return this
	}

	async disconnect() {
		await this._off()
		this.#writer = null
		this.#device && this.#device.disconnect()
		this.#device = null
	}

	async _send(data) {
		if (this.#device) {
			await this.#writer.write(data)
			console.debug(`BLUECAT sent: ${data}`)
		}
	}

	async _on() {
		this.#adapter.init && (await this.#adapter.init(async (data) => this._send(data)))
	}

	async _keepAlive() {
		// do nothing
	}

	async _off() {
		this.#adapter.close && (await this.#adapter.close())
	}

	get connected() {
		return this.#device != null
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
		console.debug('BLUECAT rcvd:', data)
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

export { BlueCatConnector }
