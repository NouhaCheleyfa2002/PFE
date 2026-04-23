import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import BulletList from "@tiptap/extension-bullet-list";
import ListItem from "@tiptap/extension-list-item";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";

interface Props {
  value: string;
  onChange: (value: string) => void;
  editable?: boolean;
}

export default function TiptapEditorClient({ value, onChange, editable = true }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      BulletList,
      ListItem,
      Image.configure({ inline: false, allowBase64: true, HTMLAttributes: { class: 'tiptap-image' } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link,
    ],
    content: value,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });
  if (!editor) return null;
  return <div className="tiptap-editor"><EditorContent editor={editor} /></div>;
}
