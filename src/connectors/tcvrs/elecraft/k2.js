import { Modes, AgcTypes, TransceiverProperties } from '../../../tcvr.js'

const bands = [160, 80, 40, 30, 20, 17, 15, 12, 10]
const filters = {}
filters[Modes.CW]  = [1500, 700, 400, 250]
filters[Modes.CWR] = filters[Modes.CW]
filters[Modes.LSB] = [2100, 2300, 700, 400]
filters[Modes.USB] = filters[Modes.LSB]
const gains = {}
bands.forEach(b => {gains[b] = [-10, 20]})

export default {
	model: 'k2',
	baudrate: 4800,
	props: new TransceiverProperties({
		bands,
		modes: [Modes.CW, Modes.CWR, Modes.LSB, Modes.USB],
		agcTypes: [AgcTypes.FAST, AgcTypes.SLOW, AgcTypes.AUTO],
		bandGains: gains,
		modeFilters: filters
	}),
	defaults: {band: 20, mode: Modes.CW, agc: AgcTypes.FAST}
}
