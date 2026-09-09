import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { VercelRequest, VercelResponse } from '@vercel/node'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), {
    name: 'local-crossword-api',
    apply: 'serve',
    configureServer(server) {
      // Development only: run the same handler as Vercel, without a second
      // server or a proxy back into Vercel's frontend development command.
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.split('?')[0] !== '/api/generate') return next()
        try {
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(Buffer.from(chunk))
          const raw = Buffer.concat(chunks).toString('utf8')
          let body: unknown
          try { body = raw ? JSON.parse(raw) : undefined }
          catch {
            res.statusCode = 400
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ error: 'Invalid JSON body' }))
            return
          }
          const { default: handler } = await server.ssrLoadModule('/api/generate.ts')
          const request = Object.assign(req, { body }) as VercelRequest
          const response = Object.assign(res, {
            status(code: number) { res.statusCode = code; return response },
            send(value: string) { res.end(value); return response },
          }) as VercelResponse
          await handler(request, response)
        } catch (error) {
          next(error)
        }
      })
    },
  }],
})
