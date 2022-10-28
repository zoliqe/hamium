/* eslint-disable class-methods-use-this */
import {delay} from '../../utils.js'
import {selectFilter, tcvrOptions} from './utils.js'

const hex2dec = (h) => {
	const s = Math.floor(h / 10)
	return s * 16 + (h - s * 10)
}

export class Adapter {

	static async FT1000MP(options) {
		return new Adapter(await tcvrOptions('yaesu', 'ft1000', options))
	}

	static async FT817(options) {
		return new Adapter(await tcvrOptions('yaesu', 'ft817', options))
	}

	static async forTcvr(model, options) {
		return new Adapter(await tcvrOptions(this.manufacturer, model, options))
	}

	static get manufacturer() {
		return 'yaesu'
	}

	static get models() {
		return ['ft1000', 'ft817']
	}

	#options

	constructor(options = {baudrate}) {
		this._uart = _ => {} // do nothing
		this.#options = options || {}
	}

	async init(dataSender) {
		this._uart = async (data) => dataSender(new Uint8Array(data))
		await delay(2000) // wait for tcvr internal CPU start
	}

	async close() {
		this._uart = _ => {} // do nothing
	}

	get baudrate() {
		return this.#options.baudrate
	}

	get properties() {
		return this.#options.props
	}

	get defaults() {
		return this.#options.defaults
	}

	async frequency(f) {
		let mhz100_10 = 0
		if (f >=                     10000000) { // 10MHz
			mhz100_10 = Math.floor(f / 10000000)
			f = f - (mhz100_10 *       10000000)
		}
		// log(`f=${f}`)
		const khz1000_100 = Math.floor(f / 100000) // 100kHz
		f = f - (khz1000_100 *             100000)
		// log(`f=${f}`)
		const khz10_1 = Math.floor(f / 1000) // 1kHz
		f = f - (khz10_1 *             1000)
		// log(`f=${f}`)
		const hz100_10 = Math.floor(f / 10) // 10Hz
		f = f - (hz100_10 *             10)
		// log(`f=${f}`)

		const data = this.#options.freqdata(hex2dec(mhz100_10), hex2dec(khz1000_100), hex2dec(khz10_1), hex2dec(hz100_10))
		// log(`TCVR f: ${data}`)
		await this._uart(data) //, (err) => err && log(`TCVR ${err.message}`))
	}

	async mode(mode) {
		const data = this.#options.modedata(mode)
		if (data == null) {
			console.error('YaesuTcvr: Unknown mode', mode)
			return
		}
		await this._uart(data)
	}

	async filter({filter, mode}) {
		if (this.#options.model === 'ft817') return // unsupported
		const filt = selectFilter(this.properties.filters(mode), filter)
		const data = this.#options.filterdata(filt)
		if (data == null) {
			console.error('YaesuTcvr: Unknown filter', filter)
			return
		}
		await this._uart(data)
	}

	async agc({agc, mode}) {}

	async gain(gain) {}

	async split(freq) {}

	async rit(rit) {}

	async wpm(wpm) {}

	async txpower(level) {}

	async afgain(level) {}

	async rfgain(level) {}

	async keymsg(msg) {}

	async ptt(state) {}

}
