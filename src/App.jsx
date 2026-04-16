import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Navigation from './components/Navigation.jsx'
import Dashboard from './pages/Dashboard.jsx'
import RoundList from './pages/RoundList.jsx'
import RoundForm from './pages/RoundForm.jsx'
import Guide from './pages/Guide.jsx'

export default function App() {
  return (
    <div className="app-container">
      <Navigation />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/rounds" element={<RoundList />} />
          <Route path="/rounds/new" element={<RoundForm />} />
          <Route path="/rounds/:id/edit" element={<RoundForm />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
