import { Bands, Modes, AgcTypes } from '../../tcvr.js'

/**
 * Finds first wider filter (declared by supported values)
 * for given value.
 */
function selectFilter(values, valueRaw) {
	const value = parseInt(valueRaw, 10)
	values = values
		// .map(bw => parseInt(bw, 10))
		.sort((a, b) => a - b)
	const widest = parseInt(values[values.length - 1], 10)
	if (!Number.isInteger(value) || !Number.isInteger(widest)) 
		return values[values.length - 1]

	const result = values
		.filter(bw => Number.isInteger(bw) && bw >= value)
		.reduce((nearestWider, bw) => bw < nearestWider ? bw : nearestWider, widest)
	console.debug('_findNearestWiderFilter:', {'for': valueRaw, 'found': result})
	if (result == null) return String(widest)
	return String(result)
}

function resolveAgc(agc, mode) {
	if (agc !== AgcTypes.AUTO) return agc
	return mode === Modes.CW || mode === Modes.CWR ?
		AgcTypes.FAST : AgcTypes.SLOW
}

async function tcvrOptions(manufacturer, model, options) {
	const defaults = await import(`./${manufacturer}/${model}.js`)
	return {...defaults.default, ...options}
}

export {selectFilter, resolveAgc, tcvrOptions}
