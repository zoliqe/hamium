import {Bands, Modes, AgcTypes, TransceiverProperties} from '../../../tcvr.js'

const bands = [160, 80, 40, 30, 20, 17, 15, 12, 10, 6, 2, 70]
const gains = {}
bands.forEach(b => {gains[b] = [-10, 10]})

export default {
	model: 'ic706',
	address: 0x58, 
	baudrate: 9600,
	props: new TransceiverProperties({
		bands,
		modes: [Modes.CW, Modes.CWR, Modes.LSB, Modes.USB],
		agcTypes: [AgcTypes.FAST, AgcTypes.SLOW, AgcTypes.AUTO],
		bandGains: gains,
		modeFilters: {} // no filters (TODO update to support optional filter)
	}),
	defaults: {band: 20, mode: Modes.CW, agc: AgcTypes.FAST}
}
