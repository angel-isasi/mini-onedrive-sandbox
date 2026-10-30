import Sidebar from './components/Sidebar'

export default function App() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-semibold">Mis archivos</h1>
      </main>
    </div>
  )
}