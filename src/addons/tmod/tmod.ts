/* import: modules */
import { initTCommandLine } from './modules/tmod-commandline'
import { initTPlayer } from './modules/tmod-player'
import { initTPlaylist } from './modules/tmod-playlist'

/* variables */
export const VERSION = 'v0.2.2-alpha'

/* screen elements */
export const tmodContainer = document.createElement('tmod-container')

/* initialization */
export function initTMod(): void {
	// tag
	let tag = document.createElement('tmod-tag')
	tag.innerHTML = `<div id='tmod-tag-name'>T-Mod</div><i id='tmod-tag-version' style='opacity: 0.5'>${VERSION}</i>`

	tmodContainer.appendChild(tag)

	// append container to screen
	document.body.appendChild(tmodContainer)

	// init modules
	initTPlayer()
	initTPlaylist()
	initTCommandLine()
}
