const headers = {
	'Cross-Origin-Embedder-Policy': 'require-corp',
	'Cross-Origin-Opener-Policy': 'same-origin',
	'Cross-Origin-Resource-Policy': 'cross-origin',
}

Bun.serve({
	port: 3000,

	async fetch(req) {
		let url = new URL(req.url)
		let path = `./client${url.pathname === '/' ? '/index.html' : url.pathname}`

		let file = Bun.file(path)

		if (await file.exists()) {
			return new Response(file, { headers })
		}

		return new Response('Not Found', { status: 404 })
	},
})

console.log('Server running at http://localhost:3000')
