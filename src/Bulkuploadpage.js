import { useEffect, useRef, useState } from "react";
import { uploadData, list } from "aws-amplify/storage";
import { post } from "aws-amplify/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { key: "contracts",    label: "Contract Data" },
  { key: "transactions", label: "Transaction Data" },
];

const S3_PREFIX = {
  contracts:    "public/bulk/contracts/",
  transactions: "public/bulk/transactions/",
};

const API_NAME = "contractsAPI";
const API_PATH = "/contractsRawData";

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  root: {
    padding: "24px 20px",
    color: "white",
    fontFamily: "inherit",
  },
  heading: {
    fontSize: 20,
    fontWeight: 600,
    marginBottom: 20,
    color: "#e6edf3",
  },
  tabBar: {
    display: "flex",
    gap: 0,
    marginBottom: 24,
    borderBottom: "1px solid #30363d",
  },
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
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  uploadRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  uploadBtn: {
    padding: "9px 20px",
    background: "#1f6feb",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 500,
    fontSize: 14,
  },
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
  selectedLabel: {
    fontSize: 13,
    color: "#8b949e",
    fontStyle: "italic",
  },
  tableWrap: {
    border: "1px solid #30363d",
    borderRadius: 8,
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 14,
  },
  th: {
    background: "#161b22",
    color: "#8b949e",
    textAlign: "left",
    padding: "10px 14px",
    fontWeight: 500,
    borderBottom: "1px solid #30363d",
  },
  tr: (selected) => ({
    background: selected ? "#1c2d3f" : "transparent",
    cursor: "pointer",
  }),
  td: {
    padding: "10px 14px",
    borderBottom: "1px solid #21262d",
    color: "#c9d1d9",
  },
  checkbox: {
    width: 16,
    height: 16,
    cursor: "pointer",
    accentColor: "#1f6feb",
  },
  statusBadge: (type) => ({
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 500,
    background:
      type === "success" ? "#1a3a2a" :
      type === "error"   ? "#3a1a1a" :
                           "#1a2a3a",
    color:
      type === "success" ? "#3fb950" :
      type === "error"   ? "#f85149" :
                           "#58a6ff",
  }),
  emptyRow: {
    textAlign: "center",
    padding: "24px",
    color: "#555",
    fontSize: 13,
  },
  toast: (type) => ({
    marginTop: 4,
    padding: "10px 16px",
    borderRadius: 6,
    fontSize: 13,
    background: type === "success" ? "#1a3a2a" : "#3a1a1a",
    color:      type === "success" ? "#3fb950"  : "#f85149",
    border: `1px solid ${type === "success" ? "#238636" : "#da3633"}`,
  }),
};

// ─── BulkUploadPage ───────────────────────────────────────────────────────────

export default function BulkUploadPage() {
  const [activeTab, setActiveTab] = useState("contracts");

  return (
    <div style={styles.root}>
      <h2 style={styles.heading}>Bulk Upload</h2>

      <div style={styles.tabBar}>
        {TABS.map((t) => (
          <button
            key={t.key}
            style={styles.tab(activeTab === t.key)}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Re-mount on tab switch so each tab has its own isolated state */}
      <BulkTab key={activeTab} tabKey={activeTab} />
    </div>
  );
}

// ─── BulkTab ──────────────────────────────────────────────────────────────────

function BulkTab({ tabKey }) {
  const fileInputRef = useRef(null);

  const [s3Files, setS3Files]           = useState([]);
  const [selected, setSelected]         = useState(new Set());
  const [uploading, setUploading]       = useState(false);
  const [uploadStatus, setUploadStatus] = useState({});   // filename → "uploading"|"done"|"error"
  const [submitting, setSubmitting]     = useState(false);
  const [toast, setToast]               = useState(null); // { type, message }
  const [pendingFiles, setPendingFiles] = useState([]);

  useEffect(() => {
    loadS3Files();
  }, []);

  async function loadS3Files() {
    try {
      const result = await list({ prefix: S3_PREFIX[tabKey] });
      const items = (result?.items ?? []).filter(
        (item) => item.key !== S3_PREFIX[tabKey]
      );
      setS3Files(items);
    } catch (err) {
      console.error("Failed to list S3 files:", err);
    }
  }

  function handlePickFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setPendingFiles(files);
    e.target.value = "";
  }

  async function handleUpload() {
    if (!pendingFiles.length) return;
    setUploading(true);

    const initial = {};
    pendingFiles.forEach((f) => { initial[f.name] = "uploading"; });
    setUploadStatus((prev) => ({ ...prev, ...initial }));

    await Promise.all(
      pendingFiles.map(async (file) => {
        const key = `${S3_PREFIX[tabKey]}${file.name}`;
        try {
          await uploadData({ path: key, data: file }).result;
          setUploadStatus((prev) => ({ ...prev, [file.name]: "done" }));
        } catch (err) {
          console.error("Upload failed:", file.name, err);
          setUploadStatus((prev) => ({ ...prev, [file.name]: "error" }));
        }
      })
    );

    setUploading(false);
    setPendingFiles([]);
    await loadS3Files();
  }

  function toggleSelect(key) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === s3Files.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(s3Files.map((f) => f.key)));
    }
  }

  async function handleSubmit() {
    if (!selected.size || submitting) return;
    setSubmitting(true);
    setToast(null);

    try {
      const response = await post({
        apiName: API_NAME,
        path: API_PATH,
        options: {
          body: {
            tab: tabKey,
            files: Array.from(selected),
          },
        },
      }).response;

      const body = await response.body.json();

      setToast({
        type: "success",
        message: body?.message ?? `Successfully submitted ${selected.size} file(s).`,
      });
      setSelected(new Set());
    } catch (err) {
      console.error("Submit failed:", err);
      setToast({
        type: "error",
        message: err?.message ?? "Submission failed. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function fileName(key) {
    return key.replace(S3_PREFIX[tabKey], "");
  }

  function formatSize(bytes) {
    if (bytes == null) return "—";
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  }

  const allSelected = s3Files.length > 0 && selected.size === s3Files.length;

  return (
    <div style={styles.section}>

      {/* ── Upload controls ── */}
      <div style={styles.uploadRow}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          multiple
          style={{ display: "none" }}
          onChange={handlePickFiles}
        />

        <button
          style={styles.uploadBtn}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          📂 Choose CSV File(s)
        </button>

        {pendingFiles.length > 0 && (
          <>
            <span style={styles.selectedLabel}>
              {pendingFiles.map((f) => f.name).join(", ")}
            </span>
            <button
              style={styles.uploadBtn}
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? "Uploading…" : "⬆ Upload to S3"}
            </button>
          </>
        )}
      </div>

      {/* ── Per-file upload badges ── */}
      {Object.keys(uploadStatus).length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.entries(uploadStatus).map(([name, status]) => (
            <span
              key={name}
              style={styles.statusBadge(
                status === "done" ? "success" : status === "error" ? "error" : "loading"
              )}
            >
              {status === "done" ? "✔ " : status === "error" ? "✖ " : "⏳ "}
              {name}
            </span>
          ))}
        </div>
      )}

      {/* ── File table ── */}
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: 40 }}>
                <input
                  type="checkbox"
                  style={styles.checkbox}
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={s3Files.length === 0}
                />
              </th>
              <th style={styles.th}>File Name</th>
              <th style={styles.th}>Size</th>
              <th style={styles.th}>Last Modified</th>
            </tr>
          </thead>
          <tbody>
            {s3Files.length === 0 ? (
              <tr>
                <td colSpan={4} style={styles.emptyRow}>
                  No files found in S3. Upload a CSV above to get started.
                </td>
              </tr>
            ) : (
              s3Files.map((file) => {
                const isSelected = selected.has(file.key);
                return (
                  <tr
                    key={file.key}
                    style={styles.tr(isSelected)}
                    onClick={() => toggleSelect(file.key)}
                  >
                    <td style={styles.td} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        style={styles.checkbox}
                        checked={isSelected}
                        onChange={() => toggleSelect(file.key)}
                      />
                    </td>
                    <td style={styles.td}>{fileName(file.key)}</td>
                    <td style={styles.td}>{formatSize(file.size)}</td>
                    <td style={styles.td}>
                      {file.lastModified
                        ? new Date(file.lastModified).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Submit row ── */}
      <div style={styles.uploadRow}>
        <button
          style={styles.submitBtn(!selected.size || submitting)}
          disabled={!selected.size || submitting}
          onClick={handleSubmit}
        >
          {submitting
            ? "Submitting…"
            : selected.size
              ? `Submit Upload (${selected.size} file${selected.size > 1 ? "s" : ""})`
              : "Submit Upload"}
        </button>

        {selected.size > 0 && !submitting && (
          <span style={styles.selectedLabel}>
            {selected.size} file{selected.size > 1 ? "s" : ""} selected
          </span>
        )}
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div style={styles.toast(toast.type)}>
          {toast.type === "success" ? "✔ " : "✖ "}
          {toast.message}
        </div>
      )}
    </div>
  );
}
