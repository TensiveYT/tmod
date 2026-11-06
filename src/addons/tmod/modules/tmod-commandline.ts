/* import: utilities */
import { getClient, state } from '../../../util/state'

/* import: modules */
import { getTPlayer, loadFromFile, loadFromURL, pause, play, stop, unload } from './tmod-jmidiplayer'

/* import: types */
import { Command, CommandResultCode } from './tmod-types'

/* import: constants */
import { ENABLE_CLIENT_SIDE_COMMAND_LINE } from '../../../modules/settings/tmod/tmod-chat'
import { ENABLE_AUTO_PLAY_ON_LOAD } from '../../../modules/settings/tmod/tmod-playlist'

/* commands */
export const COMMAND_PREFIX = '!'
export const commands: Record<string, Command[]> = {
	general: [
		{
			id: 'help',
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
	playback: [
		{
			id: 'play',
			description: 'Play the currently loaded MIDI.',
			function: async (): Promise<CommandResultCode> => {
				play()
				sendChat(COMMAND_SUCCESS_TAG + 'Playing the currently loaded MIDI.')
				return 0
			}
		},
		{
			id: 'pause',
			description: 'Pause the currently playing MIDI.',
			function: async (): Promise<CommandResultCode> => {
				pause()
				sendChat(COMMAND_SUCCESS_TAG + 'The currently playing MIDI has been paused.')
				return 0
			}
		},
		{
			id: 'stop',
			description: 'Stop the currently playing MIDI.',
			function: async (): Promise<CommandResultCode> => {
				stop()
				sendChat(COMMAND_SUCCESS_TAG + 'The currently playing MIDI has been stopped.')
				return 0
			}
		},
		{
			id: 'load',
			description: 'Load a MIDI.',
			function: async (...args): Promise<CommandResultCode> => {
				let type = args[1]

				let player = getTPlayer()
				switch (type) {
					case 'url': {
						if (!args[2]) {
							sendChat(`❌ | No URL was specified.`)
							return 1
						}

						sendChat(COMMAND_INFO_TAG + 'Loading…')
						let result = await loadFromURL(args[2])
						
						sendChat(COMMAND_SUCCESS_TAG + `Loaded \`${player.totalEvents.toLocaleString()}\` events in \`${result[1].toFixed()}ms\`!` + (ENABLE_AUTO_PLAY_ON_LOAD ? ' The MIDI will now play.' : ''))
						if (ENABLE_AUTO_PLAY_ON_LOAD)
							play()
						break
					}
					case 'file_dialog': {
						sendChat(COMMAND_INFO_TAG + 'A file dialog should now open.')
						let result = await loadFromFile()

						if (result) {
							sendChat(COMMAND_SUCCESS_TAG + `Loaded \`${player.totalEvents.toLocaleString()}\` events in \`${result[1].toFixed()}ms\`!` + (ENABLE_AUTO_PLAY_ON_LOAD ? ' The MIDI will now play.' : ''))
							if (ENABLE_AUTO_PLAY_ON_LOAD)
								play()
						} else 
							sendChat(COMMAND_INFO_TAG + `No file was chosen.`)
						break
					}
				}
				return 0
			}
		},
		{
			id: 'unload',
			description: 'Unload a MIDI.',
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
		sendChat(COMMAND_SUCCESS_TAG + 'Playback finished!')
	})
}

/* command line */
export async function runCommand(command: string): Promise<CommandResultCode> {
	let args = command.trim().split(' ')

	let commandID = args[0]

	for (let categoryID in commands) {
		let category = commands[categoryID]
		let command = category.find(cmd => cmd.id === commandID)

		if (!command) continue
		else
			try {
				return await command.function(...args)
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
