import fs from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Serve over HTTPS when the local mkcert certificate exists (../certs), otherwise plain HTTP.
// PAYSIM_HTTP=1 forces plain HTTP (e.g. before running `mkcert -install`).
const certDir = new URL('../certs/', import.meta.url)
const certFile = new URL('localhost.pem', certDir)
const keyFile = new URL('localhost-key.pem', certDir)
const https = process.env.PAYSIM_HTTP !== '1' && fs.existsSync(certFile) && fs.existsSync(keyFile)
  ? { cert: fs.readFileSync(certFile), key: fs.readFileSync(keyFile) }
  : undefined

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: Number(process.env.PORT) || 5173, strictPort: true, https },
})
