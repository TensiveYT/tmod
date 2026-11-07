/* import: utilities */
import { getClient, state } from '../../../util/state'

/* import: modules */
import { getTPlayer, pause, play, stop, unload } from './tmod-player'
import { addFromFile, addFromURL, getIsPaused, hasSong, loadFile, pausePlaylist, playPlaylist, remove, resumePlaylist, stopPlaylist } from './tmod-playlist'

/* import: types */
import { Command, CommandResultCode, NormalCommand, SubCommand, SubCommandedCommand } from './tmod-types'

/* import: constants */
import { ENABLE_CLIENT_SIDE_COMMAND_LINE } from '../../../modules/settings/tmod/tmod-chat'
import { DISABLE_PLAYLIST_CHAT, ENABLE_AUTO_PLAY_ON_LOAD } from '../../../modules/settings/tmod/tmod-playlist'


/* commands */
export const COMMAND_PREFIX = '!'
export const commands: Record<string, Command[]> = {
	general: [
		{
			id: 'help',
			aliases: ['h'],
			description: 'Shows information about commands within the T-Mod Command Line.',
			function: async (...args): Promise<CommandResultCode> => {
				if (args.length === 1) {
					let categories = Object.keys(commands)
					sendChat(COMMAND_SUCCESS_TAG + `Command categories: ${categories.map(c => `\`${c}\``).join(', ')}`)
					return 0
				} else {
					if (commands[args[1]]) {
						let category = commands[args[1]]
						sendChat(COMMAND_SUCCESS_TAG + `Commands within category \`${args[1]}\`: ${category.map(c => `\`${c.id}\``).join(', ')}`)
						return 0
					} else {
						let commandID = args[1]
						for (let categoryID in commands) {
							let category = commands[categoryID]
							let command = category.find(cmd => cmd.id === commandID)

							if (!command) continue
							else {
								sendChat(COMMAND_SUCCESS_TAG + `Command \`${command.id}\` — *${command.description}*`)
								return 0
							}
						}
					}
				}
			}
		},
		{
			id: 'js',
			aliases: ['j'],
			description: 'Shows information about commands within the T-Mod Command Line.',
			function: async (...args): Promise<CommandResultCode> => {
				let input = args.slice(1).join(' ')
				try {
					let result = eval(input)
					sendChat(COMMAND_SUCCESS_TAG + (typeof result === 'object' ? JSON.stringify(result) : typeof result === 'number' ? result.toLocaleString() : (result?.toString?.() ?? 'undefined')))
					return 0
				} catch (error) {
					sendChat(COMMAND_ERROR_TAG + `${error.message}`)
					return 1
				}
			}
		}
	],
	playlist: [
		{
			id: 'playlist',
			aliases: ['pl'],
			description: 'Modify the Playlist.',
			subcommands: [
				{
					id: 'add',
					aliases: ['a'],
					description: 'Add a MIDI to the Playlist.',
					function: async (...args): Promise<CommandResultCode> => {
						let type = args[1]
						switch (type) {
							case 'url': {
								if (!args[2]) {
									sendChat(COMMAND_ERROR_TAG + `No URL was specified.`)
									return 1
								}
								let entry = await addFromURL(args[2])
								
								sendChat(COMMAND_SUCCESS_TAG + `Added file \`${entry.filename}\`.`)
								break
							}
							case 'file_dialog': {
								sendChat(COMMAND_INFO_TAG + 'A file dialog should now open.')
								let entry = await addFromFile()
								
								if (entry) {
									sendChat(COMMAND_SUCCESS_TAG + `Added file \`${entry.filename}\`.`)
								} else 
									sendChat(COMMAND_INFO_TAG + `No file was chosen.`)
								break
							}
							default:
								sendChat(COMMAND_ERROR_TAG + 'You need to specify the way you want to add the file.')
								return 1
						}
						return 0
					}
				},
				{
					id: 'remove',
					aliases: ['r'],
					description: 'Remove a MIDI from the Playlist.',
					function: async (...args): Promise<CommandResultCode> => {
						let song = args.slice(1).join(' ')

						if (!hasSong(song)) {
							sendChat(COMMAND_ERROR_TAG + `There is no song in the playlist named \`${song}\`.`)
							return 1
						}

						remove(song)
						sendChat(COMMAND_SUCCESS_TAG + `Removed song \`${song}\` from the playlist.`)

						return 0
					}
				},
				{
					id: 'play',
					aliases: ['p'],
					description: 'Begin playback for the Playlist.',
					function: async (...args): Promise<CommandResultCode> => {
						if (args.length === 0) {
							playPlaylist()
							sendChat(COMMAND_SUCCESS_TAG + `Begun playback.`)
							return 0
						} else {
							let song = args.slice(1).join(' ')

							playPlaylist(song)
							return 0
						}
					}
				},
				{
					id: 'toggle',
					aliases: ['t'],
					description: 'Toggle playback within the Playlist.',
					function: async (...args): Promise<CommandResultCode> => {
						if (!getIsPaused()) {
							pausePlaylist()

							sendChat(COMMAND_SUCCESS_TAG + `Playback paused.`)
							return 0
						} else {
							resumePlaylist()

							sendChat(COMMAND_SUCCESS_TAG + `Playback resumed.`)
							return 0
						}
					}
				},
				{
					id: 'stop',
					aliases: ['s'],
					description: 'Stop playback for the Playlist.',
					function: async (...args): Promise<CommandResultCode> => {
						stopPlaylist()

						sendChat(COMMAND_SUCCESS_TAG + `Playback stopped.`)
						return 0
					}
				}
			]
		},
		{
			id: 'load',
			aliases: ['l'],
			description: 'Load a MIDI from the Playlist.',
			function: async (...args): Promise<CommandResultCode> => {
				let song = args.slice(1).join(' ')

				let player = getTPlayer()

				if (!hasSong(song)) {
					sendChat(COMMAND_ERROR_TAG + `There is no song in the Playlist named \`${song}\`.`)
					return 1
				}

				sendChat(COMMAND_INFO_TAG + `Loading \`${song}\`…`)
				let result = await loadFile(song)
						
				sendChat(COMMAND_SUCCESS_TAG + `Loaded \`${player.totalEvents.toLocaleString()}\` events in \`${result[1].toFixed()}ms\`!` + (ENABLE_AUTO_PLAY_ON_LOAD ? ' The MIDI will now play.' : ''))
				if (ENABLE_AUTO_PLAY_ON_LOAD)
					play()

				return 0
			}
		},
		{
			id: 'unload',
			aliases: ['u'],
			description: 'Unload the currently loaded MIDI.',
			function: async (): Promise<CommandResultCode> => {
				unload()
				sendChat(COMMAND_SUCCESS_TAG + 'Unloaded the currently loaded MIDI.')

				return 0
			}
		}
	]
}

/* initialization */
export function initTCommandLine(): void {
	let client = getClient()
	let player = getTPlayer()

	client.on('a', e => {
		if (client.isConnected() && e.p._id !== client.participantId) return

		let message = e.a
		if (message.startsWith(COMMAND_PREFIX)) {
			let command = message.slice(COMMAND_PREFIX.length)
			runCommand(command)
		}
	})

	player.on('endOfFile', () => {
		if (!DISABLE_PLAYLIST_CHAT)
			sendChat(COMMAND_SUCCESS_TAG + 'Playback finished!')
	})
}

/* command line */
export async function runCommand(command: string): Promise<CommandResultCode> {
	let args = command.trim().split(' ')

	let commandID = args[0]

	for (let categoryID in commands) {
		let category = commands[categoryID]
		let command = category.find(cmd => cmd.id === commandID || cmd.aliases.includes(commandID))

		if (!command) continue
		else
			try {
				if (!(command as any).subcommands)
					return await (command as NormalCommand).function(...args)
				else {
					let subcommandID = args[1]
					let subcommand: SubCommand = (command as SubCommandedCommand).subcommands.find(cmd => cmd.id === subcommandID || cmd.aliases.includes(subcommandID))

					if (!subcommand) {
						sendChat(COMMAND_ERROR_TAG + `Cannot find subcommand \`${subcommandID}\` of \`${commandID}\`.`)
						return 1
					}

					return await subcommand.function(...args.slice(1))
				}
			} catch (error) {
				sendChat(COMMAND_ERROR_TAG + `${error.message}`)
				console.error(error)
				return 1
			}
	}
	sendChat(COMMAND_ERROR_TAG + `Cannot find command \`${commandID}\`.`)
	return 1
}

/* tags */
export const TMOD_TAG = '**[T]:** '
export const COMMAND_INFO_TAG    = `🟦 | `
export const COMMAND_ERROR_TAG   = `❌ | `
export const COMMAND_SUCCESS_TAG = `✅ | `

/* chat features */
export function sendChat(message: string) {
	if (ENABLE_CLIENT_SIDE_COMMAND_LINE) {
		state.chat.receive({
			m: 'a',
			a: message,
			p: { _id: 'client', id: 'client', name: 'T-Mod', color: '#ffffff' },
			t: Date.now()
		})
	} else state.chat.send(TMOD_TAG + message)
}
