/* command line */
export type CommandResultCode = 0 | 1

export interface Command {
	id: string
	description: string
	function: (...args: string[]) => Promise<CommandResultCode>
}

/* MIDI player */
export type MIDILoaderStatus = 'idle' | 'waiting_for_file' | 'fetching' | 'unzipping' | 'converting_ab' | 'loading'

/* MIDI playlist */
export interface PlaylistEntry {
	filename: string
	type: string
	bytes: Uint8Array
}