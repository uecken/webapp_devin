import { useState, useEffect } from 'react'
import './App.css'
import Game from './components/game/Game'

function App() {
  const [serverUrl, setServerUrl] = useState<string>('http://localhost:8000')

  useEffect(() => {
    if (import.meta.env.PROD) {
      setServerUrl(import.meta.env.VITE_BACKEND_URL || 'https://backend-url-placeholder.fly.dev')
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-100">
      <Game serverUrl={serverUrl} />
    </div>
  )
}

export default App
