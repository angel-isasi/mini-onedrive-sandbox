import UploadButton from "./UploadButton";

const links = ['Mis archivos', 'Recientes', 'Compartidos', 'Papelera']

export default function Sidebar() {
  return (
    <aside className="w-60 border-r border-gray-200 p-4 flex flex-col gap-4">
      <UploadButton />

      <nav className="flex flex-col gap-1">
        {links.map((link) => (
          <a key={link} href="#" className="px-3 py-2 rounded-md hover:bg-gray-100">
            {link}
          </a>
        ))}
      </nav>

      <div className="mt-auto text-sm text-gray-600">
        <div className="h-2 bg-gray-200 rounded-full">
          <div className="h-2 bg-blue-600 rounded-full w-1/4" />
        </div>
        <p className="mt-2">250 MB de 1 GB usados</p>
      </div>
    </aside>
  )
}