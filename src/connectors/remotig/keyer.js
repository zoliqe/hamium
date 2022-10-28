/* eslint-disable no-unused-expressions */

export const defaultOptions = {
	ratio: 3,
	 // CT-spaces: 60, normal: 80
	pttTimeout: 5000, ditCoef: 120, dahCoef: 120, elementSpaceCoef: 60, letterSpaceCoef: 60}

const wpmCoef = 12000
const calcLength = (wpm, coef) => Math.floor(coef * wpmCoef / wpm)
export const ditLength = wpm => calcLength(wpm, defaultOptions.ditCoef)
export const dahLength = wpm => calcLength(wpm, defaultOptions.ratio * defaultOptions.dahCoef)
export const elementSpaceLength = wpm => calcLength(wpm, defaultOptions.elementSpaceCoef)
export const letterSpaceLength = wpm => calcLength(wpm, defaultOptions.ratio * defaultOptions.letterSpaceCoef)

export class Keyer {

	#wpm = 0
	#connector
	#pttTimeout
	#pttTimer
	#keyTimer

	constructor(
		keyerConnector = {send: () => {}, speed: () => {}, state: () => {}, key: () => {}, ptt: () => {}}, 
		options = defaultOptions
	) {
		this.#pttTimeout = options.pttTimeout
		this.coefs = {dit: options.ditCoef, dah: options.dahCoef, 
			elementSpace: options.elementSpaceCoef, letterSpace: options.letterSpaceCoef}
		this.#connector = keyerConnector
	}

	async send(msg) {
		if (this.disabled) return
		await this.#connector.send(msg)
	}

	async ptt(state, timeout = this.#pttTimeout) {
		// if (!state) {
		// 	await this.#connector.ptt(false)
		// 	this.#pttTimer != null && clearTimeout(this.#pttTimer)
		// 	this.#pttTimer = null
		// 	return
		// }

		// if (!timeout) return; // disable PTT

		// this.#pttTimer != null && clearTimeout(this.#pttTimer)
		// await this.#connector.ptt(true) // this resets powron ptt watchdog counter
		// this.#pttTimer = setTimeout(async () => {
		// 	this.#pttTimer = null
		// 	await this.#connector.ptt(false)
		// }, timeout)
	}

	async key(state, timeout = this.#pttTimeout) {
		// if (this.disabled) return

		// if (!state) {
		// 	await this.#connector.key(false)
		// 	this.#keyTimer != null && clearTimeout(this.#keyTimer)
		// 	this.#keyTimer = null
		// 	return
		// }

		// if (!timeout) return;

		// this.#keyTimer != null && clearTimeout(this.#keyTimer)
		// await this.#connector.key(true) // reset powron watchdog timer
		// this.#keyTimer = setTimeout(async () => {
		// 	this.#keyTimer = null
		// 	await this.#connector.key(false)
		// }, timeout)
	}

	async setwpm(value) {
		this.#wpm = Number(value)
		if (this.disabled) return // check after setting value, to allow disable/enable keyer
		await this.#connector.speed(this.#wpm)
	}

	get wpm() {
		return this.#wpm
	}

	get disabled() {
		return this.#wpm < 1 || !this.#connector.state()
	}

}
