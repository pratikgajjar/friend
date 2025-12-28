import { Routes, Route } from 'react-router-dom'
import { Landing } from './pages/Landing'
import { CreateGroup } from './pages/CreateGroup'
import { JoinGroup } from './pages/JoinGroup'
import { ChallengeBoard } from './pages/ChallengeBoard'
import { Demo } from './pages/Demo'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/create" element={<CreateGroup />} />
      <Route path="/join/:code" element={<JoinGroup />} />
      <Route path="/group/:id" element={<ChallengeBoard />} />
      <Route path="/demo" element={<Demo />} />
    </Routes>
  )
}

export default App

