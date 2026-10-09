import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginScreen } from './components/LoginScreen'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Register } from './components/Register'
import AdminHome from './pages/admin/AdminHome'
import AdminTracking from './pages/admin/AdminTracking'
import CreateOrder from './pages/admin/CreateOrder'
import RiderHome from './pages/rider/RiderHome'
import RiderLayout from './pages/rider/RiderLayout'
import RiderTrip from './pages/rider/RiderTrip'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/login" replace />} />

      <Route path="/admin/login" element={<LoginScreen role="admin" />} />
      <Route path="/admin/register" element={<Register role="admin" />} />
      <Route path="/admin" element={<ProtectedRoute role="admin"><AdminHome /></ProtectedRoute>} />
      <Route path="/admin/orders/new" element={<ProtectedRoute role="admin"><CreateOrder /></ProtectedRoute>} />
      <Route path="/admin/track/:trackingNumber" element={<ProtectedRoute role="admin"><AdminTracking /></ProtectedRoute>} />

      <Route path="/rider/login" element={<LoginScreen role="rider" />} />
      <Route element={<ProtectedRoute role="rider"><RiderLayout /></ProtectedRoute>}>
        <Route path="/rider" element={<RiderHome />} />
        <Route path="/rider/trips/:trackingNumber" element={<RiderTrip />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
