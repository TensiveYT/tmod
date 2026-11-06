/* import: settings */
import { USE_128_KEYS } from '../modules/settings/tmod/tmod-piano'

export const DEFAULT_VELOCITY = 0.5
export const TIMING_TARGET = 1000
export const MIDI_TRANSPOSE = -12

export const MIDI_KEY_NAMES: string[] = (() => {
	if (!USE_128_KEYS) {
		let names = ['a-1', 'as-1', 'b-1']
		let bare = 'c cs d ds e f fs g gs a as b'.split(' ')
		for (let oct = 0; oct < 7; oct++) {
			for (let n of bare) names.push(n + oct)
		}
		names.push('c7')

		return names
	} else {
		let names = []
		let bare = 'c cs d ds e f fs g gs a as b'.split(' ')
		for (let oct = -2; oct < 8; oct++) {
			for (let n of bare) names.push(n + oct)
		}
		names.push('c8', 'cs8', 'd8', 'ds8', 'e8', 'f8', 'fs8', 'g8')
		return names
	}
})()

export const MIDI_NOTE_NUMBERS = new Map(MIDI_KEY_NAMES.map((name, index) => [name, index]))

export const BASIC_PIANO_SCALES: Record<string, string[]> = {
	'Notes in C Major': ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'],
	'Notes in D Major': ['D', 'E', 'G♭', 'G', 'A', 'B', 'D♭', 'D'],
	'Notes in E Major': ['E', 'G♭', 'A♭', 'A', 'B', 'D♭', 'E♭', 'E'],
	'Notes in F Major': ['F', 'G', 'A', 'B♭', 'C', 'D', 'E', 'F'],
	'Notes in G Major': ['G', 'A', 'B', 'C', 'D', 'E', 'G♭', 'G'],
	'Notes in A Major': ['A', 'B', 'D♭', 'D', 'E', 'G♭', 'A♭', 'A'],
	'Notes in B Major': ['B', 'D♭', 'E♭', 'E', 'G♭', 'A♭', 'B♭', 'B'],
	'Notes in C# / Db Major': ['D♭', 'E♭', 'F', 'G♭', 'A♭', 'B♭', 'C', 'D♭'],
	'Notes in D# / Eb Major': ['E♭', 'F', 'G', 'A♭', 'B♭', 'C', 'D', 'E♭'],
	'Notes in F# / Gb Major': ['G♭', 'A♭', 'B♭', 'B', 'D♭', 'E♭', 'F', 'G♭'],
	'Notes in G# / Ab Major': ['A♭', 'B♭', 'C', 'D♭', 'E♭', 'F', 'G', 'A♭'],
	'Notes in A# / Bb Major': ['B♭', 'C', 'D', 'E♭', 'F', 'G', 'A', 'B♭'],
	'Notes in A Minor': ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'A'],
	'Notes in A# / Bb Minor': ['B♭', 'C', 'D♭', 'E♭', 'F', 'G♭', 'A♭', 'B♭'],
	'Notes in B Minor': ['B', 'D♭', 'D', 'E', 'G♭', 'G', 'A', 'B'],
	'Notes in C Minor': ['C', 'D', 'E♭', 'F', 'G', 'A♭', 'B♭', 'C'],
	'Notes in C# / Db Minor': ['D♭', 'E♭', 'E', 'G♭', 'A♭', 'A', 'B', 'D♭'],
	'Notes in D Minor': ['D', 'E', 'F', 'G', 'A', 'B♭', 'C', 'D'],
	'Notes in D# / Eb Minor': ['E♭', 'F', 'G♭', 'A♭', 'B♭', 'B', 'D♭', 'E♭'],
	'Notes in E Minor': ['E', 'G♭', 'G', 'A', 'B', 'C', 'D', 'E'],
	'Notes in F Minor': ['F', 'G', 'A♭', 'B♭', 'C', 'D♭', 'E♭', 'F'],
	'Notes in F# / Gb Minor': ['G♭', 'A♭', 'A', 'B', 'D♭', 'D', 'E', 'G♭'],
	'Notes in G Minor': ['G', 'A', 'B♭', 'C', 'D', 'E♭', 'F', 'G'],
	'Notes in G# / Ab Minor': ['A♭', 'B♭', 'B', 'D♭', 'E♭', 'E', 'G♭', 'A♭']
}
