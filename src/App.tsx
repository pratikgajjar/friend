import { Routes, Route } from 'react-router-dom'
import { Landing } from './pages/Landing'
import { CreateGroup } from './pages/CreateGroup'
import { JoinGroup } from './pages/JoinGroup'
import { ChallengeBoard } from './pages/ChallengeBoard'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/create" element={<CreateGroup />} />
      <Route path="/join/:code" element={<JoinGroup />} />
      <Route path="/room/:code" element={<ChallengeBoard />} />
    </Routes>
  )
}

export default App
