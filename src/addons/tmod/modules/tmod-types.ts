/* command line */
export type CommandResultCode = 0 | 1
export type Command = NormalCommand | SubCommandedCommand

export interface NormalCommand {
	id: string
	aliases: string[]
	description: string
	function: (...args: string[]) => Promise<CommandResultCode>
}

export interface SubCommandedCommand {
	id: string
	aliases: string[]
	description: string
	subcommands: SubCommand[]
}

export interface SubCommand {
	id: string
	aliases: string[]
	description: string
	function: (...args: string[]) => Promise<CommandResultCode>
}

/* MIDI playlist */
export type MIDIAddingState = 'waiting_for_file' | 'fetching' | 'unzipping'
export interface PlaylistEntry {
	filename: string
	bytes: Uint8Array
	adding?: true
	adding_state?: MIDIAddingState
}