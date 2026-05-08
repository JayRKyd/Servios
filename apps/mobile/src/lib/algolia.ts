import algoliasearch from 'algoliasearch'

const appId     = process.env.EXPO_PUBLIC_ALGOLIA_APP_ID  ?? ''
const searchKey = process.env.EXPO_PUBLIC_ALGOLIA_SEARCH_KEY ?? ''

export const searchClient = algoliasearch(appId, searchKey)
export const PROVIDERS_INDEX = 'providers'
export const algoliaConfigured = Boolean(appId && searchKey)
