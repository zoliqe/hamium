import {Bands, Modes, AgcTypes, TransceiverProperties} from '../../../tcvr.js'

const bands = [160, 80, 40, 30, 20, 17, 15, 12, 10]
const filters = {}
filters[Modes.CWR] = [2400, 500]
filters[Modes.CW]  = filters[Modes.CWR]
filters[Modes.USB] = filters[Modes.CWR]
filters[Modes.LSB] = filters[Modes.USB]
const gains = {}
bands.forEach(b => {gains[b] = [0, 10]})

export default {
	model: 'ts450',
	powerViaCat: false, 
	baudrate: 4800,
	props: new TransceiverProperties({
		bands,
		modes: [Modes.CW, Modes.CWR, Modes.LSB, Modes.USB],
		agcTypes: [AgcTypes.AUTO],
		bandGains: gains,
		modeFilters: filters
	}),
	defaults: {band: 20, mode: Modes.CW, agc: AgcTypes.AUTO}
}
