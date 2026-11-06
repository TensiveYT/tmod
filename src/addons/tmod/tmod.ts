/* import: modules */
import { initTCommandLine } from './modules/tmod-commandline'
import { initTPlayer } from './modules/tmod-jmidiplayer'

/* variables */
export const VERSION = 'v0.2.0-alpha'

/* initialization */
export function initTMod(): void {
	initTPlayer()
	initTCommandLine()

	let div = document.createElement('div')
	div.id = 'tmod-version'
	div.innerHTML = `<div id='tmod-version'>T-Mod<br><i style='opacity: 0.5'>version ${VERSION}</i></div>`
	document.querySelector('#chat').append(div)
}