/* eslint-disable prefer-destructuring */
/* eslint-disable no-unused-expressions */
// import {SignalType} from '../signals.js'

class Microphone {
	#audioTrackConstraints = {
		echoCancellation: {exact: false}, // on Android causes to always use internal mic
		'sampleRate': 8000, //{ideal: 8000},
// 		'sampleSize': 16,
		'channelCount': 1,
		'volume': 1.0, // {exact: 1.0},
		'autoGainControl': false,
		'noiseSuppression': false
	}
	#userMediaConstraints = {
		'video': false,
		'audio': this.#audioTrackConstraints
	}
	
	#stream
	
	#track

	constructor() {
		// this.tcvr = tcvr
	}

	async request(
// 		deviceLabels = ['Wired headset', 'USB Audio Device: USB Audio:2,0: Mic', 'USB Audio Device Analog Stereo', 'Audio Adapter (Planet UP-100, Genius G-Talk) Mono', 'Generic USB Audio Device: USB Audio:3,0: Mic']) {
		deviceLabels = ['Wired headset', 'USB Audio Device', 'Audio Adapter']
	) {
// 		if (!navigator.userAgent.includes('Android')) {
// 			const deviceId = await this._findDeviceIdByLabel(deviceLabels)
// 			this.#userMediaConstraints.audio.deviceId = /*deviceId != null ? {exact: deviceId} :*/ null
// 		}
		console.debug('Microphone: Requesting user microphone with constraints', this.#userMediaConstraints)
		
		try {
			this.#stream = await navigator.mediaDevices.getUserMedia(this.#userMediaConstraints)
		} catch (error) {
			window.alert(`Request to access your microphone was unsucessfull.\nAudio processing / SSB transmit will not be available.\nError: ${error.name}`)
			throw error
		}
		
		this.#stream.getAudioTracks().forEach(track => track.applyConstraints(this.#audioTrackConstraints))
		this.#track = this.#stream.getAudioTracks()[0]
		console.debug('Microphone: Adding microphone', this.#stream, this.#track)
		this.#track && console.info('Microphone constraints:', this.#track.getSettings())
// 		this.#track && navigator.userAgent.includes('Android') && alert(JSON.stringify(this.#track.getSettings()))
// 		alert(this.#track.label + ' ' + JSON.stringify(this.#track.getConstraints()))
		// this.mute()
		// this.tcvr.bind(SignalType.ptt, 'mic', 
		// 	event => event.value ? this.unmute() : this.mute())
		return this.#stream
	}

	async _findDeviceIdByLabel(labelsFilter) {
		try {
			const stream = await navigator.mediaDevices.getUserMedia(this.#userMediaConstraints) // request permisions to audio devices for enumerateDevices()
	
			const allDevices = await navigator.mediaDevices.enumerateDevices()
			console.debug('Microphone: Found these audioinput devices:', allDevices)
			const devices = allDevices
				.filter(device => device.kind === 'audioinput')
				.filter(device => labelsFilter.some(labelFilter => device.label.includes(labelFilter)))
			
			console.info('Microphone: Selected these audioinput devices (using first, if one found):', devices)
// 			if (devices.length === 1 && navigator.userAgent.includes('Android')) {
// 				alert(`cstrs: ${JSON.stringify(this.#userMediaConstraints)}`)
// 			}
			return devices.length === 1 ? devices[0].deviceId : null // only when exactly one device found, otherwise user must select default device in OS
		} catch (e) {
			console.error('Error enumerating mediaDevices:', e)
			return null
		}
	}

	close() {
		this.#track && this._track.stop()
		this.#stream = null
		this.#track = null
		// this.tcvr.unbind('mic')
	}

	mute() {
		this.#track && (this.#track.enabled = false)
	}

	unmute() {
		this.#track && (this.#track.enabled = true)
	}

	get track() {
		return this.#track
	}
	
	get stream() {
		return this.#stream
	}
}

export {Microphone}
