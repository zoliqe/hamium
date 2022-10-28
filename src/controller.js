/* eslint-disable no-unused-expressions */
import {SignalType, TcvrSignal} from './signals.js'
import { Transceiver } from './tcvr.js'

export class TcvrController {
	#tcvr
	#attached
	#id
	exclusive = false
	preventSubcmd = false

	constructor(controllerId) {
		this.#id = controllerId
	}

	get id() {
		return this.#id
	}

	get active() {
		return this.#attached
	}

	detach() {
		this.#attached = false
		this.#tcvr = null
	}

	/**
	 * 
	 * @param {Transceiver} tcvr 
	 */
	attachTo(tcvr) {
		tcvr.attachController(this)
		this.#tcvr = tcvr
		this.#attached = true
	}

	async connect(connectors) {
		this.#tcvr && (await this.#tcvr.connect(connectors))
	}

	async disconnect() {
		this.#tcvr && this.#tcvr.disconnect()
	}

	async keepAlive() {
		this.#tcvr && this.#tcvr.keepAlive()
	}

	poweron() {
		this.#tcvr && this.#tcvr.fire(new TcvrSignal(SignalType.pwrsw, true), {force: true})
	}

	poweroff() {
		this.#tcvr && this.#tcvr.fire(new TcvrSignal(SignalType.pwrsw, false), {force: true})
	}

	keyDit() {
		this.#tcvr && this.#tcvr.fire(new TcvrSignal(SignalType.keyDit, 1))
	}

	keyDah() {
		this.#tcvr && this.#tcvr.fire(new TcvrSignal(SignalType.keyDah, 1))
	}

	keySpace() {
		this.#tcvr && this.#tcvr.fire(new TcvrSignal(SignalType.keySpace, 1))
	}

	keyMsg(msg) {
		this.#tcvr && this.#tcvr.fire(new TcvrSignal(SignalType.keyMsg, msg))
	}

	get properties() {
		return this.#tcvr && this.#tcvr.properties
	}

	get propDefaults() {
		return this.#tcvr && this.#tcvr.defaultProps
	}

	set ptt(value) {
		this.#tcvr && this.#tcvr.setPtt(this, value)
	}

	get wpm() {
		return this.#tcvr && this.#tcvr.wpm
	}

	set wpm(value) {
		this.#tcvr && this.#tcvr.setWpm(this, value)
	}

	get reversePaddle() {
		return this.#tcvr && this.#tcvr.reversePaddle
	}

	set reversePaddle(value) {
		this.#tcvr && this.#tcvr.setReversePaddle(this, value)
	}

	get bands() {
		return this.#tcvr && this.#tcvr.bands
	}

	get band() {
		return this.#tcvr && this.#tcvr.band
	}

	set band(value) {
		this.#tcvr && this.#tcvr.setBand(this, value)
	}

	get freq() {
		return this.#tcvr && this.#tcvr.freq
	}

	set freq(value) {
		if (!this.#tcvr) return
		if (this.id === 'ui' && this.#tcvr.freq === value) return
		this.#tcvr.setFreq(this, value)
	}

	set freqAndBand(value) {
		if (!this.#tcvr) return
		this.#tcvr.setFreq(this, value, {allowBandChange: true})
	}

	get split() {
		return this.#tcvr && this.#tcvr.split
	}

	set split(value) {
		if (!this.#tcvr) return
		if (this.id === 'ui' && this.#tcvr.split === value) return
		this.#tcvr.setSplit(this, value)
	}

	get rit() {
		return this.#tcvr && this.#tcvr.rit
	}

	set rit(value) {
		if (!this.#tcvr) return
		if (this.id === 'ui' && this.#tcvr.rit === value) return
		this.#tcvr.setRit(this, value)
	}

	// get xit() {
	// 	return this.#tcvr && this.#tcvr.xit
	// }
	set xit(value) {
		this.#tcvr && this.#tcvr.setXit(this, value)
	}

	get steps() {
		return this.#tcvr && this.#tcvr.steps
	}

	get step() {
		return this.#tcvr && this.#tcvr.step
	}

	set step(value) {
		this.#tcvr && this.#tcvr.setStep(this, value)
	}

	get modes() {
		return this.#tcvr && this.#tcvr.modes
	}

	get mode() {
		return this.#tcvr && this.#tcvr.mode
	}

	set mode(value) {
		this.#tcvr && this.#tcvr.setMode(this, value)
	}

	get filters() {
		return this.#tcvr && this.#tcvr.filters
	}

	get filter() {
		return this.#tcvr && this.#tcvr.filter
	}

	set filter(value) {
		this.#tcvr && this.#tcvr.setFilter(this, value)
	}

	get gains() {
		return this.#tcvr && this.#tcvr.gains
	}

	get gain() {
		return this.#tcvr && this.#tcvr.gain
	}

	set gain(value) {
		this.#tcvr && this.#tcvr.setGain(this, value)
	}

	get agcTypes() {
		return this.#tcvr && this.#tcvr.agcTypes
	}

	get agc() {
		return this.#tcvr && this.#tcvr.agc
	}

	set agc(value) {
		this.#tcvr && this.#tcvr.setAgc(this, value)
	}

	get pwr() {
		return this.#tcvr && this.#tcvr.pwr
	}

	set pwr(value) {
		this.#tcvr && this.#tcvr.setPwr(this, value)
	}

	get afg() {
		return this.#tcvr && this.#tcvr.afg
	}

	set afg(value) {
		this.#tcvr && this.#tcvr.setAfg(this, value)
	}

	get rfg() {
		return this.#tcvr && this.#tcvr.rfg
	}

	set rfg(value) {
		this.#tcvr && this.#tcvr.setRfg(this, value)
	}
}
