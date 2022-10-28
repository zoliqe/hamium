/* eslint-disable class-methods-use-this */
/* eslint-disable no-unused-expressions */
import {SignalsBinder} from '../signals.js'

class NocatConnector {

	#signals
	
	#adapter

	constructor(tcvrAdapter) {
		this.#adapter = tcvrAdapter
		this.#signals = new SignalsBinder(this.id, {})
	}

	get id() {
		return 'nocat'
	}

	async connect() {
		return this
	}
	
	async disconnect() {
	}

	get connected() {
		return true
	}

	async checkState() {
		return {id: this.id} // this.connected ? {id: this.id} : null
	}
	
	get tcvrProps() {
		return this.#adapter.properties
	}

	get tcvrDefaults() {
		return this.#adapter.defaults
	}

	get signals() {
		return this.#signals
	}
}


export {NocatConnector}
