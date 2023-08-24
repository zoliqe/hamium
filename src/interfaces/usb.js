const _encoder = new TextEncoder()
const _decoder = new TextDecoder()

export class USBInterface {

	// 	_interfaceNumber = 2  // original interface number of WebUSB Arduino demo
	// 	_endpointIn = 5       // original in endpoint ID of WebUSB Arduino demo
	// 	_endpointOut = 4      // original out endpoint ID of WebUSB Arduino demo
	_interfaceNumber = 0  // TinyUSB
	_endpointIn = 0       // TinyUSB
	_endpointOut = 0      // TinyUSB

	constructor(deviceFilters = [
		{ 'vendorId': 0x2341, 'productId': 0x8036 },
		{ 'vendorId': 0x2341, 'productId': 0x8037 },
		{ 'vendorId': 0x2886, 'productId': 0x802F }, // Seeed XIAO M0
		{ 'vendorId': 0xcafe, 'productId': 0x4011 }, // TinyUSB on RPi Pico
		{ 'vendorId': 0xcafe, 'productId': 0x4032 }, // TinyUSB on RPi Pico
		{ 'vendorId': 0xcafe, 'productId': 0x7388 }, // Remoddle
		{ 'vendorId': 0x2e8a, 'productId': 0x000a }, // TinyUSB on arduino-pico
	],
		receiveSeparator = '\n', sendSeparator = '\n') {
		this._deviceFilters = deviceFilters
		this._receiveSeparator = receiveSeparator
		this._sendSeparator = sendSeparator
		// this._sendSeparator = _encoder.encode(sendSeparator)
		this._receiveBuffer = ''
	}

	get name() {
		return 'USB'
	}

	async init(onready) {
		if (!navigator.usb) {
			window.alert('USB not supported by browser. Cannot connect to transceiver.')
			throw new Error('unsupported')
		}
		const paired = await navigator.usb.getDevices()
		if (paired.length === 1) {
			[this._device] = paired
			console.info('Found 1 paired device - could be opened instantly')
			onready && onready()
		}
	}

	async connect() {
		if (!navigator.usb) {
			throw new Error('unsupported')
		}

		// const paired = await navigator.usb.getDevices()
		// if (paired.length === 1) {
		// 	[this._device] = paired
		// } else {
		// 	this._device = await navigator.usb.requestDevice({ 'filters': this._deviceFilters })
		// }
		this.connected || (this._device = await navigator.usb.requestDevice({ 'filters': this._deviceFilters }))
		console.debug(`USB device: ${this._device.productName} (${this._device.manufacturerName})`)
		await this._open()
		console.info(`USB Connected ${this._device.productName}`)
		return this
	}

	_open() {
		return this._device.open()
			.then(() => {
				if (this._device.configuration === null) {
					return this._device.selectConfiguration(1)
				}
			})
			.then(() => {
				const configurationInterfaces = this._device.configuration.interfaces
				configurationInterfaces.forEach(element => {
					element.alternates.forEach(elementalt => {
						if (elementalt.interfaceClass === 0xff) {
							this._interfaceNumber = element.interfaceNumber
							elementalt.endpoints.forEach(elementendpoint => {
								if (elementendpoint.direction === "out") {
									this._endpointOut = elementendpoint.endpointNumber
								}
								if (elementendpoint.direction === "in") {
									this._endpointIn = elementendpoint.endpointNumber
								}
							})
						}
					})
				})
			})
			.then(() => this._device.claimInterface(this._interfaceNumber))
			.then(() => this._device.selectAlternateInterface(this._interfaceNumber, 0))
			.then(() => this._device.controlTransferOut({
				'requestType': 'class',
				'recipient': 'interface',
				'request': 0x22,
				'value': 0x01,
				'index': this._interfaceNumber
			}))
			.then(() => this._readLoop())
	}

	_readLoop() {
		if (this.connected) {
			this._device.transferIn(this._endpointIn, 64).then(result => {
				this._handleReceived(_decoder.decode(result.data))
				this._readLoop()
			}, error => this.receiveError(error))
		}
	}

	async disconnect() {
		if (!this._device) return
		const device = this._device
		this._device = null

		await device.controlTransferOut({
			'requestType': 'class',
			'recipient': 'interface',
			'request': 0x22,
			'value': 0x00,
			'index': this._interfaceNumber
		})
		console.debug('USB close()')
		await device.close()
	}

	_handleReceived(data) {
		if (!data.includes('$')) {
			for (const c of data) {
				this.receive(c)
			}
		}
		for (const c of data) {
			if (c === this._receiveSeparator) {
				const cmd = this._receiveBuffer.trim()
				this._receiveBuffer = ''
				if (cmd)
					this.receive(cmd)
			} else {
				this._receiveBuffer += c
			}
		}
	}

	get connected() {
		return this._device != null
	}

	receive(data) {
		// callback
	}

	receiveError(error) {
		console.error('USB receive error:', error)
	}

	getDeviceName() {
		return `${this._device.productName} (${this._device.manufacturerName})`
	}

	async send(data) {
		console.debug(`USB <= ${data}`)
		if (this.connected) {
			const bytes = typeof data === 'string' ? _encoder.encode(`${data}${this._sendSeparator}`) : data
			await this._device.transferOut(this._endpointOut, bytes)
			return true
		}
		console.error(`USB: data not sent ${data}`)
		return false
	}
}
