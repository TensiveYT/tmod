/* import: settings */
import { ENABLE_LOGGING } from '../../../modules/settings/tmod/tmod-miscellaneous'

export function log(...args: string[]): void {
	if (!ENABLE_LOGGING)
		return

	let message = args.pop()

	console.log('T » ' + args.join(' » ') + ' »', message)
}
