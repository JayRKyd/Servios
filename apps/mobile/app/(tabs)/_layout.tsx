import { Tabs, router } from 'expo-router'
import { useStore, useRole } from '@/store/store'
import { useEffect } from 'react'
import type { Role } from '@/types'

interface TabConfig {
  name: string
  title: string
  href: string | null
}

function getTabsForRole(role: Role): TabConfig[] {
  const shared: TabConfig[] = [
    { name: 'messages/index', title: 'Messages', href: null },
    { name: 'settings/index', title: 'Settings', href: null },
  ]

  switch (role) {
    case 'customer':
      return [
        { name: 'index', title: 'Home', href: null },
        { name: 'search', title: 'Search', href: null },
        { name: 'bookings/index', title: 'Bookings', href: null },
        ...shared,
      ]
    case 'provider':
      return [
        { name: 'index', title: 'Home', href: null },
        { name: 'bookings/index', title: 'Requests', href: null },
        { name: 'calendar', title: 'Calendar', href: null },
        { name: 'earnings', title: 'Earnings', href: null },
        ...shared,
      ]
    case 'landlord':
      return [
        { name: 'index', title: 'Home', href: null },
        { name: 'properties/index', title: 'Properties', href: null },
        { name: 'maintenance/index', title: 'Maintenance', href: null },
        ...shared,
      ]
    case 'tenant':
      return [
        { name: 'index', title: 'Home', href: null },
        { name: 'maintenance/index', title: 'Maintenance', href: null },
        ...shared,
      ]
    case 'admin':
      return [
        { name: 'index', title: 'Dashboard', href: null },
        ...shared,
      ]
  }
}

// All possible tab names across all roles
const ALL_TABS = [
  'index',
  'search',
  'bookings/index',
  'calendar',
  'earnings',
  'properties/index',
  'maintenance/index',
  'messages/index',
  'settings/index',
]

export default function TabsLayout() {
  const isAuthenticated = useStore((s) => s.isAuthenticated)
  const { activeRole } = useRole()

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/login')
    }
  }, [isAuthenticated])

  const activeTabs = getTabsForRole(activeRole)
  const activeTabNames = new Set(activeTabs.map((t) => t.name))

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      {ALL_TABS.map((name) => {
        const config = activeTabs.find((t) => t.name === name)
        const isActive = activeTabNames.has(name)
        return (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title: config?.title ?? name,
              href: isActive ? undefined : null, // null hides the tab
            }}
          />
        )
      })}
    </Tabs>
  )
}
