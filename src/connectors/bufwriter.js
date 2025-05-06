import { delay } from '../utils.js'

class BufferedWriter {
    #buffer = []
    #state = false
    #writer

    constructor(writerMethod) {
        this.#writer = async data => { data != null && (await writerMethod(data)) }
    }

    async write(data) {
        let len = this.#buffer.push(data)
        if (this.#state) return

        this.#state = true
        while (len) {
            const data = this.#buffer.shift()
            try {
                await this.#writer(data)
                await delay(100)
            } catch (error) {
                if (error.toString().indexOf('GATT operation already in progress') > -1) {
                    console.debug(`BufferedWriter: delayed write of '${data}'`)
                    this.#buffer.unshift(data)
                    await delay(200)
                    continue
                }
                console.error(error)
            }
            len = this.#buffer.length
        }
        this.#state = false
    }
}

export {BufferedWriter}
