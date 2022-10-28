import {Bands, Modes, AgcTypes, TransceiverProperties} from '../../../tcvr.js'

const bands = [160, 80, 40, 30, 20, 17, 15, 12, 10]
const filters = {}
filters[Modes.CWR] = [2000, 1800, 1500, 600, 300, 200, 100]
filters[Modes.CW]  = filters[Modes.CWR]
filters[Modes.USB] = [2700, 2300, 2100, 1800, 1500, 1200, 1000, 800, 600]
filters[Modes.LSB] = filters[Modes.USB]
const gains = {}
bands.forEach(b => {gains[b] = [-10, 20]})

export default {
	model: 'ts2000',
	powerViaCat: false, 
	baudrate: 9600,
	props: new TransceiverProperties({
		bands,
		modes: [Modes.CW, Modes.CWR, Modes.LSB, Modes.USB],
		agcTypes: [AgcTypes.FAST, AgcTypes.MEDIUM, AgcTypes.SLOW, AgcTypes.AUTO, AgcTypes.OFF],
		bandGains: gains,
		modeFilters: filters
	}),
	defaults: {band: 20, mode: Modes.CW, agc: AgcTypes.FAST}
}
