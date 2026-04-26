import { useAuthStore } from './store/authStore'
import { LoginPage } from './pages/LoginPage'
import { Dashboard } from './pages/Dashboard'

export default function App() {
  const token = useAuthStore(s => s.token)
  return token ? <Dashboard /> : <LoginPage />
}
