export const analytics = { track: (event: string, props?: Record<string, unknown>) => console.log('[Analytics]', event, props) }
