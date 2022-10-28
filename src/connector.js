import { adapterFor } from './connectors/adapter.js'

function requireTcvr(params) {
	// options.tcvr = { manufacturer, model, options }
	if (!params || !params.tcvr)
		throw new Error("Transceiver not specified");
	if (!params.tcvr.manufacturer)
		throw new Error('Transceiver manufacturer not specified');
	if (!params.tcvr.model)
		throw new Error('Transceiver model not specified');
}

export const get = async (connector, params) => {
	if (!connector) return null
	if (connector === 'remotig') {
		if (!params || !params.kredence)
			throw new Error('Remote connection credentials required')
		const conn = await import('./connectors/remotig-remote.js')
		return new conn.RemotigConnector(params.kredence, params)
	}
	if (connector === 'remotig-ws') {
		requireTcvr(params)
		const adapter = await adapterFor(params.tcvr)
		const conn = await import('./connectors/remotig-ws.js')
		return new conn.RemotigConnector(adapter, params)
	}
	if (connector === 'usbpowron' || connector === 'remotig-usb') {
		requireTcvr(params)
		const adapter = await adapterFor(params.tcvr)
		const conn = await import('./connectors/remotig-usb.js')
		return new conn.RemotigConnector(adapter, params)
	}
	if (connector === 'serpowron' || connector === 'remotig-serial') {
		requireTcvr(params)
		const adapter = await adapterFor(params.tcvr)
		const conn = await import('./connectors/remotig-serial.js')
		return new conn.RemotigConnector(adapter, params)
	}
	if (connector == 'bluepowron' || connector === 'remotig-blue') {
		requireTcvr(params)
		const adapter = await adapterFor(params.tcvr)
		const conn = await import('./connectors/remotig-blue.js')
		return new conn.RemotigConnector(adapter, params)
	}
	if (connector === 'sercat') {
		requireTcvr(params)
		const adapter = await adapterFor(params.tcvr)
		const conn = await import('./connectors/sercat.js')
		return new conn.SercatConnector(adapter, params)
	}
	if (connector === 'bluecat') {
		requireTcvr(params)
		const adapter = await adapterFor(params.tcvr)
		const conn = await import('./connectors/bluecat.js')
		return new conn.BlueCatConnector(adapter, params)
	}
	if (connector === 'usbcat') {
		requireTcvr(params)
		const adapter = await adapterFor(params.tcvr)
		const conn = await import('./connectors/usbcat.js')
		return new conn.UsbcatConnector(adapter, params)
	}
	if (connector === 'nocat') {
//		requireTcvr(params)
		params.tcvr = params.tcvr || {}
		params.tcvr.manufacturer = params.tcvr.manufacturer || 'none'
		params.tcvr.model = params.tcvr.model || 'none'
		const adapter = await adapterFor(params.tcvr)
		const conn = await import('./connectors/nocat.js')
		return new conn.NocatConnector(adapter, params)
	}

	throw new Error(`Unknown connector=${connector}`)
}

