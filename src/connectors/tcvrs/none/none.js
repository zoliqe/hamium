import { Modes, AgcTypes, TransceiverProperties } from '../../../tcvr.js'

const bands = [15]
const filters = {}
filters[Modes.CW]  = [400]
const gains = {}
bands.forEach(b => {gains[b] = []})

export default {
	model: 'none',
	props: new TransceiverProperties({
		bands,
		modes: [Modes.CW],
		agcTypes: [AgcTypes.AUTO],
		bandGains: gains,
		modeFilters: filters
	}),
	defaults: {band: 15, mode: Modes.CW, agc: AgcTypes.AUTO}
}
