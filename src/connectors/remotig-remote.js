/* eslint-disable class-methods-use-this */
/* eslint-disable no-unused-expressions */
import {SignalsBinder} from '../signals.js'
// import {Microphone} from '../connectors/mic.js'
import {delay} from '../utils.js'
import {WebRTC as ConnectionService} from '../interfaces/webrtc.js'
import {TransceiverProperties} from '../tcvr.js'

const _connectDelay = 5000  // delay in ms after connection establishment
// reconnectDelay: 2000,   // delay in ms between disc and conn commands

class RemotigConnector {

	#signals

	constructor(kredence) {
		this.kredence = kredence || {}

		const conoptions = ConnectionService.defaultOptions
		conoptions.signaling.autoClose = true
		this._con = new ConnectionService(conoptions)
		this._con.onControlOpen = () => this._onControlOpen()
		this._con.onTrack = e => this.onTrack(e)
		this._con.onRemoveTrack = e => this._onRemoveTrack(e)
		this._con.ondisconnect = () => this.onDisconnect()
		
		this._initSignals()
	}

	get id() { return 'remotig'; }

 	async connect() {
		if (this._isReady || this._isStarted) return null

		this._con.connectTransceiver(this.kredence)
		return new Promise(resolve => {this._onconnect = () => resolve(this)})
	}

	async disconnect() {
		this._con && this._con.disconnect()
	}

	// async reconnect() {
	// 	this.sendSignal('restart')
	// 	await this.disconnect()
	// 	// this._socket && this._socket.disconnect()
	// 	setTimeout(_ => this._connectSignaling(), this.options.session.reconnectDelay)
	// }

	get connected() {
		return this._con.connected
	}

	checkState(kredence) {
		if (!kredence.qth || !kredence.rig) return null
		// const signaling = io.connect('wss://' + kredence.qth, {transports: ['websocket']}) 
		if (!this._con) return null
		const statePromise = new Promise((resolve) => {
			this._con.stateResolved = state => {
				this._con.stateResolved = null
				resolve(state)
			}
		})
		this._con.sendSignal('state', kredence.rig)
		return statePromise
	}

	get tcvrProps() {
		return this._con.info && new TransceiverProperties(this._con.info.props)
	}

	get tcvrDefaults() {
		return this._con.info && this._con.info.propDefaults
	}

	onDisconnect() {
		// this._audio && this._audio.close()
		// this._audio = null
		// this._mic && this._mic.close()
		// this._mic = null
	}
	
	onTrack(event) {
		// this._audio = new AudioProcessor(event)
	}

	_onRemoveTrack(event) {
		console.debug('Remote track removed: ', event)
		// this._audio && this._audio.trackRemoved(event)
	}

	async _onControlOpen() {
		console.log('ok, powering on')
		this._con.sendCommand('poweron')
		await delay(_connectDelay)
		this._onconnect && this._onconnect()
	}

	// onControlClose() {
	// }

	_initSignals() {
		this.#signals = new SignalsBinder(this.id, {
			keyDit: async () => this._con.sendCommand('.'),
			keyDah: async () => this._con.sendCommand('-'),
			keySpace: async () => this._con.sendCommand('_'),
			keyMsg: async (value) => this._con.sendCommand(`keymsg=${value}`),
			wpm: async (value) => this._con.sendCommand(`wpm=${value}`),
			ptt: async (value) => this._con.sendCommand(`ptt${value ? 'on' : 'off'}`),
			mode: async (value) => this._con.sendCommand(`mode=${value}`),
			filter: async (value) => this._con.sendCommand(`filter=${value.filter}`),
			gain: async (value) => this._con.sendCommand(`gain=${value}`),
			agc: async (value) => this._con.sendCommand(`agc=${value.agc}`),
			freq: async (value) => this._con.sendCommand(`f=${value}`),
			band: async (value) => this._con.sendCommand(`band=${value}`),
			split: async (value) => this._con.sendCommand(`split=${value}`),
			rit: async (value) => this._con.sendCommand(`rit=${value}`),
			// xit: async (value) => this._con.sendCommand(`xit=${value}`),
			pwr: async (value) => this._con.sendCommand(`txpwr=${value}`),
			afg: async (value) => this._con.sendCommand(`afg=${value}`),
			rfg: async (value) => this._con.sendCommand(`rfg=${value}`),
			keepAlive: async () => this._con.sendCommand('poweron'),
			// audioMute: async () => this._audio.switchMute(),
		})
	}

	get signals() {
		return this.#signals
	}

}

// connectors.register(new RemotigRTCConnector())
export { RemotigConnector }
