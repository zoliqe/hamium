/* eslint-disable class-methods-use-this */
/* eslint-disable no-unused-expressions */
import { delay } from '../utils.js'
import { Remotig } from './remotig/remotig.js'
import { BluetoothInterface } from '../interfaces/bluetooth.js'
import { SignalsBinder } from '../signals.js'
import { BufferedWriter } from './bufwriter.js'

// Sky is blue and your CAT is looking for another mouse...

class RemotigConnector {
	#iface
	#remotig
	#writer
	#heartbeatTimer

	constructor(tcvrAdapter, { options, keyerConfig }) {
		if (!BluetoothInterface || !navigator.bluetooth) {
			window.alert('Bluetooth connection not supported. Cannot connect to transceiver.')
			throw new Error('BlueRemotig: WebBluetooth is not supported!')
		}

		this.#remotig = new Remotig(tcvrAdapter,
			async (cmd) => this._send(cmd),
			{ options, keyerConfig })
		this.#writer = new BufferedWriter(async (data) => this.connected && this.#iface.send(data))
	}

	get id() {
		return 'remotig-blue'
	}

	async connect() {
		this.#iface = new BluetoothInterface()
		this.#iface.receive = this.onReceive
		this.#iface.receiveError = this.onReceiveError
		try {
			await this.#iface.connect()
			// await delay(1000) // wait for gatt server ready
			await this.#remotig.init()
		} catch (error) {
			console.error('BlueRemotig: Connection error', error)
			this.disconnect()
			throw error
		}
		this.#enableHeartbeat()
		console.info(`BlueRemotig device ${this.#iface.getDeviceName()} connected :-)`)
		window.sendRemotig = async data => this._send(data)

		return this
	}

	#enableHeartbeat() {
		this.#heartbeatTimer = setInterval(() => {
			this.connected && this._send('')
		}, 30000);
	}

	async disconnect() {
		this.#heartbeatTimer && clearInterval(this.#heartbeatTimer)
		this.#heartbeatTimer = null
		await this.#remotig.off()
		await delay(1000) // for poweroff signals TODO
		this.#iface && this.#iface.disconnect()
		this.#iface = null
	}

	async _send(data) {
		if (this.connected) {
			await this.#writer.write(data)
			console.debug(`BlueRemotig sent: ${data}`)
		}
	}

	get connected() {
		return this.#iface && this.#iface.getDeviceName()
	}

	async checkState() {
		// TODO maybe check present device by navigator.usb.getDevices()?
		return { id: this.id } // this.connected ? {id: this.id} : null
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

	onReceive(data) {
		console.debug('BlueRemotig rcvd:', data)
	}

	onReceiveError(error) {
		console.error('BlueRemotig error:', error)
	}

}

export { RemotigConnector }
