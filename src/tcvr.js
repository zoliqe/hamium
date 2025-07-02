/* eslint-disable class-methods-use-this */
/* eslint-disable no-unused-expressions */
/* eslint-disable no-return-assign */
/* eslint-disable max-classes-per-file */
import {TcvrSignal, SignalType, SignalBus } from './signals.js'


// const _bands = ['1.8', '3.5', '7', /* '10.1', */ '14', /* '18', */ '21', /* '24', */ '28']
// const _bandLowEdges = [1810, 3500, 7000, /* 10100, */ 14000, /* 18068, */ 21000, /* 24890, */ 28000]
// const _startFreqFromLowEdge = 21
// const _modes = ['LSB', 'USB', 'CW', /*'CWR'*/] // order copies mode code for MDn cmd
const _filters = {
	'CW': {min: 200, max: 2000}, 'CWR': {min: 200, max: 2000},
	'LSB': {min: 1800, max: 3000}, 'USB': {min: 1800, max: 3000}
}

const _vfoBanksCount = 1
const _bandChangeDelay = 2000

class Band {
	#name
	#id
	#freqFrom
	#freqTo
	#extend

	constructor(name, id, minFreq, maxFreq, extend = 10_000) {
		this.#name = name
		this.#id = id
		this.#freqFrom = minFreq
		this.#freqTo = maxFreq
		this.#extend = extend
	}

	static byId(id) {
		// return _bands.find(band => band.id == id)
		return Bands[id]
	}

	static byFreq(freq) {
		const f = Number(freq)
		return Object.values(Bands)
			.find(band => (band.freqFrom - band.extend) <= f && (band.freqTo + band.extend) >= f)
	}

	toString() {
		return JSON.stringify(this)
	}

	toJSON() {
		return {id: this.#id, name: this.#name, freqFrom: this.#freqFrom, freqTo: this.#freqTo}
	}

	get name() {
		return this.#name
	}

	get id() {
		return this.#id
	}

	get freqFrom() {
		return this.#freqFrom
	}

	get freqTo() {
		return this.#freqTo
	}

	get extend() {
		return this.#extend
	}
}

const _bands = {}
// const addBand = ([name, id, minFreq, maxFreq]) => _bands[id] = new Band(name, id, minFreq * 1000, maxFreq * 1000)
const __b = [
	[1.8, 	   160,		     1810,      2000],
	[3.5,	    80,	         3500,      3800],
	[5,	        60, 	     5351,      5368],
	[7,         40,		     7000,      7200],
	[10.1,	    30,			10100,		 10150],
	[14,		20,			14000,		 14350],
	[18,		17,			18068,		 18168],
	[21,		15,			21000,		 21450],
	[24,		12,			24890,		 24990],
	[28,		10,	 		28000,		 29700],
	[50,		6,			50000,		 54000],
	[70,		4,			70000,		 70500],
	[144,		2,		 144000,		146000],
	[430,		70,		 430000,		440000],
	[1296,	23,		1240000,	 1300000]]
__b.forEach(([name, id, minFreq, maxFreq]) => _bands[id] = new Band(name, id, minFreq * 1000, maxFreq * 1000))
const Bands = Object.freeze(_bands)

const _modes = {}
const __m = ['CW', 'CWR', 'LSB', 'USB', 'RTTY', 'RTTYR', 'NFM', 'WFM', 'AM']
__m.forEach(id => _modes[id] = id)
const Modes = Object.freeze(_modes)

const _agcTypes = {}
const __a = ['FAST', 'SLOW', 'MEDIUM', 'AUTO', 'OFF']
__a.forEach(agc => _agcTypes[agc] = agc)
const AgcTypes = Object.freeze(_agcTypes)

class Transceiver {

	#props
	#defaultProps
	#state = {}
	#defaults = { rit: 0, xit: 0, step: 10, wpm: 28, paddleReverse: false }
	#connectors = []
	#bus = new SignalBus()
	#acl = [this]

	get id() {
		return 'tcvr'
	}

	async disconnect() {
		this.#props = null
		this.unbind(this.id)

		this._disconnectAllConnectors()
		this.#connectors = []
		this.fire(new TcvrSignal(SignalType.pwrsw, false), {force: true})
	}

	async _disconnectAllConnectors() {
		for (const connector of this.#connectors) {
			if (connector && connector.connected) {
				this._d('disconnect', connector.id)
				connector.signals.out.unbind(this)
				await connector.disconnect()
			}
		}
	}

	async connect(connectors) {
		let connectedConnector // all connectors have adapter to same tcvr type
		for (const connector of connectors) {
			connectedConnector = await this._connectConnector(connector)
			connectedConnector && this.#connectors.push(connectedConnector)
		}

		if (connectedConnector) {
			this.bind(SignalType.keyDit, this.id, _ => this._keyTx())
			this.bind(SignalType.keyDah, this.id, _ => this._keyTx())
			this.bind(SignalType.keySpace, this.id, _ => this._keyTx())
			await this._initState(connectedConnector)
		}
		// if (connectors.pwr) {
		// 	const connector = await this._connectConnector(connectors.pwr)
		// 	this.#connectors.pwr = connector
		// 	this._bindSignals()
		// }
		// if (connectors.cat) {
		// 	const connector = await this._connectConnector(connectors.cat)
		// 	this.#connectors.cat = connector
		// 	await this._initState(connector)
		// }
	}

	async _connectConnector(connector) {
		// if (connector.connected) return connector
		this._d('connect connector', connector.id)
		await connector.connect(this)
		if (connector.connected) {
			this._d('connected', connector.id)
			connector.signals.out.bind(this.#bus)
			return connector
		}
		this._d('connect failed', connector.id)
		return null
	}

	async _initState(connector) {
		this.#state = {} // TODO load state from KV storage
		Object.keys(this.#defaults).forEach(prop => this._mergeDefault(prop))
		this.#state.ptt = false
		this.#state.keyed = false
		this.#state.vfobank = 0

		const props = await connector.tcvrProps
		const defaults = await connector.tcvrDefaults
		this._mergePropsToState(props, defaults)

		// reset tcvr configuration
		this.setBand(this, this.#state.band)
		this.setWpm(this, this.#state.wpm)
		this.setStep(this, this.#state.step)
	}

	_mergeDefault(prop) {
		this.#state[prop] = this.#state[prop] || this.#defaults[prop]
	}

	_mergePropsToState(props, defaults) {
		if (props == null) throw new Error('TCVR: Connector returns empty props!')
		this._buildFreqTable(props)
		this._buildFilterTable(props)
		this._buildGainsTable(props)
		
		if (!this.#state.band || !props.bands.includes(this.#state.band))
			this.#state.band = defaults.band
		if (!this.#state.mode || !props.modes.includes(this.#state.mode))
			this.#state.mode = defaults.mode
		if (!this.#state.agc || !props.agcTypes.includes(this.#state.agc))
			this.#state.agc = defaults.agc
		
		this.#props = props // set field after everything is done
		this.#defaultProps = defaults
	}

	_buildFreqTable(props) {
		this.#state.freq = this.#state.freq || {}
		this.#state.split = this.#state.split || {}
		for (const band of props.bands) {
			this.#state.freq[band] = this.#state.freq[band] || []
			this.#state.split[band] = this.#state.split[band] || []
			for (let i = 0; i < _vfoBanksCount; i += 1) {
				this.#state.freq[band][i] = this.#state.freq[band][i] || Bands[band].freqFrom
				this.#state.split[band][i] = this.#state.split[band][i] || 0
			}
		}
	}
		
	_buildFilterTable(props) {
		this.#state.filters = this.#state.filters || {}
		props.modes.forEach(mode => {
			const filters = props.filters(mode)
			let filter = this.#state.filters[mode]
			if (!filters.includes(filter))
				filter = filters[0]

			this.#state.filters[mode] = filter
		})
	}
	
	_buildGainsTable(props) {
		this.#state.gains = this.#state.gains || {}
		props.bands.forEach(band => {
			const gain = this.#state.gains[band]
			this.#state.gains[band] = (gain && props.gains(band).includes(gain)) || 0
		})
	}

	keepAlive() {
		this.online && this.fire(new TcvrSignal(SignalType.keepAlive, Date.now()))
		// TODO persist state to KV storage
	}

	_keyTx() {
		if (!this.#state.keyed) {
			this.#state.keyed = true
			this.fire(new TcvrSignal(SignalType.keyTx, true))
		}
		if (this._txTimer) {
			clearTimeout(this._txTimer)
			this._txTimer = null
		}
		this._txTimer = setTimeout(() => {
			this._txTimer = null
			if (this.#state.keyed) {
				this.#state.keyed = false
				this.fire(new TcvrSignal(SignalType.keyTx, false))
			} 
		}, 100)
	}

	get ptt() {
		return this.#state.ptt
	}

	setPtt(controller, state) {
		if (!this.online || this._denieded(controller)) return
		// if (this.#state.mode !== Modes.LSB && this.#state.mode !== Modes.USB) return
		this.#state.ptt = state
		this._d("ptt", state)
		this.fire(new TcvrSignal(SignalType.ptt, state))
	}

	get wpm() {
		return this.#state.wpm
	}

	setWpm(controller, wpm) {
		if (!this.online || this._denieded(controller)) return
		if (wpm < 16 || wpm > 40) return
		this._d("wpm", wpm)
		this.#state.wpm = wpm
		this.fire(new TcvrSignal(SignalType.wpm, wpm))
	}

	get reversePaddle() {
		return this.#state.paddleReverse
	}

	setReversePaddle(controller, value) {
		if (!this.online || this._denieded(controller)) return
		this.#state.paddleReverse = value
		this._d('reverse', value)
		this.fire(new TcvrSignal(SignalType.reverse, value))
	}

	get properties() {
		return this.#props
	}

	get defaultProps() {
		return this.#defaultProps
	}

	get connectorId() {
		return this._connectorId
	}

	get online() {
		return this.properties && this.#connectors.some(connector => connector.connected) //&& this.#connectors.cat.connected
	}

	get bands() {
		return this.properties && this.properties.bands
	}

	get band() {
		return this.#state.band
	}

	setBand(controller, band) {
		if (!this.online || this._denieded(controller)) return
		if (!this.properties.bands.includes(band)) return

		// disable RIT & SPLIT on current band
		// reset state of split here but fire split=0,rit=0 in bandTimer
		this.#state.split[this.#state.band][this.#state.mode] = 0

		this._d("band", band)
		this.#state.band = band

		if (this._bandTimer != null) { // another band change hit
			clearTimeout(this._bandTimer)
		}
		// reset state - some tcvrs may store state on per band basis
		this._bandTimer = setTimeout(() => {
			this._bandTimer = null
			this.fire(new TcvrSignal(SignalType.band, this.band))
			if (controller.preventSubcmd) return // commands below are sub-commands (in context of remotig server - they are sent as separate commands)
			this.fire(new TcvrSignal(SignalType.split, 0)) // disable RIT & SPLIT on current band
			this.fire(new TcvrSignal(SignalType.rit, 0))
			this.setFreq(this, this.#state.freq[this.#state.band][this.#state.vfobank])
			this.setSplit(this, 0) // disable RIT (in case tcvr has incorrect state)
			this.setRit(this, 0) // disable SPLIT (in case tcvr has incorrect state)
			this.fire(new TcvrSignal(SignalType.mode, this.mode), {subcmd: true})
			this.fire(new TcvrSignal(SignalType.gain, this.gain), {subcmd: true})
			this.fire(new TcvrSignal(SignalType.agc, {agc: this.agc, mode: this.mode}), {subcmd: true})
			this.fire(new TcvrSignal(SignalType.filter, {filter: this.filter, mode: this.mode}), {subcmd: true})
		}, this.bandChangeDelay) // wait for band change on tcvr
	}

	get bandChangeDelay() {
		return _bandChangeDelay
	}

	outOfBand(f) {
		const band = Band.byFreq(f)
		return !band || band.id !== this.#state.band //! this.bands.includes(band)
	}

	get freq() {
		return this.#state.freq[this.#state.band][this.#state.vfobank]
	}

	setFreq(controller, freq, options = {allowBandChange: false}) {
		if (!this.online || this._denieded(controller)) return
		if (options && options.allowBandChange && this.outOfBand(freq)) {
			const band = Band.byFreq(freq)
			if (!band) return
			this.setBand(this, band.id)
			this.#state.freq[this.#state.band][this.#state.vfobank] = freq
			return
		}
		if (this.outOfBand(freq)) return
		// if (freq < (_bandLowEdges[this._band] - 1) * 1000 || freq > (_bandLowEdges[this._band] + 510) * 1000)
		// 	return
		this.#state.freq[this.#state.band][this.#state.vfobank] = freq
		this._d("freq", freq)
		this.fire(new TcvrSignal(SignalType.freq, freq))
	}

	get split() {
		return this.#state.split[this.#state.band][this.#state.vfobank]
	}

	setSplit(controller, freq) {
		if (!this.online || this._denieded(controller)) return
		if (freq && (this.outOfBand(freq) || Band.byFreq(freq) !== Band.byFreq(this.freq))) return
		if (this.rit) this.setRit(this, 0)
		this.#state.split[this.#state.band][this.#state.vfobank] = freq
		this._d('split', freq)
		this.fire(new TcvrSignal(SignalType.split, freq))
	}

	get rit() {
		return this.#state.rit
	}

	setRit(controller, value) {
		if (!this.online || this._denieded(controller)) return
		this._d('rit', value)
		if (Math.abs(value) < 10000) {
			if (this.split) this.setSplit(this, 0)
			this.#state.rit = value
			this.fire(new TcvrSignal(SignalType.rit, value))
		}
	}

	// get xit() {
	// 	return this.#state.xit
	// }

	// setXit(controller, value) {
	// 	if (!this.online || this._denieded(controller)) return
	// 	this._d('xit', value)
	// 	if (Math.abs(value) < 10000) {
	// 		this.#state.xit = value
	// 		this.fire(new TcvrSignal(SignalType.xit, value))
	// 	}
	// }

	get steps() {
		return [10, 100, /* 1000, 10_000 */]
	}

	get step() {
		return this.#state.step
	}

	setStep(controller, value) {
		if (this._denieded(controller)) return
		this._d('step', value)
		if (this.steps.includes(value)) {
			this.#state.step = value
			this.fire(new TcvrSignal(SignalType.step, value))
		}
	}

	get modes() {
		return this.properties && this.properties.modes
	}

	get mode() {
		return this.#state.mode
	}

	setMode(controller, value) {
		if (!this.online || this._denieded(controller)) return
		this._d("mode", value)
		if (this.modes.includes(value)) {
			this.#state.mode = value
			this.fire(new TcvrSignal(SignalType.mode, this.#state.mode))
			if (controller.preventSubcmd) return // commands below are sub-commands (in context of remotig server - they are sent as separate commands)
			// this.fire(new TcvrSignal(SignalType.freq, this.#state.freq[this.#state.band][this.#state.vfobank]), {subcmd: true})
			this.fire(new TcvrSignal(SignalType.filter, {filter: this.filter, mode: this.mode}), {subcmd: true})
		}
	}

	get filters() {
		return this.properties && this.properties.filters(this.mode)
	}

	get filter() {
		return this.#state.filters[this.mode]
	}

	setFilter(controller, bw) {
		if (!this.online || this._denieded(controller)) return
		this._d('filter', bw)
		// const filterRange = _filters[this.mode]
		// if (filterRange.min <= bw && filterRange.max >= bw) {
		if (this.filters.includes(bw)) {
			this.#state.filters[this.mode] = bw
			this.fire(new TcvrSignal(SignalType.filter, {filter: bw, mode: this.mode}))
		}
	}

	get gains() {
		return this.properties && this.properties.gains(this.band)
	}

	get gain() {
		return this.#state.gains[this.band]
	}

	setGain(controller, value) {
		if (!this.online || this._denieded(controller)) return
		if (this.gains.includes(value)) {
			this.#state.gains[this.band] = value
			this.fire(new TcvrSignal(SignalType.gain, value))
		}
	}

	get agcTypes() {
		return this.properties && this.properties.agcTypes
	}

	get agc() {
		return this.#state.agc
	}

	setAgc(controller, value) {
		if (!this.online || this._denieded(controller)) return
		if (this.agcTypes.includes(value)) {
			this.#state.agc = value
			this._d('agc', value)
			this.fire(new TcvrSignal(SignalType.agc, {agc: value, mode: this.mode}))
		}
	}

	get pwr() {
		return this.#state.pwr
	}

	setPwr(controller, pwr) {
		if (!this.online || this._denieded(controller)) return
		if (pwr < 0 || pwr > 150) return
		this._d("pwr", pwr)
		this.#state.pwr = pwr
		this.fire(new TcvrSignal(SignalType.pwr, pwr))
	}

	get afg() {
		return this.#state.afg
	}

	setAfg(controller, afg) {
		if (!this.online || this._denieded(controller)) return
		if (afg < 0 || afg > 255) return
		this._d("afg", afg)
		this.#state.afg = afg
		this.fire(new TcvrSignal(SignalType.afg, afg))
	}

	get rfg() {
		return this.#state.rfg
	}

	setRfg(controller, rfg) {
		if (!this.online || this._denieded(controller)) return
		if (rfg < 0 || rfg > 250) return
		this._d("rfg", rfg)
		this.#state.rfg = rfg
		this.fire(new TcvrSignal(SignalType.rfg, rfg))
	}

	bind(type, owner, callback) {
		this.#bus.bind(type, owner, callback)
	}

	unbind(owner) {
		this.#bus.unbind(owner)
	}

	fire(signal, force) {
		if (!force && !this.online) return
		this.#bus.fire(signal)
	}

	attachController(controller) {
		if (controller.exclusive) {
			this._detachControllers()
		}
		this.#acl.push(controller)
	}

	_detachControllers() {
		this.#acl
			.filter(ctlr => ctlr.id !== this.id)
			.forEach(ctlr => ctlr.detach())
		this.#acl = [this]
	}

	_denieded(controller) {
		return this.#acl.find(ctlr => controller.id === ctlr.id) == null
	}

	_d(what, value) {
		console.debug(`[${new Date().toJSON()}] ${what}:`, value);
	}
}


class TransceiverProperties {

	#bands

	#modes

	#agcTypes

	#bandGains

	#modeFilters

	constructor({ bands, modes, agcTypes, bandGains, modeFilters }) {
		if (!bands || !bands.length) throw new Error('No bands declared')
		this.#bands = bands
		this.#modes = modes && modes.length ? modes : [Modes.LSB]
		this.#agcTypes = agcTypes && agcTypes.length ? agcTypes : [AgcTypes.AUTO]

		this.#bandGains = {}
		if (bandGains && Object.keys(bandGains).length) {
			Object.entries(bandGains).forEach(([band, gains]) => {
				this.#bandGains[band] = gains && gains.includes(0) ? [...gains] : [0, ...gains] // 0 is mandatory
			})
		} else {
			bands.forEach(b => this.#bandGains[b] = [0])
		}

		if (modeFilters && Object.keys(modeFilters).length) {
			this.#modeFilters = modeFilters
		} else {
			this.#modeFilters = {}
			const defaultFilter = mode => (_filters[mode] && _filters[mode].max) || 3000
			this.#modes.forEach(m => {
				this.#modeFilters[m] = [defaultFilter(m)]
			})
		}
	}

	static fromJSON(json) {
		return new TransceiverProperties(JSON.parse(json))
	}

	toJSON() {
		return {
			bands: this.#bands,
			modes: this.#modes,
			agcTypes: this.#agcTypes,
			bandGains: this.#bandGains,
			modeFilters: this.#modeFilters
		}
	}

	toString() {
		return JSON.stringify(this)
	}

	gains(band) {
		return this.#bands.includes(band) ? [...this.#bandGains[band]] : []
	}

	filters(mode) {
		return this.#modes.includes(mode) ? [...this.#modeFilters[mode]] : []
	}

	get bands() {
		return [...this.#bands]
	}

	get modes() {
		return [...this.#modes]
	}

	get agcTypes() {
		return [...this.#agcTypes]
	}

	get bandGains() {
		const bandGains = {}
		Object.keys(this.#bandGains)
			.forEach(b => bandGains[b] = [...this.#bandGains[b]])
		return bandGains
	}

	get modeFilters() {
		const modeFilters = {}
		Object.keys(this.#modeFilters)
			.forEach(m => modeFilters[m] = [...this.#modeFilters[m]])
		return modeFilters
	}
}

export {Transceiver, TransceiverProperties, Bands, Modes, AgcTypes}
