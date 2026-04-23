
import dynamic from "next/dynamic";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  editable?: boolean;
}

const TiptapEditorClient = dynamic(() => import("@/components/ui/TiptapEditorClient"), { ssr: false });

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, editable = true }) => {
  return <TiptapEditorClient value={value} onChange={onChange} editable={editable} />;
};

export default RichTextEditor;
