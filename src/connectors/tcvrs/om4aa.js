/* eslint-disable class-methods-use-this */
/* eslint-disable no-unused-expressions */
import { Modes, AgcTypes } from '../../tcvr.js'
import { delay } from '../../utils.js'
import { selectFilter, resolveAgc, tcvrOptions } from './utils.js'

const MD = {}
MD[Modes.CW] = 3
MD[Modes.CWR] = 7
MD[Modes.LSB] = 1
MD[Modes.USB] = 2

export class Adapter {

	static async bobik(options) {
		return new Adapter(await tcvrOptions(this.manufacturer, 'bobik', options))
	}

	static async forTcvr(model, options) {
		return new Adapter(await tcvrOptions(this.manufacturer, model, options))
	}

	static get manufacturer() {
		return 'om4aa'
	}

	static get models() {
		return ['bobik']
	}

	_splitState = false

	_rit = 0

	_xit = 0

	constructor(options = { model: null, baudrate: null, props: null }) {
		this._uart = () => { } // do nothing
		this._options = options || {}
		this._model = options.model || ''
	}

	async init(dataSender) {
		this._uart = async (data) => dataSender(`${data};`)
		await delay(2000) // wait for tcvr internal CPU start
	}

	async close() {
		this._uart = () => { } // do nothing
	}

	get properties() {
		return this._options.props
	}

	get defaults() {
		return this._options.defaults
	}

	get baudrate() {
		return this._options.baudrate
	}

	async frequency(freq) {
		let cmd = 'FA000'
		if (freq < 10000000) cmd += '0'
		await this._uart(cmd + freq)
	}

	async mode(mode) {
		const md = MD[mode]
		if (md != null) {
			await this._uart(`MD${md}`)
		} else {
			console.error('OM4AATcvr: Unknown mode', mode)
		}
	}

	async agc({agc, mode}) {
		await this._uart(`GT00${resolveAgc(agc, mode) === AgcTypes.OFF ? 0 : 1}`)
	}

	async gain(gain) {
//		await this._uart(`PA${gain > 0 ? 1 : 0}`)
		await this._uart(`RA0${gain < 0 ? 1 : 0}`)
	}

	async filter({filter, mode}) {
		const bandwidth = selectFilter(this.properties.filters(mode), filter)
		let bw = Number(bandwidth) / 10
		bw = String(bw).padStart(4, '0')
		await this._uart(`BW${bw}`)
	}

	async txpower(level) {
//		await this._uart(`PC${String(level).padStart(3, '0')}`)
	}

	async afgain(level) {
		// await this._uart(`AG${String(level).padStart(3, '0')}`)
	}

	async rfgain(level) {
		// await this._uart(`RG${String(level).padStart(3, '0')}`)
	}

	async wpm(wpm) {
		if (wpm < 8 || wpm > 50) return
		await this._uart(`KS${String(wpm).padStart(3, '0')}`)
	}

	async keymsg(msg) {
//		if (!msg) return
//		await this._uart(`KY ${msg.length > 24 ? msg.substring(0, 24) : msg}`)
	}

	async ptt(state) {
		await this._uart(state ? 'TX' : 'RX')
	}

	async split(value) {
		const state = value !== 0
		if (!state) {
			await this._uart('FR0') // set VFO A as RX VFO
			await this._uart('FT0') // set VFO A as TX VFO - cancel SPLIT
			this._splitState = false
			return
		}
		if (!this._splitState) {
			await this._uart('FR0') // set VFO A as RX VFO
			await this._uart('FT1') // set VFO B as TX VFO - enable SPLIT
			this._splitState = true
		}

		let cmd = 'FB000'
		if (value < 10000000) cmd += '0'
		await this._uart(cmd + value)
	}

	async rit(value) {
		// TODO use split and retune FA
// 		if (!value) {
// 			//			this.clearRit()
// 			this._rit = 0
// 			await this._uart('RT0')
// 			return
// 		}
// 		if (!this._rit) {
// 			// this._xit && (await this.xit(0))
// 			await this._uart('RT1')
// 		}

// 		if (value === this._rit) return
// 		const sign = value >= 0 ? '+' : '-'
// 		await this._uart(`RO${sign}${String(value).padStart(4, '0')}`)
// 		this._rit = value
	}

}
