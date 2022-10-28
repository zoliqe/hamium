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
MD[Modes.RTTY] = 6

export class Adapter {

	static async K2(options) {
		return new Adapter(await tcvrOptions(this.manufacturer, 'k2', options))
	}

	static async KX3(options) {
		return new Adapter(await tcvrOptions(this.manufacturer, 'kx3', options))
	}

	static async forTcvr(model, options) {
		return new Adapter(await tcvrOptions(this.manufacturer, model, options))
	}

	static get manufacturer() {
		return 'elecraft'
	}

	static get models() {
		return ['k2', 'kx3']
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
			console.error('ElecraftTcvr: Unknown mode', mode)
		}
	}

	async agc({agc, mode}) {
		await this._uart(`GT00${resolveAgc(agc, mode) === AgcTypes.SLOW ? 4 : 2}`)
	}

	async gain(gain) {
		await this._uart(`PA${gain > 0 ? 1 : 0}`)
		await this._uart(`RA0${gain < 0 ? 1 : 0}`)
	}

	// async preamp(gain) {
	// 	await this._uart(`PA${gain > 0 ? 1 : 0}`)
	// }

	// async attn(attn) {
	// 	await this._uart(`RA0${attn > 0 ? 1 : 0}`)
	// }

	async filter({filter, mode}) {
		const filt = selectFilter(this.properties.filters(mode), filter)
		if (this._model === 'k2') await this._filterK2(filt, mode)
    else await this._filterK3(filt)
	}

	async _filterK2(filter, mode) {
		const index = this.properties.filters(mode).indexOf(Number(filter))
		if (index < 0) return
		await this._uart('K22')
		await this._uart(`FW0000${index + 1}`)
		await this._uart('K20')
		// const count = Object.keys(filters[mode]).length / 2
		// for (let i = 0; i < count; i++) this._uart(`FW0000${index}`) // cycle trought filters (basic cmd format)
	}

	async _filterK3(bandwidth) {
		let bw = Number(bandwidth) / 10
		bw = String(bw).padStart(4, '0')
		await this._uart(`BW${bw}`)
	}

	async txpower(level) {
		await this._uart(`PC${String(level).padStart(3, '0')}`)
	}

	async afgain(level) {
		await this._uart(`AG${String(level).padStart(3, '0')}`)
	}

	async rfgain(level) {
		await this._uart(`RG${String(level).padStart(3, '0')}`)
	}

	async wpm(wpm) {
		if (wpm < 8 || wpm > 50) return
		await this._uart(`KS${String(wpm).padStart(3, '0')}`)
	}

	async keymsg(msg) {
		if (!msg) return
		await this._uart(`KY ${msg.length > 24 ? msg.substring(0, 24) : msg}`)
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
		if (!value) {
			//			this.clearRit()
			this._rit = 0
			await this._uart('RT0')
			return
		}
		if (!this._rit) {
			// this._xit && (await this.xit(0))
			await this._uart('RT1')
		}

		if (this._model === 'k2') await this.ritK2(value)
    else await this.ritK3(value)

		this._rit = value
	}

	async ritK2(value) {
		const steps = this._diff10(this._rit, value)
		const up = steps > 0
		for (let step = 0; step < Math.abs(steps); step += 1) {
			// eslint-disable-next-line no-await-in-loop
			await this._uart(up ? 'RU' : 'RD')
		}
	}

	async ritK3(value) {
		if (value === this._rit) return
		const sign = value >= 0 ? '+' : '-'
		await this._uart(`RO${sign}${String(value).padStart(4, '0')}`)
	}

	// async xit(value) {
	// 	if (!value) {
	// 		await this._uart('XT0')
	// 		this._xit = 0
	// 		return
	// 	}

	// 	if (!this._xit) { // was disabled
	// 		this._rit && (await this.rit(0))
	// 		await this._uart('XT1')
	// 	}

	// 	const steps = this._diff10(this._xit, value)
	// 	const up = steps > 0
	// 	for (let step = 0; step < Math.abs(steps); step += 1) {
	// 		// eslint-disable-next-line no-await-in-loop
	// 		await this._uart(up ? 'RU' : 'RD')
	// 	}
	// }

	_diff10(v1, v2) {
		return Math.floor(v2 / 10) - Math.floor(v1 / 10)
	}

	// async clearRit() {
	// 	if (this._rit != -1) {
	// 		await this._uart('RC')
	// 		this._rit = 0
	// 	}
	// }

	// async clearXit() {
	// 	if (this._xit != -1) {
	// 		await this._uart('RC')
	// 		this._xit = 0
	// 	}
	// }
}
