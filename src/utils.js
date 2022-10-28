
const secondsNow = () => Date.now() / 1000

function delay(ms) {
	if (ms == null) return null
	return new Promise(resolve => setTimeout(resolve, ms))
}


function nextValue(values, value) {
	const i = values.indexOf(value)
	return values[i < (values.length - 1) ? i + 1 : 0]
}

function nextValueBounds(values, value) {
	const i = values.indexOf(value)
	if (i < (values.length - 1)) return values[i + 1]
	return value
}

function prevValue(values, value) {
	const i = values.indexOf(value)
	return values[i > 0 ? i - 1 : values.length - 1]
}

function prevValueBounds(values, value) {
	const i = values.indexOf(value)
	if (i > 0) return values[i - 1]
	return value
}

export {secondsNow, delay, nextValue, prevValue, nextValueBounds, prevValueBounds}
