'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import CharacterCount from '@tiptap/extension-character-count'
import { 
  Bold, Italic, List, ListOrdered, Quote, Image as ImageIcon, 
  Heading1, Heading2, Code, Undo, Redo 
} from 'lucide-react'

interface ArticleEditorProps {
  content: string;
  onChange: (content: string) => void;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null

  const addImage = () => {
    const url = window.prompt('URL de l\'image')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-[#1A1A1A] bg-[#0D0D0D] sticky top-0 z-10">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-2 rounded hover:bg-[#1A1A1A] ${editor.isActive('bold') ? 'text-[#D4AF37] bg-[#1A1A1A]' : 'text-gray-500'}`}
      >
        <Bold size={18} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-2 rounded hover:bg-[#1A1A1A] ${editor.isActive('italic') ? 'text-[#D4AF37] bg-[#1A1A1A]' : 'text-gray-500'}`}
      >
        <Italic size={18} />
      </button>
      <div className="w-px h-6 bg-[#1A1A1A] mx-1 self-center" />
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`p-2 rounded hover:bg-[#1A1A1A] ${editor.isActive('heading', { level: 1 }) ? 'text-[#D4AF37] bg-[#1A1A1A]' : 'text-gray-500'}`}
      >
        <Heading1 size={18} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-2 rounded hover:bg-[#1A1A1A] ${editor.isActive('heading', { level: 2 }) ? 'text-[#D4AF37] bg-[#1A1A1A]' : 'text-gray-500'}`}
      >
        <Heading2 size={18} />
      </button>
      <div className="w-px h-6 bg-[#1A1A1A] mx-1 self-center" />
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-2 rounded hover:bg-[#1A1A1A] ${editor.isActive('bulletList') ? 'text-[#D4AF37] bg-[#1A1A1A]' : 'text-gray-500'}`}
      >
        <List size={18} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-2 rounded hover:bg-[#1A1A1A] ${editor.isActive('orderedList') ? 'text-[#D4AF37] bg-[#1A1A1A]' : 'text-gray-500'}`}
      >
        <ListOrdered size={18} />
      </button>
      <div className="w-px h-6 bg-[#1A1A1A] mx-1 self-center" />
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-2 rounded hover:bg-[#1A1A1A] ${editor.isActive('blockquote') ? 'text-[#D4AF37] bg-[#1A1A1A]' : 'text-gray-500'}`}
      >
        <Quote size={18} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={`p-2 rounded hover:bg-[#1A1A1A] ${editor.isActive('codeBlock') ? 'text-[#D4AF37] bg-[#1A1A1A]' : 'text-gray-500'}`}
      >
        <Code size={18} />
      </button>
      <button onClick={addImage} className="p-2 rounded hover:bg-[#1A1A1A] text-gray-500">
        <ImageIcon size={18} />
      </button>
      <div className="flex-1" />
      <button onClick={() => editor.chain().focus().undo().run()} className="p-2 text-gray-500 hover:text-white">
        <Undo size={18} />
      </button>
      <button onClick={() => editor.chain().focus().redo().run()} className="p-2 text-gray-500 hover:text-white">
        <Redo size={18} />
      </button>
    </div>
  )
}

export default function ArticleEditor({ content, onChange }: ArticleEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Commencez à écrire votre article...',
      }),
      Image,
      CharacterCount,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[400px] p-6 text-gray-300',
      },
    },
  })

  return (
    <div className="border border-[#1A1A1A] rounded-xl overflow-hidden bg-[#0A0A0A]">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
      <div className="px-4 py-2 border-t border-[#1A1A1A] bg-[#0D0D0D] flex justify-between items-center text-[10px] font-bold text-gray-600 uppercase tracking-widest">
        <span>TipTap Rich Editor</span>
        <span>{editor?.storage.characterCount.characters()} caractères</span>
      </div>
    </div>
  )
}
