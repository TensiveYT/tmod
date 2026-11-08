/* import: packages */
import * as fflate from '../../../libs/packages/fflate/index'

/* import: utilities */
import { openFileDialog, timeFormat } from '../../../util/util'

/* import: modules */
import { getTPlayer, load, pause, play, stop, unload } from './tmod-player'

/* import: types */
import { PlaylistEntry } from './tmod-types'

/* import: misc */
import * as logger from './tmod-logger'
import { COMMAND_SUCCESS_TAG, sendChat } from './tmod-commandline'
import { DISABLE_PLAYLIST_CHAT } from '../../../modules/settings/tmod/tmod-playlist'

/* variables */
export const playlist: PlaylistEntry[] = []

export const AUTO_PLAY     = true
export const LOOP_PLAYLIST = true

export let   playlistIndex  :       number = 0
export let   playingCallback: () => void

export function getSong(filename: string): PlaylistEntry {
	return playlist.find(entry => entry.filename === filename || entry.filename.split('.').slice(0, -1).join('.') === filename)
}

/* checks */
export function hasSong(filename: string): boolean {
	return playlist.find(entry => entry.filename === filename || entry.filename.split('.').slice(0, -1).join('.') === filename) !== undefined
}
export function getIsPlaying(): boolean {
	return playingCallback !== undefined
}
export function getIsPaused(): boolean {
	return getIsPlaying() && !getTPlayer().isPlaying
}
export function getIsInQuickPlayMode(): boolean {
	return !getIsPlaying() && getTPlayer().isPlaying
}

/* initialization */
export function initTPlaylist(): void {

}

/* MIDI adding */
export async function addFromURL(uri: string): Promise<PlaylistEntry[]> {
	let url      = new URL(uri)
	let response = await fetch(url)
	
	let type     = response.headers.get('Content-Type')
	let bytes    = await response.bytes()

	let entries: PlaylistEntry[] = []

	if (type === 'application/zip' || type === 'application/x-zip-compressed') {
		let files: fflate.Unzipped = await new Promise((resolve, reject) => {
			fflate.unzip(bytes, (err, files) => {
				if (err) reject(err)
				else resolve(files)
			})
		})
		for (let filename in files) {
			let entry: PlaylistEntry = {
				filename,
				bytes   : files[filename]
			}

			entries.push(entry)
		}
	} else {
		let entry = {
			filename: url.pathname.split('/').pop(),
			bytes
		}

		entries.push(entry)
	}

	playlist.push(...entries)
	return entries
}
export async function addFromFile(): Promise<PlaylistEntry[]> {
	let files = await openFileDialog('.mid,.midi,.zip')

	if (!files || files.length <= 0)
		return

	let entries: PlaylistEntry[] = []
	for (let file of files) {
		if (file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
			let files: fflate.Unzipped = await new Promise((resolve, reject) => {
				fflate.unzip(file.bytes, (err, files) => {
					if (err) reject(err)
					else resolve(files)
				})
			})
			
			for (let filename in files) {
				let entry: PlaylistEntry = {
					filename,
					bytes   : files[filename]
				}

				entries.push(entry)
			}
		} else {
			let entry: PlaylistEntry = {
				filename: file.name,
				bytes   : file.bytes
			}

			entries.push(entry)
		}
	}

	playlist.push(...entries)
	return entries
}

/* MIDI removing */
export function remove(filename: string): void {
	let index = playlist.findIndex(entry => entry.filename === filename || entry.filename.split('.').slice(0, -1).join('.') === filename)
	if (index === -1)
		throw new Error(`There is no song in the playlist named \`${filename}\`.`)
	playlist.splice(index, 1)
}
export function clearPlaylist(): void {
	playlist.length = 0
}

/* MIDI loading */
export async function loadFile(filename: string): Promise<[number, number]> {
	let entry = playlist.find(entry => entry.filename === filename || entry.filename.split('.').slice(0, -1).join('.') === filename)
	if (!entry)
		throw new Error(`There is no song in the playlist named \`${filename}\`.`)
	return await load(entry)
}
export async function loadFileFromIndex(index: number): Promise<[number, number]> {
	let entry = playlist[index]
	if (!entry)
		throw new Error(`There is no song in the playlist at index \`${index}\`.`)
	return await load(entry)
}

/* MIDI playback */
export function playPlaylist(filename?: string): void {
	if (playlist.length <= 0)
		throw new Error('There are no MIDIs in the playlist.')

	if (playingCallback)
		throw new Error('Cannot play the Playlist while something is already playing.')

	if (filename) {
		let index = playlist.findIndex(entry => entry.filename === filename || entry.filename.split('.').slice(0, -1).join('.') === filename)
		if (index === -1)
			throw new Error(`There is no song in the playlist named \`${filename}\`.`)

		playlistIndex = index
	}

	let player = getTPlayer()

	playingCallback = async() => {
		player.unload()

		let result = await loadFileFromIndex(playlistIndex)
		player.play()

		if (!DISABLE_PLAYLIST_CHAT)
			sendChat(COMMAND_SUCCESS_TAG + `Loaded \`${player.totalEvents.toLocaleString()}\` events in \`${timeFormat(result[1])}\`! | Now playing: \`${playlist[playlistIndex].filename}\``)
		logger.log('MIDIPlaylist', `Now playing: \`${playlist[playlistIndex].filename}\``)
		
		playlistIndex = (playlistIndex + 1) % playlist.length
	}
	playingCallback()
	player.on('endOfFile', playingCallback)

	logger.log('MIDIPlaylist', 'Begun playback.')
}
export function pausePlaylist(): void {
	if (!playingCallback)
		throw new Error('Cannot pause the Playlist while nothing is playing.')

	if (getIsPaused())
		throw new Error('Tried to pause the Playlist while already paused.')

	let player = getTPlayer()

	player.pause()

	logger.log('MIDIPlaylist', 'Playback paused.')
}
export function resumePlaylist(): void {
	if (!playingCallback)
		throw new Error('Cannot resume the Playlist while nothing is playing.')

	if (!getIsPaused())
		throw new Error('Tried to resume the Playlist while already playing.')

	let player = getTPlayer()

	player.play()
	logger.log('MIDIPlaylist', 'Playback resumed.')
}
export function stopPlaylist(): void {
	if (!playingCallback)
		throw new Error('Cannot stop the Playlist while nothing is playing.')

	let player = getTPlayer()

	player.stop()
	player.unload()
	player.off('endOfFile', playingCallback)
	playingCallback = undefined
	playlistIndex = 0

	logger.log('MIDIPlaylist', 'Playback stopped.')
}
export function skipSong(): void {
	if (!playingCallback)
		throw new Error('Cannot skip a song in the Playlist while nothing is playing.')

	let player = getTPlayer()

	player.stop()

	logger.log('MIDIPlaylist', 'Song skipped.')
	playingCallback()
}