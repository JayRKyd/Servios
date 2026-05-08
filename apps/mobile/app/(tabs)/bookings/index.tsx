import { useRole } from '@/store/store'
import { CustomerBookingsScreen } from '@/screens/customer/CustomerBookingsScreen'
import { BookingRequestsScreen } from '@/screens/provider/BookingRequestsScreen'
import { View, Text } from 'react-native'

export default function BookingsTab() {
  const { activeRole } = useRole()
  switch (activeRole) {
    case 'customer': return <CustomerBookingsScreen />
    case 'provider': return <BookingRequestsScreen />
    default: return <View><Text>Bookings</Text></View>
  }
}
