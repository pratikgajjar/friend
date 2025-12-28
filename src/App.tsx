import { Routes, Route, useLocation } from 'react-router-dom'
import { Landing } from './pages/Landing'
import { CreateGroup } from './pages/CreateGroup'
import { JoinGroup } from './pages/JoinGroup'
import { ChallengeBoard } from './pages/ChallengeBoard'
import { Footer } from './components/Footer'

function App() {
  const location = useLocation()
  const showFooter = !location.pathname.startsWith('/room/')

  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/create" element={<CreateGroup />} />
        <Route path="/join/auth/:token" element={<JoinGroup />} />
        <Route path="/join/:code" element={<JoinGroup />} />
        <Route path="/room/:code" element={<ChallengeBoard />} />
      </Routes>
      {showFooter && <Footer />}
    </>
  )
}

export default App
