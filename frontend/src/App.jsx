import Sidebar from './components/Sidebar'
import FileList from './components/FileList'
import { files } from './mocks/files'

export default function App() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-semibold">Mis archivos</h1>
        <FileList files={files} />
      </main>
    </div>
  )
}