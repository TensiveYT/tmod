/* import: packages */
import Player from '../../../libs/packages/jmidiplayer/index'

/* import: types */
import { PlaylistEntry } from './tmod-types'

/* import: settings */
import { COLOR_PALETTE, ENABLE_HOLD_PEDAL } from '../../../modules/settings/tmod/tmod-playback'
import { DEBUG_MODE } from '../../../modules/settings/tmod/tmod-miscellaneous'
import { ENABLE_CLIENT_SIDE_PLAYBACK } from '../../../modules/settings/tmod/tmod-optimization'
import { USE_128_KEYS } from '../../../modules/settings/tmod/tmod-piano'

/* import: constants */
import { MIDI_KEY_NAMES } from '../../../util/constants'

/* import: misc */
import { getClient, getNoteQuota, getPiano, state } from '../../../util/state'
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

/* initialization */
export function initTPlayer(): Player {
	if (getIsPlayerInitialized()) return

	let hPlayer = new Player()
	let piano = getPiano()
	let client = getClient()
	let noteQuota = getNoteQuota()

	function noteOff(e) {
		if (ENABLE_HOLD_PEDAL)
			if (holdPedalEnabled.get(e.channel))
				return

		if (!USE_128_KEYS && (e.note < 21 || e.note > 108)) 
			return

		if (!USE_INFINITE_NOTEQUOTA)
			if (!noteQuota.spend(1))
				return
		
		let key = !USE_128_KEYS ? MIDI_KEY_NAMES[e.note - 21] : MIDI_KEY_NAMES[e.note]
		piano.stop(key, { id: client.participantId }, 0)
		if (!ENABLE_CLIENT_SIDE_PLAYBACK) 
			client.stopNote(key)
	}
	function noteOn(e) {
		if (!USE_INFINITE_NOTEQUOTA)
			if (!noteQuota.spend(1))
				return

		let key = !USE_128_KEYS ? MIDI_KEY_NAMES[e.note - 21] : MIDI_KEY_NAMES[e.note]
		piano.play(key, e.velocity / 127, { id: client.participantId, color: COLOR_PALETTE[e.channel] }, 0)

		if (ENABLE_HOLD_PEDAL)
			if (holdPedalEnabled.get(e.channel))
				holdPedalNotes.get(e.channel).push(key)

		if (!ENABLE_CLIENT_SIDE_PLAYBACK) 
			client.startNote(key, e.velocity / 127)
	}
	let holdPedalEnabled: Map<number, boolean> = new Map([[0, false], [1, false], [2, false], [3, false], [4, false], [5, false], [6, false], [7, false], [8, false], [9, false], [10, false], [11, false], [12, false], [13, false], [14, false], [15, false]])
	let holdPedalNotes  : Map<number, string[]> = new Map([[0, []], [1, []], [2, []], [3, []], [4, []], [5, []], [6, []], [7, []], [8, []], [9, []], [10, []], [11, []], [12, []], [13, []], [14, []], [15, []]])
	hPlayer.on('midiEvent', e => {
		switch (e.type) {
			case 0x08: {
				// note off
				noteOff(e)
				break
			}
			case 0x09: {
				// note on
				if (!USE_128_KEYS && (e.note < 21 || e.note > 108)) 
					return
				
				if (e.velocity === 0) {
					noteOff(e)
				} else {
					noteOn(e)
				}
				break
			}
			case 0x0b: {
				// control change
				if (ENABLE_HOLD_PEDAL && e.ccNum === 64) {
					if (e.ccValue >= 64)
						holdPedalEnabled.set(e.channel, true)
					else {
						if (holdPedalEnabled.get(e.channel)) {
							let notes = holdPedalNotes.get(e.channel)

							for (let note of notes) {
								if (!USE_INFINITE_NOTEQUOTA)
									if (!noteQuota.spend(1))
										return
								
								piano.stop(note, { id: client.participantId }, 0)
								if (!ENABLE_CLIENT_SIDE_PLAYBACK) 
									client.stopNote(note)
							}
						}
						holdPedalEnabled.set(e.channel, false)
					}
				}
			}
		}
	})
	hPlayer.on('endOfFile', () => {
		logger.log('MIDIPlayer', 'Playback finished!')
	})

	state.addons.tmod.player = hPlayer
	return hPlayer
}

/* playback */
export function play(): void {
	if (!getIsPlayerInitialized()) 
		return

	let hPlayer = getTPlayer()

	logger.log('MIDIPlayer', 'Now playing a MIDI.')
	hPlayer.play()
}

export function pause(): void {
	if (!getIsPlayerInitialized()) 
		return

	let hPlayer = getTPlayer()

	logger.log('MIDIPlayer', 'Paused a MIDI.')
	hPlayer.pause()
}

export function stop(): void {
	if (!getIsPlayerInitialized()) 
		return

	let hPlayer = getTPlayer()

	logger.log('MIDIPlayer', 'Stopped a MIDI.')
	hPlayer.stop()
}

export function seekTo(tick: number): void {
	if (!getIsPlayerInitialized()) 
		return

	let hPlayer = getTPlayer()

	logger.log('MIDIPlayer', `Seeked to tick ${tick} in a MIDI.`)
	hPlayer.seek(tick)
}

/* loading */
export async function load(entry: PlaylistEntry): Promise<[number, number]> {
	if (!getIsPlayerInitialized()) return

	let dat: Uint8Array = entry.bytes

	let sab = new SharedArrayBuffer(dat.byteLength)
	let isb = new Uint8Array(sab)

	let hPlayer = getTPlayer()
	isb.set(dat)

	let result = await hPlayer.loadArrayBuffer(isb.buffer)

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
	;(window as any).__tmod_jmidiplayer_unload = unload
}
