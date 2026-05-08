import { useLocalSearchParams } from 'expo-router'
import { useRole } from '@/store/store'
import { BookingDetailsScreen } from '@/screens/provider/BookingDetailsScreen'
import { BookingDetailsScreen as SharedBookingDetails } from '@/screens/shared/BookingDetailsScreen'

export default function BookingDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { activeRole } = useRole()
  if (activeRole === 'provider') return <BookingDetailsScreen bookingId={id} />
  return <SharedBookingDetails bookingId={id} />
}
