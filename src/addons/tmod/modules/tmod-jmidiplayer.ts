/* import: packages */
import Player from '../../../libs/packages/jmidiplayer/index'
import * as fflate from '../../../libs/packages/fflate/index'

/* import: types */
import { MIDILoaderStatus } from './tmod-types'

/* import: settings */
import { COLOR_PALETTE } from '../../../modules/settings/tmod/tmod-playback'
import { DEBUG_MODE } from '../../../modules/settings/tmod/tmod-miscellaneous'
import { ENABLE_CLIENT_SIDE_PLAYBACK } from '../../../modules/settings/tmod/tmod-optimization'
import { USE_128_KEYS } from '../../../modules/settings/tmod/tmod-piano'

/* import: constants */
import { MIDI_KEY_NAMES } from '../../../util/constants'

/* import: misc */
import { getClient, getNoteQuota, getPiano, state } from '../../../util/state'
import { openFileDialog } from '../../../util/util'
import * as logger from './tmod-logger'
import { USE_INFINITE_NOTEQUOTA } from '../../../modules/settings/tmod/tmod-notes'

/* checks */
export function getIsPlayerInitialized(): boolean {
	return state.addons.tmod.player !== null
}

/* variables */
export function getTPlayer(): Player {
	return state.addons.tmod.player
}

/* status */
export const STATUS_MESSAGES: Record<MIDILoaderStatus, string> = {
	idle: 'Now idle.',
	waiting_for_file: 'Waiting for MIDI file…',
	fetching: 'Fetching MIDI…',
	unzipping: 'Unzipping MIDI…',
	converting_ab: 'Converting MIDI’s ArrayBuffer into a TypedArray…',
	loading: 'Loading MIDI…'
}
export var loaderStatus: MIDILoaderStatus = 'idle'
export function setLoaderStatus(status: MIDILoaderStatus) {
	loaderStatus = status

	let message = STATUS_MESSAGES[loaderStatus]
	if (!message) throw new Error('Loader set to an invalid status.')

	logger.log('MIDILoader', message)
}

/* initialization */
export function initTPlayer(): Player {
	if (getIsPlayerInitialized()) return

	let hPlayer = new Player()
	let piano = getPiano()
	let client = getClient()
	let noteQuota = getNoteQuota()
	hPlayer.on('midiEvent', e => {
		switch (e.type) {
			case 0x08: {
				// note off
				if (!USE_128_KEYS && (e.note < 21 || e.note > 108)) 
					return

				if (!USE_INFINITE_NOTEQUOTA)
						if (!noteQuota.spend(1))
							return
				
				let key = !USE_128_KEYS ? MIDI_KEY_NAMES[e.note - 21] : MIDI_KEY_NAMES[e.note]
				piano.stop(key, { id: client.participantId }, 0)
				if (!ENABLE_CLIENT_SIDE_PLAYBACK) 
					client.stopNote(key)
				break
			}
			case 0x09: {
				// note on
				if (!USE_128_KEYS && (e.note < 21 || e.note > 108)) 
					return
				
				if (e.velocity === 0) {
					if (!USE_INFINITE_NOTEQUOTA)
						if (!noteQuota.spend(1))
							return
					
					let key = !USE_128_KEYS ? MIDI_KEY_NAMES[e.note - 21] : MIDI_KEY_NAMES[e.note]
					piano.stop(key, { id: client.participantId }, 0)

					if (!ENABLE_CLIENT_SIDE_PLAYBACK) 
						client.stopNote(key)
				} else {
					if (!USE_INFINITE_NOTEQUOTA)
						if (!noteQuota.spend(1))
							return

					let key = !USE_128_KEYS ? MIDI_KEY_NAMES[e.note - 21] : MIDI_KEY_NAMES[e.note]
					piano.play(key, e.velocity / 127, { id: client.participantId, color: COLOR_PALETTE[e.channel] }, 0)

					if (!ENABLE_CLIENT_SIDE_PLAYBACK) 
						client.startNote(key, e.velocity / 127)
				}
				break
			}
		}
	})

	state.addons.tmod.player = hPlayer
	return hPlayer
}

/* playback */
export function play(): void {
	if (!getIsPlayerInitialized()) return

	let hPlayer = getTPlayer()

	logger.log('MIDIPlayer', 'Now playing a MIDI.')
	hPlayer.play()
}

export function pause(): void {
	if (!getIsPlayerInitialized()) return

	let hPlayer = getTPlayer()

	logger.log('MIDIPlayer', 'Paused a MIDI.')
	hPlayer.pause()
}

export function stop(): void {
	if (!getIsPlayerInitialized()) return

	let hPlayer = getTPlayer()

	logger.log('MIDIPlayer', 'Stopped a MIDI.')
	hPlayer.stop()
}

export function seekTo(tick: number): void {
	if (!getIsPlayerInitialized()) return

	let hPlayer = getTPlayer()

	logger.log('MIDIPlayer', `Seeked to tick ${tick} in a MIDI.`)
	hPlayer.seek(tick)
}

/* loading */
export async function loadFromURL(uri: string): Promise<[number, number]> {
	if (!getIsPlayerInitialized()) return

	setLoaderStatus('fetching')
	let url = new URL(uri)
	let pro = fetch(url)

	let res = await pro
	let gdt = await res.bytes()
	let dat = null

	let cty = res.headers.get('Content-Type')

	if (cty === 'application/zip') {
		setLoaderStatus('unzipping')
		let files = await new Promise((resolve, reject) => {
			fflate.unzip(gdt, (err, files) => {
				if (err) reject(err)
				else resolve(files)
			})
		})

		let filenames = Object.keys(files)
		if (filenames.length > 1) throw 'Tried to import multiple files at once.'

		dat = files[filenames[0]]
	} else dat = gdt

	setLoaderStatus('converting_ab')
	let sab = new SharedArrayBuffer(dat.byteLength)
	let isb = new Uint8Array(sab)

	let hPlayer = getTPlayer()
	isb.set(dat)

	setLoaderStatus('loading')
	let result = await hPlayer.loadArrayBuffer(isb.buffer)

	setLoaderStatus('idle')
	return result
}

/* loading */
export async function loadFromFile(): Promise<[number, number]> {
	if (!getIsPlayerInitialized()) return

	setLoaderStatus('waiting_for_file')
	let fil = await openFileDialog('.mid')
	let gdt = fil?.bytes
	let dat = null
	if (!gdt) {
		setLoaderStatus('idle')
		return
	}

	let cty = fil.type

	if (cty === 'application/zip') {
		setLoaderStatus('unzipping')
		let files = await new Promise((resolve, reject) => {
			fflate.unzip(gdt, (err, files) => {
				if (err) reject(err)
				else resolve(files)
			})
		})

		let filenames = Object.keys(files)
		if (filenames.length > 1) throw 'Tried to import multiple files at once.'

		dat = files[filenames[0]]
	} else dat = gdt

	setLoaderStatus('converting_ab')
	let sab = new SharedArrayBuffer(dat.byteLength)
	let isb = new Uint8Array(sab)

	let hPlayer = getTPlayer()
	isb.set(dat)

	setLoaderStatus('loading')
	let result = await hPlayer.loadArrayBuffer(isb.buffer)

	setLoaderStatus('idle')
	return result
}

export function unload(): void {
	if (!getIsPlayerInitialized()) return

	let hPlayer = getTPlayer()

	hPlayer.unload()
}

/* debug */
if (DEBUG_MODE) {
	;(window as any).__tmod_jmidiplayer_play = play
	;(window as any).__tmod_jmidiplayer_pause = pause
	;(window as any).__tmod_jmidiplayer_stop = stop
	;(window as any).__tmod_jmidiplayer_seekTo = seekTo

	;(window as any).__tmod_jmidiplayer_loadFromURL = loadFromURL
	;(window as any).__tmod_jmidiplayer_loadFromFile = loadFromFile
	;(window as any).__tmod_jmidiplayer_unload = unload
}
