/* import: utilities */
import { getClient, state } from '../../../util/state'

/* import: modules */
import { getTPlayer, loadFromFile, loadFromURL, pause, play, stop, unload } from './tmod-jmidiplayer'

/* import: types */
import { Command, CommandResultCode } from './tmod-types'

/* import: constants */
import { ENABLE_CLIENT_SIDE_COMMAND_LINE } from '../../../modules/settings/tmod/tmod-chat'

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
					sendChat(`Command categories: ${categories.map(c => `\`${c}\``).join(', ')}`)
					return 0
				} else {
					if (commands[args[1]]) {
						let category = commands[args[1]]
						sendChat(`Commands within category \`${args[1]}\`: ${category.map(c => `\`${c.id}\``).join(', ')}`)
					} else {
						let commandID = args[1]
						for (let categoryID in commands) {
							let category = commands[categoryID]
							let command = category.find(cmd => cmd.id === commandID)

							if (!command) continue
							else {
								sendChat(`[T-Mod] Command \`${command.id}\` — *${command.description}*`)
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
					sendChat('✅ | ' + (typeof result === 'object' ? JSON.stringify(result) : typeof result === 'number' ? result.toLocaleString() : (result?.toString?.() ?? 'undefined')))
					return 0
				} catch (error) {
					sendChat(`❌ | ${error.message}`)
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
				sendChat('Playing the currently loaded MIDI.')
				return 0
			}
		},
		{
			id: 'pause',
			description: 'Pause the currently playing MIDI.',
			function: async (): Promise<CommandResultCode> => {
				pause()
				sendChat('The currently playing MIDI has been paused.')
				return 0
			}
		},
		{
			id: 'stop',
			description: 'Stop the currently playing MIDI.',
			function: async (): Promise<CommandResultCode> => {
				stop()
				sendChat('The currently playing MIDI has been stopped.')
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
						sendChat('Loading…')
						let result = await loadFromURL(args[2])
						sendChat(`Loaded \`${player.totalEvents.toLocaleString()}\` events in \`${result[1].toFixed()}ms\`!`)
						break
					}
					case 'file_dialog': {
						sendChat('A file dialog should now open.')
						let result = await loadFromFile()
						if (result) sendChat(`Loaded \`${player.totalEvents.toLocaleString()}\` events in \`${result[1].toFixed()}ms\`!`)
						else sendChat(`No file was chosen.`)
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
				sendChat('Unloaded the currently loaded MIDI.')
				return 0
			}
		}
	]
}

/* initialization */
export function initTCommandLine(): void {
	let client = getClient()

	client.on('a', e => {
		if (client.isConnected() && e.p._id !== client.participantId) return

		let message = e.a
		if (message.startsWith(COMMAND_PREFIX)) {
			let command = message.slice(COMMAND_PREFIX.length)
			runCommand(command)
		}
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
				sendChat(`❌ | ${error.message}`)
				console.error(error)
			}
	}
	sendChat(`Cannot find command \`${commandID}\`.`)
	return 1
}

/* tags */
export const TMOD_TAG = '**[T]:** '

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
