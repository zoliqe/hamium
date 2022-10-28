import { Bands, Modes, AgcTypes, TransceiverProperties } from '../../../tcvr.js'

const bands = [80, 40, 30, 20, 17, 15] //[160, 80, 40, 30, 20, 17, 15, 12, 10]
const filters = {}
filters[Modes.CW]  = [1200, 500]
filters[Modes.CWR] = filters[Modes.CW]
filters[Modes.LSB] = [4000, 3000, 2200, 1000]
filters[Modes.USB] = filters[Modes.LSB]
const gains = {}
bands.forEach(b => {gains[b] = [-10]})

export default {
	model: 'bobik',
	baudrate: 230400,
	props: new TransceiverProperties({
		bands,
		modes: [Modes.CW, Modes.CWR, Modes.LSB, Modes.USB],
		agcTypes: [AgcTypes.AUTO, AgcTypes.OFF],
		bandGains: gains,
		modeFilters: filters
	}),
	defaults: {band: 80, mode: Modes.CW, agc: AgcTypes.AUTO}
}
