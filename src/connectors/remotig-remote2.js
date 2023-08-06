import {SignalsBinder} from '../signals.js'
import {delay} from '../utils.js'
import {TransceiverProperties} from '../tcvr.js'

const _connectDelay = 5000  // delay in ms after connection establishment
// reconnectDelay: 2000,   // delay in ms between disc and conn commands

class RemotigConnector {

	#signals

	constructor(kredence) {
		this.kredence = kredence || {}

	}

	async _onControlOpen() {
		console.log('ok, powering on');
		this._con.send('poweron');
		await delay(_connectDelay);
        this._con.send('info?');
        this._pingTimer = setInterval(_ => this._con.send(`ping=${new Date().valueOf()}`))
		this._onconnect && this._onconnect();
	}

	_onControlClose() {
        this._pingTimer && clearInterval(this._pingTimer);
        this._pingTimer = null;
        this._info = null;
	}

	get id() { return 'remotig'; }

 	async connect() {
		this._con = new WebSocket(`ws://${this.kredence.qth}:8088`);
        this._con.onopen = event => this._onControlOpen();
        this._con.onclose = event => this._onControlClose();
        this._con.onerror = event => console.error('WebSocket error:', event);
        this._con.onmessage = event => {
            const msg = String(event.data);
            if (msg.startsWith('info=')) {
                this._info = msg.substring(5);
            } else if (msg.startsWith('pong=')) {
                const t1 = new Date().valueOf();
                const t0 = Number(msg.substring(5));
                console.info(`ResponseTime: ${t1 - t0}`);
            }
        }
		
		this._initSignals()
		return new Promise(resolve => {this._onconnect = () => resolve(this)})
	}

	async disconnect() {
		this._con && this._con.close();
        this._con = null;
	}

	// async reconnect() {
	// 	this.sendSignal('restart')
	// 	await this.disconnect()
	// 	// this._socket && this._socket.disconnect()
	// 	setTimeout(_ => this._connectSignaling(), this.options.session.reconnectDelay)
	// }

	get connected() {
		return this._con != null && this._con.readyState == WebSocket.OPEN;
	}

	checkState(kredence) {
		// if (!kredence.qth || !kredence.rig) return null
		// // const signaling = io.connect('wss://' + kredence.qth, {transports: ['websocket']}) 
		// if (!this._con) return null
		// const statePromise = new Promise((resolve) => {
		// 	this._con.stateResolved = state => {
		// 		this._con.stateResolved = null
		// 		resolve(state)
		// 	}
		// })
		// this._con.sendSignal('state', kredence.rig)
		// return statePromise
	}

	get tcvrProps() {
		return this._info && new TransceiverProperties(this._info.props)
	}

	get tcvrDefaults() {
		return this._info && this._info.propDefaults
	}

	_initSignals() {
		this.#signals = new SignalsBinder(this.id, {
			keyDit: async () => this._con.send('.'),
			keyDah: async () => this._con.send('-'),
			keySpace: async () => this._con.send('_'),
			keyMsg: async (value) => this._con.send(`keymsg=${value}`),
			wpm: async (value) => this._con.send(`wpm=${value}`),
			ptt: async (value) => this._con.send(`ptt${value ? 'on' : 'off'}`),
			mode: async (value) => this._con.send(`mode=${value}`),
			filter: async (value) => this._con.send(`filter=${value.filter}`),
			gain: async (value) => this._con.send(`gain=${value}`),
			agc: async (value) => this._con.send(`agc=${value.agc}`),
			freq: async (value) => this._con.send(`f=${value}`),
			band: async (value) => this._con.send(`band=${value}`),
			split: async (value) => this._con.send(`split=${value}`),
			rit: async (value) => this._con.send(`rit=${value}`),
			// xit: async (value) => this._con.send(`xit=${value}`),
			pwr: async (value) => this._con.send(`txpwr=${value}`),
			afg: async (value) => this._con.send(`afg=${value}`),
			rfg: async (value) => this._con.send(`rfg=${value}`),
			keepAlive: async () => this._con.send('poweron'),
			// audioMute: async () => this._audio.switchMute(),
		})
	}

	get signals() {
		return this.#signals
	}

}

// connectors.register(new RemotigRTCConnector())
export { RemotigConnector }
