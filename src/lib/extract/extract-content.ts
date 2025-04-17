import { readCollections, readItems } from '@directus/sdk'
import { ux } from '@oclif/core'

import { DIRECTUS_PINK } from '../constants'
import { api } from '../sdk'
import catchError from '../utils/catch-error'
import writeToFile from '../utils/write-to-file'

async function getCollections() {
	const response = await api.client.request(readCollections())
	return response
		.filter(item => !item.collection.startsWith('directus_', 0))
		.filter(item => item.schema != null)
		.map(i => i.collection)
}

async function getDataFromCollection(collection: string, dir: string) {
	try {
		if (process.env.NO_CONTENT) {
			const limits = process.env.NO_CONTENT.split(',')
			for (let i = 0; i < limits.length; i++) {
				const limit = limits[i]
				if (limit.includes("|")) {
					const split = limit.split("|")
					if (split[0] === collection) {
						const response = await api.client.request(readItems(collection as never,
							{
								limit: parseInt(split[1]),
							},
						),
						)
						await writeToFile(`${collection}`, response, `${dir}/content/`)
						ux.log('Extracted limited items from collection: ' + collection + ' with limit: ' + split[1])
						return
					}
				} else {
					if (limit === collection) {
						ux.log('Skipped extracting items from collection: ' + collection)
						return
					}
				}
			}
		}

		const response = await api.client.request(readItems(collection as never,
			{
				limit: -1,
			},
		),
		)
		await writeToFile(`${collection}`, response, `${dir}/content/`)
		ux.log('Extracted items from collection: ' + collection)
	} catch (error: unknown) {
		ux.warn(`Error extracting items from: ${collection}`)
		ux.warn((error as Error).message)
	}
}

export async function extractContent(dir: string) {
	ux.action.start(ux.colorize(DIRECTUS_PINK, 'Extracting content'))
	try {
		const collections = await getCollections()
		await Promise.all(collections.map(collection => getDataFromCollection(collection, dir)))
	} catch (error) {
		catchError(error)
	}

	ux.action.stop()
}
