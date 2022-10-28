/* eslint-disable camelcase */
import {Bands, Modes, AgcTypes, TransceiverProperties} from '../../../tcvr.js'

const filters = {}
filters[Modes.CWR] = [6000, 2400, 2000, 500, 250]
filters[Modes.CW]  = filters[Modes.CWR]
filters[Modes.USB] = [6000, 2400, 2000, 500, 250]
filters[Modes.LSB] = filters[Modes.USB]

const modeValues = {}
modeValues[Modes.LSB] = 0x00
modeValues[Modes.USB] = 0x01
modeValues[Modes.CW]  = 0x03
modeValues[Modes.CWR] = 0x02
modeValues[Modes.AM]  = 0x04
modeValues[Modes.NFM] = 0x06
modeValues[Modes.WFM] = 0x07
modeValues[Modes.RTTY] = 0x08
modeValues[Modes.RTTYR] = 0x09
const filterValues = {
	6000: 4,
	2400: 0,
	2000: 1,
	500: 2,
	250: 3,
}

export default {
	model: 'ft1000',
	baudrate: 4800,
	freqdata: (mhz100_10, khz1000_100, khz10_1, hz100_10) => [hz100_10, khz10_1, khz1000_100, mhz100_10, 0x0A],
	modedata: mode => modeValues[mode] && [0, 0, 0, modeValues[mode], 0x0C],
	filterdata: filter => filterValues[filter] && [0, 0, 0, filterValues[filter], 0x8C],
	props: new TransceiverProperties({
		bands: [160, 80, 40, 30, 20, 17, 15, 12, 10],
		modes: [Modes.CW, Modes.CWR, Modes.LSB, Modes.USB],
		modeFilters: filters
	}),
	defaults: {band: 20, mode: Modes.CW, agc: AgcTypes.AUTO}
}
