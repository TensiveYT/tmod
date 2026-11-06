export class NodeWorker extends Worker {
	_events: Record<string, ((...data: any[]) => void)[]>
	_maxListeners: number

	constructor(url, { workerData, ...options } = { workerData: {} }) {
		super(url, options)

		this._events = {}
		this._maxListeners = 10

		this.postMessage({
			type: '__worker_init',
			workerData
		})

		this.addEventListener('message', message => {
			switch (message.data.type) {
				case '__worker_online':
					this.emit('online')
					break
				case '__worker_exit':
					this.emit('exit', message.data.code)
					break
				case '__worker_error':
					this.emit('error', message.data.error)
					break
				default:
					this.emit('message', message.data)
					break
			}
		})
	}

	on(en: string, fn: (...data: any[]) => void) {
		if (!(en in this._events)) this._events[en] = []

		this._events[en].push(fn)

		if (this._events[en].length > this._maxListeners) console.warn('Maximum event listener count exceeded.')

		return this
	}

	off(en: string, fn: (...data: any[]) => void) {
		if (!(en in this._events)) return

		let idx = this._events[en].indexOf(fn)
		if (idx < 0) return

		this._events[en].splice(idx, 1)

		if (!this._events[en].length) delete this._events[en]

		return this
	}

	emit(en: string, ...data: any[]) {
		if (!(en in this._events)) return

		let fns = this._events[en].slice(0)
		if (fns.length < 1) return

		for (let i = 0; i < fns.length; i++) fns[i].apply(this, data) // <-- error
	}

	setMaxListeners(maxListeners: number) {
		this._maxListeners = maxListeners
	}

	getMaxListeners() {
		return this._maxListeners
	}

	removeAllListeners() {
		this._events = {}
	}
}
