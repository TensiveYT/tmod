/* import: utilities */
import { openFileDialog } from '../../../util/util'

/* import: modules */
import { getTPlayer, load, pause, play, setLoaderStatus, stop, unload } from './tmod-player'

/* import: types */
import { PlaylistEntry } from './tmod-types'

/* variables */
export const playlist: PlaylistEntry[] = []

/* checks */
export async function hasSong(filename: string): Promise<boolean> {
	return playlist.find(entry => entry.filename === filename || entry.filename.split('.').slice(0, -1).join('.') === filename) !== undefined
}

/* initialization */
export function initTPlaylist(): void {

}

/* MIDI adding */
export async function addFromURL(uri: string): Promise<PlaylistEntry> {
	setLoaderStatus('fetching')

	let url      = new URL(uri)
	let response = await fetch(url)

	let entry = {
		filename: url.pathname.split('/').pop(),
		type    : response.headers.get('Content-Type'),
		bytes   : await response.bytes()
	}

	playlist.push(entry)
	return entry
}
export async function addFromFile(): Promise<PlaylistEntry> {
	setLoaderStatus('waiting_for_file')

	let file = await openFileDialog('.mid,.midi.zip')
	if (!file) {
		setLoaderStatus('idle')
		return
	}
	
	let entry = {
		filename: file.name,
		type    : file.type,
		bytes   : file.bytes
	}

	playlist.push(entry)
	return entry
}

/* MIDI removing */
export function remove(filename: string): void {
	let index = playlist.findIndex(entry => entry.filename === filename || entry.filename.split('.').slice(0, -1).join('.') === filename)
	if (index === -1)
		throw `There is no song in the playlist named \`${filename}\`.`
	playlist.splice(index, 1)
}

/* MIDI loading */
export async function loadFile(filename: string): Promise<[number, number]> {
	let entry = playlist.find(entry => entry.filename === filename || entry.filename.split('.').slice(0, -1).join('.') === filename)
	if (!entry)
		throw `There is no song in the playlist named \`${filename}\`.`
	return await load(entry)
}