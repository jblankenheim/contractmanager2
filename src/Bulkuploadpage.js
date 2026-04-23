import { useEffect, useRef, useState } from "react";
import { uploadData, remove, list } from "aws-amplify/storage";
import { post } from "aws-amplify/api";

// ─── Constants ────────────────────────────────────────────────────────────────
const TABS = [
  { key: "contracts", label: "Contract Data" },
  { key: "transactions", label: "Transaction Data" },
  { key: "pdfs", label: "Contract PDFs" }, // New Tab
];

const S3_PREFIX = {
  contracts: "public/bulk/contracts/",
  transactions: "public/bulk/transactions/",
  pdfs: "public/bulkPDF/", // New Prefix
};

const API_NAME = "contractsAPI";

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = {
  root: { padding: "24px 20px", color: "white", fontFamily: "inherit" },
  heading: { fontSize: 20, fontWeight: 600, marginBottom: 20, color: "#e6edf3" },
  tabBar: { display: "flex", gap: 0, marginBottom: 24, borderBottom: "1px solid #30363d" },
  tab: (active) => ({
    padding: "10px 24px",
    background: "transparent",
    color: active ? "#58a6ff" : "#8b949e",
    border: "none",
    borderBottom: active ? "2px solid #58a6ff" : "2px solid transparent",
    cursor: "pointer",
    fontWeight: active ? 600 : 400,
    fontSize: 14,
    marginBottom: -1,
    transition: "color 0.15s, border-color 0.15s",
  }),
  section: { display: "flex", flexDirection: "column", gap: 20 },
  uploadRow: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  uploadBtn: { padding: "9px 20px", background: "#1f6feb", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 500, fontSize: 14 },
  submitBtn: (disabled) => ({
    padding: "9px 20px",
    background: disabled ? "#2a2a2a" : "#238636",
    color: disabled ? "#555" : "white",
    border: "none",
    borderRadius: 6,
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 500,
    fontSize: 14,
  }),
  tableWrap: { border: "1px solid #30363d", borderRadius: 8, overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { background: "#161b22", color: "#8b949e", textAlign: "left", padding: "10px 14px", fontWeight: 500, borderBottom: "1px solid #30363d" },
  tr: (selected) => ({ background: selected ? "#1c2d3f" : "transparent", cursor: "pointer" }),
  td: { padding: "10px 14px", borderBottom: "1px solid #21262d", color: "#c9d1d9" },
  emptyRow: { textAlign: "center", padding: "24px", color: "#555", fontSize: 13 },
  toast: (type) => ({
    marginTop: 4,
    padding: "10px 16px",
    borderRadius: 6,
    fontSize: 13,
    background: type === "success" ? "#1a3a2a" : "#3a1a1a",
    color: type === "success" ? "#3fb950" : "#f85149",
    border: `1px solid ${type === "success" ? "#238636" : "#da3633"}`,
  }),
};

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function BulkUploadPage() {
  const [activeTab, setActiveTab] = useState("contracts");

  return (
    <div style={styles.root}>
      <h2 style={styles.heading}>Bulk Upload Manager</h2>
      <div style={styles.tabBar}>
        {TABS.map((t) => (
          <button key={t.key} style={styles.tab(activeTab === t.key)} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      <BulkTab key={activeTab} tabKey={activeTab} />
    </div>
  );
}

// ─── Tab Component ───────────────────────────────────────────────────────────
function BulkTab({ tabKey }) {
  const fileInputRef = useRef(null);
  const [s3Files, setS3Files] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]);

  const API_PATHS = {
    contracts: "/rawContractData",
    transactions: "/rawTransactionsData",
    pdfs: null, // PDFs don't use a processing API in this requirement
  };

  useEffect(() => {
    loadS3Files();
  }, [tabKey]);

  async function loadS3Files() {
    try {
      const result = await list({ path: S3_PREFIX[tabKey] });
      const items = (result?.items ?? []).filter(item => item.path !== S3_PREFIX[tabKey]);
      setS3Files(items);
    } catch (err) {
      console.error(err);
    }
  }

  function handlePickFiles(e) {
    const files = Array.from(e.target.files || []);
    if (files.length) setPendingFiles(files);
    e.target.value = "";
  }

  async function handleUpload() {
    if (!pendingFiles.length) return;
    setUploading(true);
    try {
      await Promise.all(pendingFiles.map(async (file) => {
        // Append Date.now() to filename for PDFs tab, use standard for others
        const fileName = tabKey === 'pdfs' ? `${Date.now()}-${file.name}` : file.name;
        const key = `${S3_PREFIX[tabKey]}${fileName}`;
        
        await uploadData({ 
          path: key, 
          data: file,
          options: { contentType: file.type } 
        }).result;
      }));
      
      setToast({ type: "success", message: "Uploads complete!" });
      setPendingFiles([]);
      await loadS3Files();
    } catch (err) {
      setToast({ type: "error", message: "Upload failed." });
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(path) {
    if (!window.confirm("Delete file?")) return;
    try {
      await remove({ path });
      if (selectedFile === path) setSelectedFile(null);
      await loadS3Files();
    } catch (err) {
      setToast({ type: "error", message: "Delete failed." });
    }
  }

  async function handleSubmit() {
    if (!selectedFile || submitting) return;
    setSubmitting(true);
    try {
      const response = await post({
        apiName: API_NAME,
        path: API_PATHS[tabKey],
        options: { body: { file: selectedFile } },
      }).response;
      const resJson = await response.body.json();
      setToast({ type: "success", message: resJson.message || "Processed!" });
      setSelectedFile(null);
    } catch (err) {
      setToast({ type: "error", message: "Failed." });
    } finally {
      setSubmitting(false);
    }
  }

  function formatSize(bytes) {
    if (!bytes) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + " " + ["B", "KB", "MB", "GB"][i];
  }

  return (
    <div style={styles.section}>
      <div style={styles.uploadRow}>
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: "none" }} 
          multiple 
          accept={tabKey === 'pdfs' ? "application/pdf,image/*" : ".csv,.json"}
          onChange={handlePickFiles} 
        />
        
        <button style={styles.uploadBtn} onClick={() => fileInputRef.current.click()}>
          {tabKey === 'pdfs' ? "Pick PDFs/Images" : "Pick Files"}
        </button>

        {pendingFiles.length > 0 && (
          <button style={styles.submitBtn(uploading)} onClick={handleUpload}>
            {uploading ? "Uploading..." : `Upload to S3 (${pendingFiles.length})`}
          </button>
        )}

        {/* Hide "Process" button for PDFs tab since they are just storage targets */}
        {tabKey !== 'pdfs' && (
          <button style={styles.submitBtn(!selectedFile || submitting)} onClick={handleSubmit}>
            {submitting ? "Processing..." : `Process ${tabKey}`}
          </button>
        )}
      </div>

      {toast && <div style={styles.toast(toast.type)}>{toast.message}</div>}

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 40 }}>{tabKey !== 'pdfs' ? 'Select' : '#'}</th>
              <th style={styles.th}>Filename</th>
              <th style={styles.th}>Size</th>
              <th style={styles.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {s3Files.length === 0 ? (
              <tr><td colSpan="4" style={styles.emptyRow}>No files found.</td></tr>
            ) : (
              s3Files.map((file, idx) => (
                <tr 
                  key={file.path} 
                  style={styles.tr(selectedFile === file.path)} 
                  onClick={() => tabKey !== 'pdfs' && setSelectedFile(file.path === selectedFile ? null : file.path)}
                >
                  <td style={styles.td}>
                    {tabKey !== 'pdfs' ? (
                      <input type="checkbox" checked={selectedFile === file.path} readOnly />
                    ) : (
                      idx + 1
                    )}
                  </td>
                  <td style={styles.td}>{file.path.split('/').pop()}</td>
                  <td style={styles.td}>{formatSize(file.size)}</td>
                  <td style={styles.td}>
                    <button 
                      style={{ ...styles.uploadBtn, background: '#30363d', color: '#f85149', padding: '6px 12px' }} 
                      onClick={(e) => { e.stopPropagation(); handleDelete(file.path); }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
