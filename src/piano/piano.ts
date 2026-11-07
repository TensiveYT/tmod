import { CanvasRenderer } from './renderer'
import { AudioEngineWeb } from './audio'
import { settings } from '../modules/settings/settings'
import { state } from '../util/state'

/* import: packages */
import Denque from '../libs/packages/denque'

/* import: hypermod settings */
import { DISABLE_MIDI_OUTPUT, DISABLE_NAME_BOUNCING, USE_AUDIO_ENGINE, USE_DENQUE_BLIP_ARRAY } from '../modules/settings/tmod/tmod-optimization'
import { USE_128_KEYS } from '../modules/settings/tmod/tmod-piano'

export class PianoKey {
	note: string
	baseNote: string
	octave: number
	sharp: boolean
	loaded: boolean = false
	timeLoaded: number = 0
	domElement: HTMLElement | null = null
	timePlayed: number = 0
	lastColor : string
	blips: Denque<{ time: number; color: string }> | Array<{ time: number; color: string }> = USE_DENQUE_BLIP_ARRAY ? new Denque() : []
	spatial: number = 0
	rect: { contains: (x: number, y: number) => boolean } | null = null

	constructor(note: string, octave: number) {
		this.note = note + octave
		this.baseNote = note
		this.octave = octave
		this.sharp = note.indexOf('s') !== -1
	}
}

export class Piano {
	rootElement: HTMLElement
	keys: Record<string, PianoKey> = {}
	renderer: CanvasRenderer
	audio: AudioEngineWeb

	constructor(rootElement: HTMLElement) {
		this.rootElement = rootElement

		let white_spatial = 0
		let black_spatial = 0
		let black_it = 0
		const black_lut = USE_128_KEYS ? [1, 2, 1, 1, 2] : [2, 1, 2, 1, 1]

		const addKey = (note: string, octave: number) => {
			const key = new PianoKey(note, octave)
			this.keys[key.note] = key
			if (key.sharp) {
				key.spatial = black_spatial
				black_spatial += black_lut[black_it % 5]
				++black_it
			} else {
				key.spatial = white_spatial
				++white_spatial
			}
		}
		if (settings.testMode) {
			addKey('c', 2)
		} else {
			if (!USE_128_KEYS) {
				addKey('a', -1)
				addKey('as', -1)
				addKey('b', -1)
				let notes = 'c cs d ds e f fs g gs a as b'.split(' ')
				for (let oct = 0; oct < 7; oct++) {
					for (let n of notes) addKey(n, oct)
				}
				addKey('c', 7)
			} else {
				let notes = 'c cs d ds e f fs g gs a as b'.split(' ')
				for (let oct = -2; oct < 8; oct++) {
					for (let n of notes) addKey(n, oct)
				}
				addKey('c', 8)
				addKey('cs', 8)
				addKey('d', 8)
				addKey('ds', 8)
				addKey('e', 8)
				addKey('f', 8)
				addKey('fs', 8)
				addKey('g', 8)
			}
		}

		this.renderer = new CanvasRenderer().init(this)
		window.addEventListener('resize', () => {
			this.renderer.resize()
		})

		window.AudioContext = window.AudioContext || (window as any).webkitAudioContext || undefined

		this.audio = new AudioEngineWeb().init()
	}

	play(note: string, vol: number, participant: { id: string; color: string; nameDiv?: HTMLElement }, delay_ms: number, lyric?: string): void {

		if (!Object.hasOwn(this.keys, note) || !participant) return

		let delay = delay_ms || 0
		let key = this.keys[note]

		if (key.loaded && USE_AUDIO_ENGINE) this.audio.play(key.note, vol, delay, participant.id)

		if (state.midiOutTest && !DISABLE_MIDI_OUTPUT) state.midiOutTest(key.note, vol * 100, delay, participant.id)

		if (delay === 0) {
			this.renderer.visualize(key, participant.color)
			if (!DISABLE_NAME_BOUNCING && participant.nameDiv && state.client.ppl[participant.id]) {
				let nameDiv = participant.nameDiv

				nameDiv.classList.add('play')
				setTimeout(() => {
					nameDiv.classList.remove('play')
				}, 30)
			}
		} else {
			setTimeout(() => {
				this.renderer.visualize(key, participant.color)
				if (!DISABLE_NAME_BOUNCING && participant.nameDiv && state.client.ppl[participant.id]) {
					let nameDiv = participant.nameDiv

					nameDiv.classList.add('play')
					setTimeout(() => {
						nameDiv?.classList.remove('play')
					}, 30)
				}
			}, delay)
		}
	}

	stop(note: string, participant: { id: string; color: string; nameDiv?: HTMLElement }, delay_ms: number): void {
		if (!Object.hasOwn(this.keys, note) || !participant) return

		let key = this.keys[note]

		if (key.loaded && USE_AUDIO_ENGINE) this.audio.stop(key.note, delay_ms, participant.id)

		if (state.midiOutTest && !DISABLE_MIDI_OUTPUT) state.midiOutTest(key.note, 0, delay_ms, participant.id)
	}
}
