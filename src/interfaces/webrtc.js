/* eslint-disable no-unused-vars */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-unused-expressions */

class WebRTC {

	static get defaultOptions() {
		return {
			signaling: {
				transports: ['websocket'],
				reconnectionDelay: 10000,
				reconnectionDelayMax: 60000,
				autoClose: false, // immediately close connection to signaling proxy on disconnect
			},
			userMediaConstraints: { 
				video: false, 
				audio: {
					sampleRate: 8000,
					// sampleSize: 16,
					channelCount: 1,
					volume: 1.0,
					autoGainControl: false,
					echoCancellation: false,
					noiseSuppression: false,
					deviceId: null,
				}
			}
		}
	}

	#signaling
	#localStream
	#pc
	#control
	#ready
	#started
	#server

	constructor(options = WebRTC.defaultOptions) {
		this.#ready = false
		this.#started = false
		this.#server = false
		this.info = {}
		this.options = options || {}
	}

	disconnect() {
		this.sendMessage('bye')
		this.#started = false
		this.#ready = false
		if (this.#control) {
			this.#control.close()
			this.#control.onopen = null
			// this._cmdChannel.onclose = null
			this.#control.onerror = null
			this.#control.onmessage = null
			this.#control = null
		}
	
		if (this.#pc) {
			this.#pc.close()
			this.#pc.onicecandidate = null
			this.#pc.ontrack = null
			// this.#pc.onremovetrack = null
			this.#pc = null
		}
		if (this.options.signaling.autoClose) {
			this.#signaling && this.#signaling.disconnect()
			this.#signaling = null
		}
		this.ondisconnect && this.ondisconnect()
	}
	
	get connected() {
		return this.#started && this.#pc && this.#control
	}
	
	sendMessage(message) {
		if (this.#signaling && this.#signaling.connected) {
			// console.debug('sendMessage:', message)
			this.sendSignal('message', message)
		}
	}

	sendSignal(signal, data) {
		if (this.#signaling && this.#signaling.connected) {
			console.debug('WebRTC: sendSignal:', signal, data)
			this.#signaling.emit(signal, data)
		}
	}

	sendCommand(cmd) {
		if (!this.#control) return
		if (this.#control.readyState === 'closed' || this.#control.readyState === 'closing')
			this.disconnect()
		if (this.#control.readyState === 'connecting')
			console.warn(`WebRTC: control channel may be not ready (cmd: ${cmd})`)
		
		try {
			this.#control.send(cmd)
		} catch (err) {
			console.error(`WebRTC: ERROR sendCommand(${cmd}):`, err)
			if (!this.#server) window.alert('Transceiver control disconnected!')
			this.disconnect()
		}
	}

	connectTransceiver(credentials) {
		const kredence = credentials || {}
		if (!kredence.qth || !kredence.rig || !kredence.token) return;

		this.#initSignaling({url: kredence.qth})
		this.#signaling.on('state', state => this.stateResolved && this.stateResolved(state))
		this.#signaling.on('full', rig => {
			console.error(`WebRTC: Rig ${rig} is busy`)
			window.alert('Transceiver is busy.')
			this.disconnect()
		})
		this.#signaling.on('empty', rig => {
			console.error(`WebRTC: Rig ${rig} empty`)
			window.alert('Transceiver is not connected.')
			this.disconnect()
		})

		this.#signaling.on('joined', (data) => { 
			consoleinfo(`WebRTC: Operating ${data.rig} as ${data.op}`)
			this.#ready = true
			this.iceServers = data.iceServers
			// this._mic = await new Microphone(this.tcvr).request()
			this.sendMessage('ready')
			// TODO try switch Call/Answer - doCall() here (need maybeStart on server)
		})

		this.#signaling.on('connect', () => {
			console.debug('WebRTC: Joining', kredence.rig)
			this.sendSignal('join', kredence)
		})
	}

	async serveTransceiver(credentials, tcvrInfo) {
		const kredence = credentials || {}
		if (!kredence.qth || !kredence.rig /* || !kredence.token */) return;
	
		this.#server = true
		await this.#initMicInput()
		this.#initSignaling({url: kredence.qth})
		
		this.#signaling.on('connect', () => {
			consoleinfo('WebRTC: Open rig', kredence.rig)  
			this.sendSignal('open', kredence.rig)
		})
		this.#signaling.on('opened', data => {
			consoleinfo('WebRTC: Opened rig', data.rig)
			this.iceServers = data.iceServers
			// this.#localStream.getAudioTracks().forEach(track => console.log(track.getSettings()))		
			// this._localAudio.srcObject = stream;
			this.sendSignal('ready')
		})
		this.#signaling.on('join', op => {
			// whoNow = op
			// authTime = secondsNow()
			consoleinfo(`WebRTC: Operator ${op} made a request to operate rig`)
			this.sendMessage({type: 'tcvrinfo', ...tcvrInfo()})
			this.#ready = true
		})
		this.#signaling.on('pi', data => this.sendSignal('po', data))
	}

	#initSignaling({url}) {
		consoleinfo('WebRTC: connectSignaling:', url)
		this.#signaling = io.connect(`wss://${url}`, this.options.signaling)

		this.#signaling.on('reconnect', () => console.debug('WebRTC: socket.io reconnected'))
		this.#signaling.on('disconnect', () => console.debug('WebRTC: socket.io disconnected'))
		this.#signaling.on('error', error => console.error('WebRTC: socket.io error:', error))
		this.#signaling.on('connect_error', error => {
			console.error('WebRTC: socket.io connect_error:', error)
			this.disconnect()
			if (!this.#server) window.alert('Transceiver control disconnected!')
		})
		this.#signaling.on('log', array => console.debug('WebRTC: LOG: ', ...array))

		this.#signaling.on('message', (message) => this.#handleMessage(message))
	}

	#handleMessage(message) {
		consoleinfo('WebRTC: signal message:', message)
		if (message === 'ready' && this.#server) {
			this.#maybeStart()
			this.#doCall()
		} else if (message.type === 'offer' && this.#ready) {
			!this.#started && this.#maybeStart()
			this.#doAnswer(message)
		} else if (message.type === 'answer' && this.#started && this.#server) {
			this.#pc.setRemoteDescription(new RTCSessionDescription(message))
		} else if (message.type === 'candidate' && this.#started) {
			const candidate = new RTCIceCandidate({
				sdpMLineIndex: message.label,
				candidate: message.candidate
			})
			this.#pc.addIceCandidate(candidate)
		} else if (message.type === 'tcvrinfo') {
			this.info = message
		} else if (message === 'bye' && this.#started) {
			consoleinfo('WebRTC: Session terminated.')
			this.disconnect()
		// } else if (message === 'restart') {
		// 	consoleinfo('Session restart')
		// 	// Do RTCPeerConnection & RTCDataChannel reconnect without tcvr powerOff
		// 	connectionReset = true
		}
	}

	async #initMicInput() {
		console.debug('WebRTC: Getting user media with constraints', this.options.userMediaConstraints)
		this.#localStream = await navigator.mediaDevices.getUserMedia(this.options.userMediaConstraints)
		console.debug('WebRTC: Adding local stream', this.#localStream)
	}

	#maybeStart() {
		console.debug(`WebRTC: maybeStart(): isStarted=${this.#started}, isReady=${this.#ready}`)
		if (!this.#started /* && this._mic && this._mic.stream && this._mic.track */ && this.#ready) {
			console.debug('WebRTC: creating peer connection')
			this.#createPeerConnection()

			if (this.#localStream) {
				this.#localStream.getTracks()
					.forEach(track => this.#pc.addTrack(track, this.#localStream))
			}
			this.#started = true
		}
	}

	#doAnswer(message) {
		console.debug('WebRTC: Sending answer to peer.')
		if (!this.#started) {
			console.error('WebRTC: PeerConnection not ready yet!')
			return
		}
		this.#pc.setRemoteDescription(new RTCSessionDescription(message))
		this.#pc.createAnswer().then(
			desc => this.#setLocalAndSendMessage(desc),
			error => console.error('WebRTC: doAnswer(): Failed to create session description:', error)
		)
	}

	#doCall() {
		console.debug('WebRTC: Sending offer to peer');
		if (!this.#started) {
			console.error('WebRTC: PeerConnection not ready yet!')
			return
		}
		this.#pc.createOffer().then(
			desc => this.#setLocalAndSendMessage(desc),
			error => console.error('WebRTC: createOffer() error:', error))
	}
	
	#setLocalAndSendMessage(sessionDescription) {
		this.#pc.setLocalDescription(sessionDescription)
		console.debug('WebRTC: setLocalAndSendMessage sending message', sessionDescription)
		this.sendMessage(sessionDescription)
	}

	#createPeerConnection() {
		try {
			console.debug('WebRTC: Create RTCPeerConnnection, iceServers:', this.iceServers)
			this.#pc = new RTCPeerConnection({'iceServers': this.iceServers})
			this.#pc.onicecandidate = event => this.#handleIceCandidate(event)
			this.#pc.ontrack = event => this.onTrack(event)
			this.#pc.onremovetrack = event => this.onRemoveTrack(event)
			if (this.#server) {
				this.#initControl(this.#pc.createDataChannel('control', { ordered: true }))
			} else {
				this.#pc.ondatachannel = event => this.#initControl(event.channel)
			}
		} catch (e) {
			console.error('WebRTC: Failed to create PeerConnection, exception:', e)
			if (!this.#server) window.alert('Cannot communicate with transceiver.')
			this.disconnect()
		}
	}

	#initControl(channel) {
		this.#control = channel
		this.#control.onopen = evt => this.onControlOpen(evt);
		this.#control.onclose = evt => this.onControlClose(evt);
		this.#control.onerror = evt => this.onControlError(evt);
		this.#control.onmessage = evt => this.onControlMessage(evt);
	}

	#handleIceCandidate(event) {
		console.debug('WebRTC: icecandidate event: ', event)
		if (event.candidate) {
			this.sendMessage({
				type: 'candidate',
				label: event.candidate.sdpMLineIndex,
				id: event.candidate.sdpMid,
				candidate: event.candidate.candidate
			})
		} else {
			console.debug('WebRTC: End of candidates.')
		}
	}

	onTrack(event) {
	}

	onRemoveTrack(event) {
	}

	onControlOpen(event) {
	}

	onControlClose() {
		consoleinfo('WebRTC: Control channel closed')
	}

	onControlMessage(event) {
		consoleinfo('WebRTC: command received:', event.data)
	}

	onControlError(event) {
		console.error('WebRTC: command error:', event)
	}

}

export { WebRTC }
