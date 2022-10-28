import {Bands, Modes, AgcTypes} from '../../tcvr.js'
import {delay} from '../../utils.js'
import { resolveAgc, tcvrOptions } from './utils.js'

const myCivAddr = 224
const modeValues = {}
modeValues[Modes.LSB] = 0x00
modeValues[Modes.USB] = 0x01
modeValues[Modes.AM]  = 0x02
modeValues[Modes.CW]  = 0x03
modeValues[Modes.RTTY] = 0x04
modeValues[Modes.NFM] = 0x05
modeValues[Modes.WFM] = 0x06

const hex2dec = (h) => {
	const s = Math.floor(h / 10)
	return s * 16 + (h - s * 10)
}

export class Adapter {

	static async IC706(options) {
		return new Adapter(await tcvrOptions('icom', 'ic706', options))
	}

	static async forTcvr(model, options) {
		return new Adapter(await tcvrOptions(this.manufacturer, model, options))
	}

	static get manufacturer() {
		return 'icom'
	}

	static get models() {
		return ['ic706']
	}

	#options

	constructor(options = {address, baudrate, props}) {
		this._uart = _ => {} // do nothing
		this.#options = options || {}
	}

	async init(dataSender) {
		this._uart = async (data) => await dataSender(new Uint8Array(data))
		await delay(2000) // wait for tcvr internal CPU start
	}

	async close() {
		this._uart = _ => {} // do nothing
	}

	get civAddress() {
		return this.#options.address
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
		let mhz100 = 0
		if (f >= 100000000) {
			mhz100 = Math.floor(f / 100000000)
			f = f - (mhz100 * 100000000)
		}
		// log(`f=${f}`)
		const mhz10_1 = Math.floor(f / 1000000) // 10MHz, 1MHz
		f = f - (mhz10_1 * 1000000)
		// log(`f=${f}`)
		const khz100_10 = Math.floor(f / 10000) // 100kHz, 10kHz
		f = f - (khz100_10 * 10000)
		// log(`f=${f}`)
		const hz1000_100 = Math.floor(f / 100) // 1kHz, 100Hz
		f = f - (hz1000_100 * 100)
		// log(`f=${f}`)
		const hz10 = Math.floor(f / 10) * 10 // 10Hz

		const data = [0xFE, 0xFE,
			this.civAddress, myCivAddr, 0, // 0: transfer Freq CMD w/o reply .. 5: set Freq CMD with reply
			hex2dec(hz10), hex2dec(hz1000_100), hex2dec(khz100_10), hex2dec(mhz10_1), mhz100,
			0xFD]
		// log(`TCVR f: ${data}`)
		await this._uart(data) //, (err) => err && log(`TCVR ${err.message}`))
	}

	async mode(mode) {
		const value = modeValues[mode]
		if (value == null) {
			console.error('IcomTcvr: Unknown mode', mode)
			return
		}

		// log(`tcvrMode: ${mode} => ${value}`)
		const data = [0xFE, 0xFE,
			this.civAddress, myCivAddr, 0x06, value, 0x01,
			0xFD]
		await this._uart(data)
	}

	async agc({agc, mode}) {
		const value = resolveAgc(agc, mode) == AgcTypes.SLOW ? 0x02 : 0x01
		// log(`tcvrAgc: ${state}`)
		const data = [0xFE, 0xFE,
			this.civAddress, myCivAddr, 0x16, 0x12, value,
			0xFD]
		await this._uart(data)
	}

	async gain(value) {
		// log(`tcvrPreamp: ${state}`)
		const gain = value > 0 ? 0x01 : 0
		let data = [0xFE, 0xFE,
			this.civAddress, myCivAddr, 0x16, 0x02, gain,
			0xFD]
		await this._uart(data)

		const attn = value < 0 ? 0x20 : 0
		data = [0xFE, 0xFE,
			this.civAddress, myCivAddr, 0x11, attn,
			0xFD]
		await this._uart(data)
	}

	async wpm(wpm) {}

	async keymsg(msg) {}

	async txpower(level) {}

	async afgain(level) {}

	async rfgain(level) {}

	async ptt(state) {}

	// set attn(attn) {
	// 	// log(`tcvrAttn: ${state}`)
	// 	const value = attn > 0 ? 0x20 : 0
	// 	const data = [0xFE, 0xFE,
	// 		this.civAddress, myCivAddr, 0x11, value,
	// 		0xFD]
	// 	this._uart(data)
	// }

	async filter({filter, mode}) {
		// not supported
	}
}
