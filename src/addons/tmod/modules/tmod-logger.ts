export function log(...args: string[]): void {
	let message = args.pop()
	
	console.log('T » ' + args.join(' » ') + ' »', message)
}