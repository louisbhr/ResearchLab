import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input, Textarea } from "../ui/Input";
import { useAppStore } from "../../store/useAppStore";

export default function CreateProjectDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { createProject } = useAppStore();

  const handleSave = async () => {
    if (!name.trim()) { setError("Project name is required."); return; }
    setSaving(true);
    try {
      await createProject({ name: name.trim(), description: description.trim() || undefined });
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to create project.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="New Project"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={handleSave}>Create Project</Button>
        </>
      }
    >
      <div className="space-y-3">
        <Input label="Project Name *" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Master's Thesis" />
        <Textarea label="Description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description..." rows={2} />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </Modal>
  );
}
