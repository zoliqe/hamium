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
modeValues[Modes.CW]  = 0x02
modeValues[Modes.CWR] = 0x03
modeValues[Modes.AM]  = 0x04
modeValues[Modes.NFM] = 0x08
modeValues[Modes.RTTY] = 0x0A

export default {
	model: 'ft817',
	baudrate: 4800,
	freqdata: (mhz100_10, khz1000_100, khz10_1, hz100_10) => [mhz100_10, khz1000_100, khz10_1, hz100_10, 0x01],
	modedata: mode => modeValues[mode] && [modeValues[mode], 0, 0, 0, 0x07],
	filterdata: () => [],
	props: new TransceiverProperties({
		bands: [160, 80, 40, 30, 20, 17, 15, 12, 10],
		modes: [Modes.CW, Modes.CWR, Modes.LSB, Modes.USB],
	}),
	defaults: {band: 20, mode: Modes.CW, agc: AgcTypes.AUTO}
}
