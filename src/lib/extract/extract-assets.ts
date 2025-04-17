import { readFiles } from '@directus/sdk'
import { ux } from '@oclif/core'
import fs from 'node:fs'
import path from 'node:path'

import { DIRECTUS_PINK } from '../constants'
import { api } from '../sdk'
import catchError from '../utils/catch-error'

async function getAssetList() {
	let response

	if (process.env.SKIP_ASSET_FOLDERS) {
		response = await api.client.request(readFiles({
			filter: {
				folder: {
					// @ts-expect-error Fix
					name: {
						_nin: process.env.SKIP_ASSET_FOLDERS.split(',')
					}
				}
			},
			limit: -1
		}))
		ux.log('Skipped extracting files from the following folders: ' + process.env.SKIP_ASSET_FOLDERS)
	} else {
		response = await api.client.request(readFiles({ limit: -1 }))
	}
	return response
}

async function downloadFile(file: any, dir: string) {
	const response: Response | string = await api.client.request(() => ({
		method: 'GET',
		path: `/assets/${file.id}`,
	}))
	const fullPath = path.join(dir, 'assets', file.filename_disk)

	if (typeof response === 'string') {
		fs.writeFileSync(fullPath, response)
	} else {
		const data = await response.arrayBuffer()
		fs.writeFileSync(fullPath, Buffer.from(data))
	}
}

export async function downloadAllFiles(dir: string) {
	ux.action.start(ux.colorize(DIRECTUS_PINK, 'Downloading assets'))
	try {
		const fullPath = path.join(dir, 'assets')
		if (path && !fs.existsSync(fullPath)) {
			fs.mkdirSync(fullPath, { recursive: true })
		}

		const fileList = await getAssetList()
		await Promise.all(fileList.map(file => downloadFile(file, dir).catch(error => {
			catchError(`Error downloading ${file.filename_disk}: ${error.message}`)
		})))
	} catch (error) {
		catchError(error)
	}

	ux.action.stop()
}
