import { useState, useRef } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/config/firebaseServices";
import { STORAGE_PATHS } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";

type UploadedFile = { name: string; url: string; uploadedAt: string };

export function PrescriptionUploadPage() {
  const { user }                      = useAuthStore();
  const [uploads, setUploads]         = useState<UploadedFile[]>([]);
  const [progress, setProgress]       = useState<number | null>(null);
  const [error, setError]             = useState("");
  const [dragging, setDragging]       = useState(false);
  const inputRef                      = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    uploadFile(files[0]);
  }

  function uploadFile(file: File) {
    if (!user?.id) return;
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setError("Only image or PDF files are allowed."); return;
    }
    setError("");
    const storageRef = ref(storage(), `${STORAGE_PATHS.PRESCRIPTIONS}/${user.id}/${Date.now()}_${file.name}`);
    const task = uploadBytesResumable(storageRef, file);
    task.on("state_changed",
      (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      () => { setError("Upload failed. Please try again."); setProgress(null); },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        setUploads((u) => [{ name: file.name, url, uploadedAt: new Date().toLocaleString() }, ...u]);
        setProgress(null);
      }
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-2">Prescription Upload</h1>
      <p className="text-text-secondary text-sm mb-6">Upload prescription images or PDFs to keep them safe in the cloud.</p>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors mb-5 ${
          dragging ? "border-primary bg-primary-pale" : "border-gray-300 hover:border-primary hover:bg-primary-pale/30"
        }`}
      >
        <div className="text-4xl mb-3">📄</div>
        <p className="font-medium text-text-primary">Drop files here or click to upload</p>
        <p className="text-sm text-text-secondary mt-1">Supports JPEG, PNG, PDF</p>
        <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden"
          onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {progress !== null && (
        <div className="mb-5">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-text-secondary">Uploading…</span>
            <span className="text-primary font-semibold">{progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {error && <div className="text-alert-red text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">{error}</div>}

      {uploads.length > 0 && (
        <div>
          <h2 className="font-bold text-text-primary mb-3">Uploaded Prescriptions</h2>
          <div className="space-y-2">
            {uploads.map((u, i) => (
              <div key={i} className="bg-card rounded-xl border border-gray-100 shadow-sm p-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📎</span>
                  <div>
                    <p className="text-sm font-medium text-text-primary truncate max-w-xs">{u.name}</p>
                    <p className="text-xs text-text-secondary">{u.uploadedAt}</p>
                  </div>
                </div>
                <a href={u.url} target="_blank" rel="noopener noreferrer"
                  className="text-primary text-sm hover:underline font-medium">View</a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
