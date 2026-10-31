import Breadcrumb from '../components/Breadcrumb'
import FileList from '../components/FileList'

export default function FolderPage({ folderId }) {
  return (
    <>
      <Breadcrumb folderId={folderId} />
      <FileList folderId={folderId} />
    </>
  )
}