import { useRole } from '@/store/store'
import { MaintenanceRequestsScreen } from '@/screens/landlord/MaintenanceRequestsScreen'
import { MaintenanceHistoryScreen } from '@/screens/tenant/MaintenanceHistoryScreen'
import { View, Text } from 'react-native'
export default function MaintenanceTab() {
  const { activeRole } = useRole()
  switch (activeRole) {
    case 'landlord': return <MaintenanceRequestsScreen />
    case 'tenant': return <MaintenanceHistoryScreen />
    default: return <View><Text>Maintenance</Text></View>
  }
}
