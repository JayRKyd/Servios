import { useLocalSearchParams } from 'expo-router'
import { PropertyDetailsScreen } from '@/screens/landlord/PropertyDetailsScreen'
export default function PropertyDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <PropertyDetailsScreen propertyId={id} />
}
