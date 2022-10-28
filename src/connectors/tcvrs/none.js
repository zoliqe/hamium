/* eslint-disable class-methods-use-this */
/* eslint-disable no-unused-expressions */
import { tcvrOptions } from './utils.js'

export class Adapter {

	static async forTcvr(model, options) {
		return new Adapter(await tcvrOptions(this.manufacturer, model, options))
	}

	static get manufacturer() {
		return 'none'
	}

	static get models() {
		return ['none']
	}

	constructor(options = { model: null, props: null }) {
		this._options = options || {}
		this._model = options.model || ''
	}

	async init(dataSender) {
	}

	async close() {
	}

	get properties() {
		return this._options.props
	}

	get defaults() {
		return this._options.defaults
	}

	get baudrate() {
		return 0
	}

	async frequency(freq) {
	}

	async mode(mode) {
	}

	async agc({agc, mode}) {
	}

	async gain(gain) {
	}

	async filter({filter, mode}) {
	}

	async txpower(level) {
	}

	async afgain(level) {
	}

	async rfgain(level) {
	}

	async wpm(wpm) {
	}

	async keymsg(msg) {
	}

	async ptt(state) {
	}

	async split(value) {
	}

	async rit(value) {
	}

	// async xit(value) {
	// }

}
