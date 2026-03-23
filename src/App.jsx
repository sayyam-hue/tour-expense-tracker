import { BrowserRouter, Routes, Route } from 'react-router-dom'
import TripsScreen from './screens/TripsScreen'
import TripDetailScreen from './screens/TripDetailScreen'
import AddExpenseScreen from './screens/AddExpenseScreen'
import SummaryScreen from './screens/SummaryScreen'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TripsScreen />} />
        <Route path="/trip/:id" element={<TripDetailScreen />} />
        <Route path="/trip/:id/add" element={<AddExpenseScreen />} />
        <Route path="/trip/:id/edit/:expenseId" element={<AddExpenseScreen />} />
        <Route path="/summary" element={<SummaryScreen />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App