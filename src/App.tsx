import { useState } from 'react'
import HomeView from './dynamics/HomeView'
import DynamicsView from './dynamics/DynamicsView'
import ForcesView from './dynamics/ForcesView'
import RelationsView from './dynamics/RelationsView'
import type { View } from './dynamics/Chrome'

export default function App() {
  const [view, setView] = useState<View>('home')
  if (view === 'home') return <HomeView onView={setView} />
  if (view === 'forces') return <ForcesView view={view} onView={setView} />
  if (view === 'relations') return <RelationsView view={view} onView={setView} />
  return <DynamicsView view={view} onView={setView} />
}
