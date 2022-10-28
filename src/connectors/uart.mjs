
class CatUartConnector {
	constructor(socket, options = {device, baudRate}) {
		this._socket = socket
		this._socket.emit('opencat', options)
	}

	serial(baudRate) {}

	serialData(data, callback) {
		this._socket.emit('cat', data)
		callback && callback()
	}
}

export {CatUartConnector}
