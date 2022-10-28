
const bandPins = {160: 6, 80: 7, 60: 8, 40: 9, 30: 10, 20: 11, 17: 12, 15: 13, 12: 14, 10: 15, 6: 16, 2: 17}
export class AntennaSwitch {

	#connector
	#timer
	#pin

	constructor(antConnector = {pinState: (pin, state) => {}, timeout: 0}) {
		this.#connector = antConnector
		this.#timer = null
		this.#pin = null
	}

	set band(b) {
		console.info(`AntennaSwitch: set band ${b}`)
		this.#reset()
		this.#pin = b ? bandPins[b] : b
		if (this.#pin) {
			this.#activate()
			this.#timer = this.#connector.timeout && setInterval(_ => this.#activate(), this.#connector.timeout * 1000)
		}
	}

	#activate() {
		console.debug(`AntennaSwitch: ant pin ${this.#pin} set active`)
		this.#connector.pinState(this.#pin, true)
	}

	#reset() {
		console.debug('AntennaSwitch: pinState reset')
		this.#timer && clearInterval(this.#timer)
		this.#timer = null
		Object.values(bandPins).forEach(pin => this.#connector.pinState(pin, false))
	}
}
