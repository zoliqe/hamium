import {delay} from '../../utils.js'

const State = {on: 'active', starting: 'starting', off: 'off', stoping: 'stoping'}
export class PowrSwitch {

	#state = State.off
	#connector
	#watchdog

	constructor(powerConnector = {state: () => {}, timeout: 60}) {
		this.#connector = powerConnector
	}

	async on() {
		if (this.#state === State.stoping || this.#state === State.starting) {
			console.warn(`Remotig in progress state ${this.#state}, ignoring start`)
			return
		}

		if (this.#state === State.off) { // cold start
			console.info(`powerOn`)
		}

		this.#state = State.starting
		await this.#connector.state(true)
		this.#state = State.on
		this._watchdogStart()
	}

	async off() {
		if (this.#state === State.off || this.#state === State.stoping) return;

		this.#state = State.stoping
		console.info(`powerOff`)
		this._watchdogStop()
		await this.#connector.state(false)
		await delay(100)
		await this.#connector.state(false)

		this.#state = State.off
	}

	async resetWatchdog() {
		await this.#connector.state(true) // reset HW watchdog
		this.#state = State.on
		this._watchdogStart({reset: true})
	}

	_watchdogStart({reset = false} = {}) {
		if (!this.#connector.timeout || this.#state !== State.on) return
		if (reset && this.#watchdog == null) return

		if (this.#watchdog != null) clearTimeout(this.#watchdog)
		this.#watchdog = setTimeout(() => {
			console.info('PowrSW watchdog timedout')
			this.off()
		}, this.#connector.timeout * 1000);

		if (!reset) {
			console.info('PowrSW watchdog active, timeout:', this.#connector.timeout)
		}
	}

	_watchdogStop() {
		if (this.#watchdog != null) {
			clearTimeout(this.#watchdog)
			this.#watchdog = null
		}
	}

	get watchdogTimeout() {
		return this.#connector.timeout
	}

}

