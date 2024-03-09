import {Bands, Modes, AgcTypes, TransceiverProperties} from '../../../tcvr.js'

const bands = [160, 80, 40, 30, 20, 17, 15, 12, 10, 6]
const filters = {}
filters[Modes.CWR] = [2000, 1500, 600, 300, 100, 50]
filters[Modes.CW]  = filters[Modes.CWR]
filters[Modes.USB] = [2700, 2300, 1800, 1200, 600]
filters[Modes.LSB] = filters[Modes.USB]
const gains = {}
bands.forEach(b => {gains[b] = [-10, 20]})

export default {
	model: 'ts590',
	powerViaCat: false, 
	baudrate: 38400,
	props: new TransceiverProperties({
		bands,
		modes: [Modes.CW, Modes.CWR, Modes.LSB, Modes.USB],
		agcTypes: [AgcTypes.FAST, AgcTypes.MEDIUM, AgcTypes.SLOW, AgcTypes.AUTO, AgcTypes.OFF],
		bandGains: gains,
		modeFilters: filters
	}),
	defaults: {band: 20, mode: Modes.CW, agc: AgcTypes.FAST}
}
