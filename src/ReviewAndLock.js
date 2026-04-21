import { useEffect, useState, useCallback } from "react";
import { generateClient } from "aws-amplify/api";
import { getUrl, copy, remove } from "aws-amplify/storage";
import { listContracts } from "./graphql/queries";
import { updateContract } from "./graphql/mutations";
 
const client = generateClient();
 
/* ─────────────────────────────────────────
   Helper: parse a pictureKey that might be
   a JSON string containing the real S3 path
───────────────────────────────────────── */
function parseKey(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed[0] : parsed;
  } catch {
    return raw;
  }
}
 
/* ─────────────────────────────────────────
   Small reusable action button
───────────────────────────────────────── */
function ActionBtn({ onClick, disabled, color, icon, label, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        padding: "14px 20px",
        borderRadius: 10,
        border: `1px solid ${color}44`,
        background: loading ? "#1a1a1a" : `${color}18`,
        color: disabled || loading ? "#555" : color,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        transition: "all 0.18s ease",
        minWidth: 90,
      }}
      onMouseEnter={e => {
        if (!disabled && !loading) {
          e.currentTarget.style.background = `${color}30`;
          e.currentTarget.style.borderColor = `${color}88`;
        }
      }}
      onMouseLeave={e => {
        if (!disabled && !loading) {
          e.currentTarget.style.background = `${color}18`;
          e.currentTarget.style.borderColor = `${color}44`;
        }
      }}
    >
      <span style={{ fontSize: 22 }}>{loading ? "⏳" : icon}</span>
      {label}
    </button>
  );
}
 
/* ─────────────────────────────────────────
   Confirm dialog overlay
───────────────────────────────────────── */
function ConfirmDialog({ message, detail, confirmLabel, confirmColor, onConfirm, onCancel }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#1b1b1b",
          border: "1px solid #2e2e2e",
          borderRadius: 12,
          padding: 32,
          maxWidth: 400,
          width: "90%",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 42, marginBottom: 16 }}>
          {confirmColor === "#d73a49" ? "⚠️" : "🗑️"}
        </div>
        <h3 style={{ color: "white", margin: "0 0 10px", fontSize: 18 }}>{message}</h3>
        {detail && (
          <p style={{ color: "#888", fontSize: 13, margin: "0 0 24px" }}>{detail}</p>
        )}
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "10px 24px",
              borderRadius: 8,
              background: "#2a2a2a",
              color: "#ccc",
              border: "1px solid #3a3a3a",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "10px 24px",
              borderRadius: 8,
              background: confirmColor,
              color: "white",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
 
/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export default function ReviewAndLock() {
  const [contracts, setContracts] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // 'lock'|'remove'|'delete'
  const [pdfUrl, setPdfUrl] = useState(null);
  const [confirm, setConfirm] = useState(null); // { type, contract }
  const [toast, setToast] = useState(null); // { msg, color }
 
  /* ── fetch ── */
  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.graphql({
        query: listContracts,
        variables: { limit: 1000 },
      });
      const items = res?.data?.listContracts?.items ?? [];
      // Only contracts with a pictureKey AND lock !== true
      const eligible = items.filter(c => !!c.pictureKey && !c.lock);
      setContracts(eligible);
      setIndex(0);
    } catch (e) {
      console.error("Fetch error", e);
    } finally {
      setLoading(false);
    }
  }, []);
 
  useEffect(() => { fetchContracts(); }, [fetchContracts]);
 
  /* ── resolve PDF URL whenever current contract changes ── */
  const current = contracts[index] ?? null;
 
  useEffect(() => {
    setPdfUrl(null);
    if (!current?.pictureKey) return;
    const key = parseKey(current.pictureKey);
    if (!key) return;
    getUrl({ path: key })
      .then(({ url }) => setPdfUrl(url.toString()))
      .catch(err => console.error("getUrl failed", err));
  }, [current]);
 
  /* ── keyboard navigation ── */
  useEffect(() => {
    const onKey = e => {
      if (confirm) return; // block when dialog open
      if (e.key === "ArrowRight") setIndex(i => Math.min(i + 1, contracts.length - 1));
      if (e.key === "ArrowLeft")  setIndex(i => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [contracts.length, confirm]);
 
  /* ── toast helper ── */
  function showToast(msg, color = "#238636") {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 3000);
  }
 
  /* ── advance after action (remove acted-on contract from list) ── */
  function removeFromList(contractId) {
    setContracts(prev => {
      const next = prev.filter(c => c.id !== contractId);
      setIndex(i => Math.min(i, Math.max(next.length - 1, 0)));
      return next;
    });
  }
 
  /* ── LOCK ── */
  async function handleLock(c) {
    setActionLoading("lock");
    try {
      await client.graphql({
        query: updateContract,
        variables: { input: { id: c.id, lock: true } },
      });
      showToast(`Contract ${c.contractNumber} locked ✓`, "#1f6feb");
      removeFromList(c.id);
    } catch (err) {
      console.error("Lock failed", err);
      alert("Lock failed — check console.");
    } finally {
      setActionLoading(null);
    }
  }
 
  /* ── REMOVE PDF ── */
  async function handleRemovePdf(c) {
    const srcKey = parseKey(c.pictureKey);
    const destKey = `public/unassigned/${Date.now()}_${srcKey.split("/").pop()}`;
    setActionLoading("remove");
    try {
      await copy({ source: { path: srcKey }, destination: { path: destKey } });
      await remove({ path: srcKey });
      await client.graphql({
        query: updateContract,
        variables: { input: { id: c.id, pictureKey: null } },
      });
      showToast(`PDF removed from contract ${c.contractNumber}`, "#e3b341");
      removeFromList(c.id);
    } catch (err) {
      console.error("Remove PDF failed", err);
      alert("Remove PDF failed — check console.");
    } finally {
      setActionLoading(null);
    }
  }
 
  /* ── MARK FOR DELETE ── */
  async function handleMarkDelete(c) {
    const srcKey = parseKey(c.pictureKey);
    const destKey = `public/markedDeleted/${Date.now()}_${srcKey.split("/").pop()}`;
    setActionLoading("delete");
    try {
      await copy({ source: { path: srcKey }, destination: { path: destKey } });
      await remove({ path: srcKey });
      await client.graphql({
        query: updateContract,
        variables: { input: { id: c.id, pictureKey: null } },
      });
      showToast(`Contract ${c.contractNumber} marked for deletion`, "#d73a49");
      removeFromList(c.id);
    } catch (err) {
      console.error("Mark delete failed", err);
      alert("Mark for delete failed — check console.");
    } finally {
      setActionLoading(null);
    }
  }
 
  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400, color: "#555", fontSize: 16 }}>
        Loading contracts for review…
      </div>
    );
  }
 
  if (contracts.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 400, gap: 12, color: "#555" }}>
        <span style={{ fontSize: 52 }}>✅</span>
        <span style={{ fontSize: 18 }}>No contracts pending review.</span>
        <button
          onClick={fetchContracts}
          style={{ marginTop: 8, padding: "8px 20px", borderRadius: 6, background: "#1f6feb", color: "white", border: "none", cursor: "pointer" }}
        >
          Refresh
        </button>
      </div>
    );
  }
 
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 160px)", color: "white", position: "relative" }}>
 
      {/* ── TOAST ── */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)",
          background: toast.color, color: "white", padding: "12px 28px",
          borderRadius: 8, fontWeight: 700, fontSize: 14, zIndex: 9998,
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          animation: "fadeIn 0.2s ease",
        }}>
          {toast.msg}
        </div>
      )}
 
      {/* ── CONFIRM DIALOG ── */}
      {confirm && (
        <ConfirmDialog
          message={
            confirm.type === "remove"
              ? `Remove PDF from contract ${confirm.contract.contractNumber}?`
              : `Mark contract ${confirm.contract.contractNumber} for deletion?`
          }
          detail={
            confirm.type === "remove"
              ? "The file will be moved to /unassigned and unlinked from this contract."
              : "The file will be moved to /markedDeleted and unlinked from this contract."
          }
          confirmLabel={confirm.type === "remove" ? "Remove PDF" : "Mark for Delete"}
          confirmColor={confirm.type === "remove" ? "#e3b341" : "#d73a49"}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const c = confirm.contract;
            const type = confirm.type;
            setConfirm(null);
            if (type === "remove") handleRemovePdf(c);
            else handleMarkDelete(c);
          }}
        />
      )}
 
      {/* ── HEADER BAR ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 0 14px",
        borderBottom: "1px solid #222",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <h3 style={{ margin: 0, fontSize: 17, color: "#ccc", fontWeight: 600 }}>
            Review & Lock
          </h3>
          <span style={{
            background: "#1f6feb22",
            color: "#1f6feb",
            border: "1px solid #1f6feb44",
            borderRadius: 20,
            padding: "2px 12px",
            fontSize: 13,
            fontWeight: 700,
          }}>
            {index + 1} / {contracts.length}
          </span>
        </div>
 
        <button
          onClick={fetchContracts}
          style={{ padding: "6px 14px", borderRadius: 6, background: "#2a2a2a", color: "#888", border: "1px solid #3a3a3a", cursor: "pointer", fontSize: 12 }}
        >
          ↺ Refresh
        </button>
      </div>
 
      {/* ── CONTRACT META ── */}
      <div style={{
        display: "flex",
        gap: 24,
        padding: "12px 0",
        flexShrink: 0,
        borderBottom: "1px solid #1a1a1a",
      }}>
        {[
          { label: "Contract #", value: current?.contractNumber },
          { label: "Name", value: current?.name || "—" },
          { label: "Type", value: current?.contractType || "—" },
          { label: "Commodity", value: current?.commodity || "—" },
          { label: "Quantity", value: current?.originalQuantity || "—" },
        ].map(f => (
          <div key={f.label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em" }}>{f.label}</span>
            <span style={{ fontSize: 14, color: "#ddd", fontWeight: 600 }}>{f.value}</span>
          </div>
        ))}
      </div>
 
      {/* ── MAIN AREA: PDF + ACTIONS ── */}
      <div style={{ display: "flex", flex: 1, gap: 0, minHeight: 0 }}>
 
        {/* PDF VIEWER */}
        <div style={{ flex: 1, position: "relative", background: "#0a0a0a", borderRadius: "0 0 0 8px", overflow: "hidden" }}>
          {pdfUrl ? (
            <iframe
              src={`${pdfUrl}#navpanes=0&toolbar=0&statusbar=0`}
              style={{ width: "100%", height: "100%", border: "none" }}
              title="Contract PDF"
            />
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#444", fontSize: 14 }}>
              Loading PDF…
            </div>
          )}
        </div>
 
        {/* RIGHT SIDEBAR: nav + actions */}
        <div style={{
          width: 160,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 12px",
          background: "#111",
          borderLeft: "1px solid #1e1e1e",
          gap: 12,
        }}>
 
          {/* Navigation arrows */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: "100%" }}>
            <span style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em" }}>Navigate</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setIndex(i => Math.max(i - 1, 0))}
                disabled={index === 0}
                style={{
                  width: 44, height: 44, borderRadius: 8,
                  background: index === 0 ? "#1a1a1a" : "#2a2a2a",
                  color: index === 0 ? "#333" : "#ccc",
                  border: "1px solid #2e2e2e",
                  cursor: index === 0 ? "not-allowed" : "pointer",
                  fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                ‹
              </button>
              <button
                onClick={() => setIndex(i => Math.min(i + 1, contracts.length - 1))}
                disabled={index === contracts.length - 1}
                style={{
                  width: 44, height: 44, borderRadius: 8,
                  background: index === contracts.length - 1 ? "#1a1a1a" : "#2a2a2a",
                  color: index === contracts.length - 1 ? "#333" : "#ccc",
                  border: "1px solid #2e2e2e",
                  cursor: index === contracts.length - 1 ? "not-allowed" : "pointer",
                  fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                ›
              </button>
            </div>
            <span style={{ fontSize: 11, color: "#444" }}>← → keys work too</span>
          </div>
 
          {/* Divider */}
          <div style={{ width: "100%", height: 1, background: "#1e1e1e" }} />
 
          {/* Action buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", alignItems: "center" }}>
            <span style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em" }}>Actions</span>
 
            <ActionBtn
              onClick={() => handleLock(current)}
              disabled={!current || !!actionLoading}
              loading={actionLoading === "lock"}
              color="#1f6feb"
              icon="🔒"
              label="Lock"
            />
 
            <ActionBtn
              onClick={() => setConfirm({ type: "remove", contract: current })}
              disabled={!current || !!actionLoading}
              loading={actionLoading === "remove"}
              color="#e3b341"
              icon="📤"
              label="Remove PDF"
            />
 
            <ActionBtn
              onClick={() => setConfirm({ type: "markdelete", contract: current })}
              disabled={!current || !!actionLoading}
              loading={actionLoading === "delete"}
              color="#d73a49"
              icon="🗑️"
              label="Mark Delete"
            />
          </div>
 
          {/* Progress dots */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", maxWidth: 120 }}>
            {contracts.map((_, i) => (
              <div
                key={i}
                onClick={() => setIndex(i)}
                style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: i === index ? "#1f6feb" : "#2a2a2a",
                  border: i === index ? "none" : "1px solid #333",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
              />
            ))}
          </div>
        </div>
      </div>
 
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(-8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
      `}</style>
    </div>
  );
}