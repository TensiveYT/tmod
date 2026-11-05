/* import: packages */
import      Player from '../../../libs/packages/jmidiplayer/index'
import * as fflate from '../../../libs/packages/fflate/src/index'

/* import: misc */
import { getClient, getPiano, state } from '../../../util/state'
import { openFileDialog } from '../../../util/util'
import { COLOR_PALETTE } from '../../../modules/settings/tmod/tmod-customization'
import { DEBUG_MODE } from '../../../modules/settings/tmod/tmod-miscellaneous'
import { ENABLE_CLIENT_SIDE_PLAYBACK } from '../../../modules/settings/tmod/tmod-optimization'

import { MIDI_KEY_NAMES } from '../../../util/constants'

/* checks */
export function getIsPlayerInitialized(): boolean {
	return state.addons.hypermod.player !== null
}

/* variables */
export var loaderState = 'idle'
export function getTPlayer(): Player {
	return state.addons.hypermod.player
}

/* initialization */
export function initTPlayer(): Player {
	if (getIsPlayerInitialized())
		return

	let hPlayer = new Player()
	let piano = getPiano()
	let client = getClient()

	hPlayer.on('midiEvent', e => {
		switch (e.type) {
			case 0x08: { // note off
				if (e.note < 21 || e.note > 108)
					return
				let key = MIDI_KEY_NAMES[e.note - 21]
				piano.stop(key, { id: client.participantId }, 0)
				if (!ENABLE_CLIENT_SIDE_PLAYBACK)
					client.stopNote(key)
				break
			}
			case 0x09: { // note on
				if (e.note < 21 || e.note > 108)
					return
				if (e.velocity === 0) {
					let key = MIDI_KEY_NAMES[e.note - 21]
					piano.stop(key, { id: client.participantId }, 0)
					if (!ENABLE_CLIENT_SIDE_PLAYBACK)
						client.stopNote(key)
				} else {
					let key = MIDI_KEY_NAMES[e.note - 21]
					piano.play(key, e.velocity / 127, { id: client.participantId, color: COLOR_PALETTE[e.channel] }, 0)
					if (!ENABLE_CLIENT_SIDE_PLAYBACK)
						client.startNote(key, e.velocity / 127)
				}
				break
			}
		}
	})

	state.addons.hypermod.player = hPlayer
	return hPlayer
}

/* playback */
export function play(): void {
	if (!getIsPlayerInitialized())
		return

	let hPlayer = getTPlayer()

	hPlayer.play()
}

export function pause(): void {
	if (!getIsPlayerInitialized())
		return

	let hPlayer = getTPlayer()

	hPlayer.pause()
}

export function stop(): void {
	if (!getIsPlayerInitialized())
		return

	let hPlayer = getTPlayer()

	hPlayer.stop()
}

export function seekTo(tick: number): void {
	if (!getIsPlayerInitialized())
		return

	let hPlayer = getTPlayer()

	hPlayer.seek(tick)
}

/* loading */
export async function loadFromURL(uri: string): Promise<[number, number]> {
	if (!getIsPlayerInitialized())
		return

	loaderState = 'fetching'
	let url = new URL(uri)
	let pro = fetch(url)

	let res = await pro
	let gdt = await res.bytes()
	let dat = null

	let cty = res.headers.get('Content-Type');

	if (cty === 'application/zip') {
		loaderState = 'unzipping'
		let files: fflate.Unzipped = await new Promise((resolve, reject) => {
			fflate.unzip(gdt, (err, files) => {
				if (err) reject(err);
				else resolve(files);
			})
		})

		let filenames = Object.keys(files)
		if (filenames.length > 1)
			throw 'Tried to import multiple files at once.'

		dat = files[filenames[0]]
	} else
		dat = gdt

	loaderState = 'converting_ab'
	let sab = new SharedArrayBuffer(dat.byteLength)
	let isb = new Uint8Array(sab)

	let hPlayer = getTPlayer()
	isb.set(dat)

	loaderState = 'loading'
	let result = await hPlayer.loadArrayBuffer(isb.buffer)

	loaderState = 'idle'
	return result
}

/* loading */
export async function loadFromFile(): Promise<[number, number]> {
	if (!getIsPlayerInitialized())
		return

	let fil = (await openFileDialog('.mid'))
	let gdt = fil?.bytes
	let dat = null
	if (!gdt)
		return

	let cty = fil.type

	if (cty === 'application/zip') {
		loaderState = 'unzipping'
		let files: fflate.Unzipped = await new Promise((resolve, reject) => {
			fflate.unzip(gdt, (err, files) => {
				if (err) reject(err);
				else resolve(files);
			})
		})

		let filenames = Object.keys(files)
		if (filenames.length > 1)
			throw 'Tried to import multiple files at once.'

		dat = files[filenames[0]]
	} else
		dat = gdt

	loaderState = 'converting_ab'
	let sab = new SharedArrayBuffer(dat.byteLength)
	let isb = new Uint8Array(sab)

	let hPlayer = getTPlayer()
	isb.set(dat)

	loaderState = 'loading'
	let result = await hPlayer.loadArrayBuffer(isb.buffer)

	loaderState = 'idle'
	return result
}

export function unload(): void {
	if (!getIsPlayerInitialized())
		return

	let hPlayer = getTPlayer()

	hPlayer.unload()
}

/* debug */
if (DEBUG_MODE) {
	; (window as any).__tmod_jmidiplayer_play   = play
	; (window as any).__tmod_jmidiplayer_pause  = pause
	; (window as any).__tmod_jmidiplayer_stop   = stop
	; (window as any).__tmod_jmidiplayer_seekTo = seekTo

	; (window as any).__tmod_jmidiplayer_loadFromURL  = loadFromURL
	; (window as any).__tmod_jmidiplayer_loadFromFile = loadFromFile
	; (window as any).__tmod_jmidiplayer_unload       = unload
}