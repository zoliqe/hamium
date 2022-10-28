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

	constructor(options = WebRTC.defaultOptions) {
		this._isReady = false
		this._isStarted = false
		this._server = false
		this._info = {}
		this.options = options || {}
	}

	disconnect() {
		this.sendMessage('bye')
		this._isStarted = false
		this._isReady = false
		if (this._control) {
			this._control.close()
			this._control.onopen = null
			// this._cmdChannel.onclose = null
			this._control.onerror = null
			this._control.onmessage = null
			this._control = null
		}
	
		if (this._pc) {
			this._pc.close()
			this._pc.onicecandidate = null
			this._pc.ontrack = null
			// this._pc.onremovetrack = null
			this._pc = null
		}
		if (this.options.signaling.autoClose) {
			this._signaling && this._signaling.disconnect()
			this._signaling = null
		}
		this.ondisconnect && this.ondisconnect()
	}
	
	get connected() {
		return this._isStarted && this._pc && this._control
	}
	
	get info() {
		return this._info
	}

	sendMessage(message) {
		if (this._signaling && this._signaling.connected) {
			// console.debug('sendMessage:', message)
			this.sendSignal('message', message)
		}
	}

	sendSignal(signal, data) {
		if (this._signaling && this._signaling.connected) {
			console.debug('WebRTC: sendSignal:', signal, data)
			this._signaling.emit(signal, data)
		}
	}

	sendCommand(cmd) {
		if (!this._control) return
		if (this._control.readyState === 'closed' || this._control.readyState === 'closing')
			this.disconnect()
		if (this._control.readyState === 'connecting')
			console.warn(`WebRTC: control channel may be not ready (cmd: ${cmd})`)
		
		try {
			this._control.send(cmd)
		} catch (err) {
			console.error(`WebRTC: ERROR sendCommand(${cmd}):`, err)
			if (!this._server) window.alert('Transceiver control disconnected!')
			this.disconnect()
		}
	}

	connectTransceiver(credentials) {
		const kredence = credentials || {}
		if (!kredence.qth || !kredence.rig || !kredence.token) return;

		this._initSignaling({url: kredence.qth})
		this._signaling.on('state', state => this.stateResolved && this.stateResolved(state))
		this._signaling.on('full', rig => {
			console.error(`WebRTC: Rig ${rig} is busy`)
			window.alert('Transceiver is busy.')
			this.disconnect()
		})
		this._signaling.on('empty', rig => {
			console.error(`WebRTC: Rig ${rig} empty`)
			window.alert('Transceiver is not connected.')
			this.disconnect()
		})

		this._signaling.on('joined', (data) => { 
			console.info(`WebRTC: Operating ${data.rig} as ${data.op}`)
			this._isReady = true
			this.iceServers = data.iceServers
			// this._mic = await new Microphone(this.tcvr).request()
			this.sendMessage('ready')
			// TODO try switch Call/Answer - doCall() here (need maybeStart on server)
		})

		this._signaling.on('connect', () => {
			console.debug('WebRTC: Joining', kredence.rig)
			this.sendSignal('join', kredence)
			})
	}

	serveTransceiver(credentials, tcvrInfo) {
		const kredence = credentials || {}
		if (!kredence.qth || !kredence.rig /* || !kredence.token */) return;
	
		this._server = true
		this._initSignaling({url: kredence.qth})
		this._signaling.on('connect', () => {
			console.info('WebRTC: Open rig', kredence.rig)  
			this.sendSignal('open', kredence.rig)
		})
		this._signaling.on('opened', data => {
			console.info('WebRTC: Opened rig', data.rig)
			this.iceServers = data.iceServers
			this._getLocalAudio()
		})
		this._signaling.on('join', op => {
			// whoNow = op
			// authTime = secondsNow()
			console.info(`WebRTC: Operator ${op} made a request to operate rig`)
			this.sendMessage({type: 'tcvrinfo', ...tcvrInfo()})
			this._isReady = true
		})
		this._signaling.on('pi', data => this.sendSignal('po', data))
	}

	_initSignaling({url}) {
		console.info('WebRTC: connectSignaling:', url)
		this._signaling = io.connect(`wss://${url}`, this.options.signaling)

		this._signaling.on('reconnect', () => console.debug('WebRTC: socket.io reconnected'))
		this._signaling.on('disconnect', () => console.debug('WebRTC: socket.io disconnected'))
		this._signaling.on('error', error => console.error('WebRTC: socket.io error:', error))
		this._signaling.on('connect_error', error => {
			console.error('WebRTC: socket.io connect_error:', error)
			this.disconnect()
			if (!this._server) window.alert('Transceiver control disconnected!')
		})
		this._signaling.on('log', array => console.debug('WebRTC: LOG: ', ...array))

		this._signaling.on('message', (message) => this._handleMessage(message))
	}

	_handleMessage(message) {
		console.info('WebRTC: signal message:', message)
		if (message === 'ready' && this._server) {
			this._maybeStart()
			this._doCall()
		} else if (message.type === 'offer' && this._isReady) {
			!this._isStarted && this._maybeStart()
			this._doAnswer(message)
		} else if (message.type === 'answer' && this._isStarted && this._server) {
			this._pc.setRemoteDescription(new RTCSessionDescription(message))
		} else if (message.type === 'candidate' && this._isStarted) {
			const candidate = new RTCIceCandidate({
				sdpMLineIndex: message.label,
				candidate: message.candidate
			})
			this._pc.addIceCandidate(candidate)
		} else if (message.type === 'tcvrinfo') {
			this._info = message
		} else if (message === 'bye' && this._isStarted) {
			console.info('WebRTC: Session terminated.')
			this.disconnect()
		// } else if (message === 'restart') {
		// 	console.info('Session restart')
		// 	// Do RTCPeerConnection & RTCDataChannel reconnect without tcvr powerOff
		// 	connectionReset = true
		}
	}

	async _getLocalAudio() {
		console.debug('WebRTC: Getting user media with constraints', this.options.userMediaConstraints)
		this._localStream = await navigator.mediaDevices.getUserMedia(this.options.userMediaConstraints)
		console.debug('WebRTC: Adding local stream', this._localStream)
		// this._localStream.getAudioTracks().forEach(track => console.log(track.getSettings()))		
		// this._localAudio.srcObject = stream;
		this.sendSignal('ready')
	}

	_maybeStart() {
		console.debug(`WebRTC: maybeStart(): isStarted=${this._isStarted}, isReady=${this._isReady}`)
		if (!this._isStarted /* && this._mic && this._mic.stream && this._mic.track */ && this._isReady) {
			console.debug('WebRTC: creating peer connection')
			this._createPeerConnection()

			if (this._localStream) {
				this._localStream.getTracks()
					.forEach(track => this._pc.addTrack(track, this._localStream))
			}
			this._isStarted = true
		}
	}

	_doAnswer(message) {
		console.debug('WebRTC: Sending answer to peer.')
		if (!this._isStarted) {
			console.error('WebRTC: PeerConnection not ready yet!')
			return
		}
		this._pc.setRemoteDescription(new RTCSessionDescription(message))
		this._pc.createAnswer().then(
			desc => this._setLocalAndSendMessage(desc),
			error => console.error('WebRTC: doAnswer(): Failed to create session description:', error)
		)
	}

	_doCall() {
		console.debug('WebRTC: Sending offer to peer');
		if (!this._isStarted) {
			console.error('WebRTC: PeerConnection not ready yet!')
			return
		}
		this._pc.createOffer().then(
			desc => this._setLocalAndSendMessage(desc),
			error => console.error('WebRTC: createOffer() error:', error))
	}
	
	_setLocalAndSendMessage(sessionDescription) {
		this._pc.setLocalDescription(sessionDescription)
		console.debug('WebRTC: setLocalAndSendMessage sending message', sessionDescription)
		this.sendMessage(sessionDescription)
	}

	_createPeerConnection() {
		try {
			console.debug('WebRTC: Create RTCPeerConnnection, iceServers:', this.iceServers)
			this._pc = new RTCPeerConnection({'iceServers': this.iceServers})
			this._pc.onicecandidate = event => this._handleIceCandidate(event)
			this._pc.ontrack = event => this.onTrack(event)
			this._pc.onremovetrack = event => this.onRemoveTrack(event)
			if (this._server) {
				this._initControl(this._pc.createDataChannel('control', { ordered: true }))
			} else {
				this._pc.ondatachannel = event => this._initControl(event.channel)
			}
		} catch (e) {
			console.error('WebRTC: Failed to create PeerConnection, exception:', e)
			if (!this._server) window.alert('Cannot communicate with transceiver.')
			this.disconnect()
		}
	}

	_initControl(channel) {
		this._control = channel
		this._control.onopen = evt => this.onControlOpen(evt);
		this._control.onclose = evt => this.onControlClose(evt);
		this._control.onerror = evt => this.onControlError(evt);
		this._control.onmessage = evt => this.onControlMessage(evt);
	}

	_handleIceCandidate(event) {
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
		console.info('WebRTC: Control channel closed')
	}

	onControlMessage(event) {
		console.info('WebRTC: command received:', event.data)
	}

	onControlError(event) {
		console.error('WebRTC: command error:', event)
	}

}

export { WebRTC }
