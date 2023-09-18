import { Bands, Modes, AgcTypes, TransceiverProperties } from '../../../tcvr.js'

const bands = [160, 80, 40, 30, 20, 17, 15, 12, 10, 6]
const filters = {}
filters[Modes.CW]  = [1800, 1500, 600, 300, 200, 100]
filters[Modes.CWR] = filters[Modes.CW]
filters[Modes.LSB] = [2700, 2300, 2100, 1800, 1500, 1200, 1000, 800, 600]
filters[Modes.USB] = filters[Modes.LSB]
const gains = {}
bands.forEach(b => {gains[b] = [-10, 20]}) // TODO kx3 supports more preamps (10/20/30) per band - can we handle this via CAT?

export default {
	model: 'kx3',
	baudrate: 38400,
	props: new TransceiverProperties({
		bands,
		modes: [Modes.CW, Modes.CWR, Modes.LSB, Modes.USB],
		agcTypes: [AgcTypes.FAST, AgcTypes.SLOW, AgcTypes.AUTO],
		bandGains: gains,
		modeFilters: filters
	}),
	defaults: {band: 20, mode: Modes.CW, agc: AgcTypes.FAST}
}
