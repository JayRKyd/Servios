import { useLocalSearchParams } from 'expo-router'
import { MaintenanceDetailsScreen } from '@/screens/landlord/MaintenanceDetailsScreen'
export default function MaintenanceDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <MaintenanceDetailsScreen requestId={id} />
}
