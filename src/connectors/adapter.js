
const manufacturers = ['elecraft', 'icom', 'kenwood', 'yaesu', 'om4aa', 'none']
let tcvrs = null

async function transceivers() {
	if (tcvrs) return tcvrs
	tcvrs = {}
	for (const manufacturer of manufacturers) 
		tcvrs[manufacturer] = (await import(`./tcvrs/${manufacturer}.js`)).Adapter.models
}

async function adapterFor({manufacturer, model, options}) {
	const module = await import(`./tcvrs/${manufacturer}.js`)
	const adapter = await module.Adapter.forTcvr(model, options)
	return adapter
}

export {transceivers, adapterFor}
