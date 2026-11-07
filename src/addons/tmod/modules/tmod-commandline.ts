/* import: utilities */
import { getClient, state } from '../../../util/state'

/* import: modules */
import { getTPlayer, load, pause, play, stop, unload } from './tmod-player'
import { addFromFile, addFromURL, clearPlaylist, getIsPaused, getIsPlaying, getSong, hasSong, loadFile, pausePlaylist, playlist, playPlaylist, remove, resumePlaylist, skipSong, stopPlaylist } from './tmod-playlist'

/* import: types */
import { Command, CommandResultCode, NormalCommand, SubCommand, SubCommandedCommand } from './tmod-types'

/* import: constants */
import { ENABLE_CLIENT_SIDE_COMMAND_LINE } from '../../../modules/settings/tmod/tmod-chat'
import { DISABLE_PLAYLIST_CHAT, ENABLE_AUTO_PLAY_ON_LOAD } from '../../../modules/settings/tmod/tmod-playlist'

/* import: misc */
import * as logger from './tmod-logger'
import { timeFormat } from '../../../util/util'

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
						if (!args[1].startsWith('!')) {
							sendChat(COMMAND_ERROR_TAG + `Cannot find command category \`${args[1]}\`.`)
							return 1
						} else {
							let commandID = args[1].slice(1)
							for (let categoryID in commands) {
								let category = commands[categoryID]
								let command = category.find(cmd => cmd.id === commandID || cmd.aliases.includes(commandID))

								if (!command) continue
								else {
									if (args[2]) {
										let subcommandID = args[2]
										let subcommand: SubCommand = (command as SubCommandedCommand).subcommands.find(cmd => cmd.id === subcommandID || cmd.aliases.includes(subcommandID))

										if (!subcommand) {
											sendChat(COMMAND_ERROR_TAG + `Cannot find subcommand \`${subcommandID}\` of \`${commandID}\`.`)
											return 1
										}

										sendChat(COMMAND_SUCCESS_TAG + `Subcommand \`${subcommand.id}\` of \`${command.id}\` — *${command.description}*`)
										sendChat(COMMAND_SUCCESS_TAG + `Aliases: ${subcommand.aliases.map(a => `\`${a}\``).join(', ')}`)
										return 0
									} else {
										sendChat(COMMAND_SUCCESS_TAG + `Command \`${command.id}\` — *${command.description}*`)
										sendChat(COMMAND_SUCCESS_TAG + `Aliases: ${command.aliases.map(a => `\`${a}\``).join(', ')}`)
										return 0
									}
								}
							}
							sendChat(COMMAND_ERROR_TAG + `Cannot find command \`${args[1]}\`.`)
							return 1
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
					description: 'Add the specified MIDI to the Playlist.',
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
					description: 'Remove the specified MIDI from the Playlist.',
					function: async (...args): Promise<CommandResultCode> => {
						let name = args.slice(1).join(' ').trim()
						
						let song = getSong(name)

						if (!name) {
							sendChat(COMMAND_ERROR_TAG + `Please specify a song to remove. Use \`!playlist view\` to see available songs.`)
							return 1
						}

						if (!song) {
							sendChat(COMMAND_ERROR_TAG + `There is no song in the playlist named \`${name}\`.`)
							return 1
						}

						remove(song.filename)
						sendChat(COMMAND_SUCCESS_TAG + `Removed song \`${song.filename}\` from the playlist.`)

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
				},
				{
					id: 'skip',
					aliases: ['sk', 'k'],
					description: 'Skip the currently playing song within the Playlist.',
					function: async (...args): Promise<CommandResultCode> => {
						skipSong()

						sendChat(COMMAND_SUCCESS_TAG + `Skipped song.`)
						return 0
					}
				},
				{
					id: 'view',
					aliases: ['v'],
					description: 'View all songs within the Playlist.',
					function: async (...args): Promise<CommandResultCode> => {
						if (playlist.length <= 0) {
							sendChat(COMMAND_ERROR_TAG + 'There are no songs within the Playlist.')
							return 1
						}

						let songs = playlist.map((p, i) => `${i}: \`${p.filename}\``)
						sendChat(COMMAND_SUCCESS_TAG + songs.join(' | '))
						return 0
					}
				},
				{
					id: 'clear',
					aliases: ['c', 'cl', 'removeall'],
					description: 'Remove all songs within the Playlist.',
					function: async (...args): Promise<CommandResultCode> => {
						if (playlist.length <= 0) {
							sendChat(COMMAND_ERROR_TAG + 'There are no songs within the Playlist.')
							return 1
						}

						clearPlaylist()
						sendChat(COMMAND_SUCCESS_TAG + 'Removed all songs within the Playlist.')
						return 0
					}
				},
				{
					id: 'quickplay',
					aliases: ['l', 'q', 'load', 'quick'],
					description: 'Stop the playlist, and immediately load & play the specified MIDI.',
					function: async (...args): Promise<CommandResultCode> => {
						let name = args.slice(1).join(' ').trim()

						let player = getTPlayer()
						let song = getSong(name)

						if (!name) {
							sendChat(COMMAND_ERROR_TAG + `Please specify a song to play. Use \`!playlist view\` to see available songs.`)
							return 1
						}

						if (!song) {
							sendChat(COMMAND_ERROR_TAG + `There is no song in the playlist named \`${name}\`.`)
							return 1
						}
						
						if (getIsPlaying())
							stopPlaylist()
						
						let result = await load(song)

						if (!DISABLE_PLAYLIST_CHAT)
							sendChat(COMMAND_SUCCESS_TAG + `Loaded \`${player.totalEvents.toLocaleString()}\` events in \`${timeFormat(result[1])}\`! | Now playing: \`${song.filename}\``)
						
						logger.log('MIDIPlaylist', `Now playing: \`${song.filename}\``)
						player.play()

						return 0
					}
				}
			]
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
