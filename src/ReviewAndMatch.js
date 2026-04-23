import { useEffect, useState, useCallback, useRef } from "react";
import { generateClient } from "aws-amplify/api";
import { getUrl, copy, remove, list } from "aws-amplify/storage";
import { listContracts } from "./graphql/queries";
import { updateContract } from "./graphql/mutations";
import { post } from 'aws-amplify/api'; 

const client = generateClient();

function parseKey(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed[0] : parsed;
  } catch {
    return raw;
  }
}

/* ── small reusable pill badge ── */
function Badge({ children, color = "#1f6feb" }) {
  return (
    <span style={{
      background: `${color}22`,
      color,
      border: `1px solid ${color}44`,
      borderRadius: 20,
      padding: "2px 10px",
      fontSize: 12,
      fontWeight: 700,
    }}>{children}</span>
  );
}

/* ── action button ── */
function ActionBtn({ onClick, disabled, color, icon, label, loading, small }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: "flex",
        flexDirection: small ? "row" : "column",
        alignItems: "center",
        gap: small ? 6 : 5,
        padding: small ? "8px 14px" : "12px 16px",
        borderRadius: 8,
        border: `1px solid ${color}44`,
        background: loading ? "#1a1a1a" : `${color}18`,
        color: disabled || loading ? "#444" : color,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        fontSize: small ? 12 : 11,
        fontWeight: 600,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        transition: "all 0.15s ease",
        whiteSpace: "nowrap",
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
      <span style={{ fontSize: small ? 14 : 18 }}>{loading ? "⏳" : icon}</span>
      {label}
    </button>
  );
}

/* ── toast ── */
function Toast({ msg, color }) {
  return (
    <div style={{
      position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)",
      background: color, color: "white", padding: "12px 28px",
      borderRadius: 8, fontWeight: 700, fontSize: 14, zIndex: 9998,
      boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
      animation: "fadeIn 0.2s ease",
      pointerEvents: "none",
    }}>
      {msg}
    </div>
  );
}

/* ── confirm dialog ── */
function ConfirmDialog({ message, detail, confirmLabel, confirmColor, onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
      zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#1b1b1b", border: "1px solid #2e2e2e",
        borderRadius: 12, padding: 32, maxWidth: 420, width: "90%", textAlign: "center",
      }}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>⚠️</div>
        <h3 style={{ color: "white", margin: "0 0 10px", fontSize: 17 }}>{message}</h3>
        {detail && <p style={{ color: "#777", fontSize: 13, margin: "0 0 24px" }}>{detail}</p>}
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onCancel} style={{
            padding: "9px 22px", borderRadius: 7, background: "#2a2a2a",
            color: "#bbb", border: "1px solid #3a3a3a", cursor: "pointer", fontSize: 13,
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            padding: "9px 22px", borderRadius: 7, background: confirmColor,
            color: "white", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
          }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export default function ReviewAndMatch() {
  // ── unassigned PDFs (carousel)
  const [unassigned, setUnassigned]         = useState([]);   // [{ key, url }]
  const [carouselIdx, setCarouselIdx]       = useState(0);
  const [carouselLoading, setCarouselLoading] = useState(true);

  // ── contracts (right panel)
  const [contracts, setContractsState]      = useState([]);
  const [contractsLoading, setContractsLoading] = useState(true);
  const [search, setSearch]                 = useState("");
  const [selectedContract, setSelectedContract] = useState(null);
  const [contractPdfUrl, setContractPdfUrl] = useState(null);
  const [contractPdfLoading, setContractPdfLoading] = useState(false);

  
  const [actionLoading, setActionLoading]   = useState(null);
  const [confirm, setConfirm]               = useState(null);
  const [toast, setToast]                   = useState(null);

  const searchRef = useRef(null);

  
  function showToast(msg, color = "#238636") {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 3200);
  }

 
  const loadUnassigned = useCallback(async () => {
    setCarouselLoading(true);
    try {
      const result = await list({ path: "public/unassigned/", options: { listAll: true } });
      const items = (result.items ?? []).filter(i => i.path !== "public/unassigned/");
      const withUrls = await Promise.all(
        items.map(async item => {
          try {
            const { url } = await getUrl({ path: item.path });
            return { key: item.path, url: url.toString(), filename: item.path.split("/").pop() };
          } catch {
            return null;
          }
        })
      );
      const valid = withUrls.filter(Boolean);
      setUnassigned(valid);
      setCarouselIdx(0);
    } catch (err) {
      console.error("Failed to list unassigned", err);
    } finally {
      setCarouselLoading(false);
    }
  }, []);

  /* ─────────── load contracts ─────────── */
  const loadContracts = useCallback(async () => {
    setContractsLoading(true);
    try {
      const res = await client.graphql({
        query: listContracts,
        variables: { limit: 1000 },
      });
      const items = res?.data?.listContracts?.items ?? [];
      setContractsState(items);
    } catch (err) {
      console.error("Failed to load contracts", err);
    } finally {
      setContractsLoading(false);
    }
  }, []);

  useEffect(() => { loadUnassigned(); loadContracts(); }, [loadUnassigned, loadContracts]);

  /* ─────────── resolve selected contract PDF ─────────── */
  useEffect(() => {
    setContractPdfUrl(null);
    if (!selectedContract?.pictureKey) return;
    const key = parseKey(selectedContract.pictureKey);
    if (!key) return;
    setContractPdfLoading(true);
    getUrl({ path: key })
      .then(({ url }) => setContractPdfUrl(url.toString()))
      .catch(err => console.error("getUrl contract failed", err))
      .finally(() => setContractPdfLoading(false));
  }, [selectedContract]);

  /* ─────────── keyboard nav for carousel ─────────── */
  useEffect(() => {
    const onKey = e => {
      if (confirm) return;
      if (document.activeElement === searchRef.current) return;
      if (e.key === "ArrowLeft")  setCarouselIdx(i => Math.max(i - 1, 0));
      if (e.key === "ArrowRight") setCarouselIdx(i => Math.min(i + 1, unassigned.length - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [unassigned.length, confirm]);

  /* ─────────── helpers ─────────── */
  const currentPdf = unassigned[carouselIdx] ?? null;

  function removeCarouselItem(key) {
    setUnassigned(prev => {
      const next = prev.filter(u => u.key !== key);
      setCarouselIdx(i => Math.min(i, Math.max(next.length - 1, 0)));
      return next;
    });
  }

  const filteredContracts = contracts.filter(c => {
    const q = search.toLowerCase();
    return (
      (c.contractNumber ?? "").toLowerCase().includes(q) ||
      (c.name ?? "").toLowerCase().includes(q) ||
      (c.contractType ?? "").toLowerCase().includes(q) ||
      (c.commodity ?? "").toLowerCase().includes(q)
    );
  });

  /* ════════════════════════════════════════
     ACTIONS
  ════════════════════════════════════════ */

  /* Send carousel PDF → public/unassigned/date_filename (rename / re-stamp) */
  async function handleCarouselToUnassigned() {
    if (!currentPdf) return;
    const srcKey = currentPdf.key;
    const destKey = `public/unassigned/${Date.now()}_${srcKey.split("/").pop()}`;
    setActionLoading("unassigned");
    try {
      await copy({ source: { path: srcKey }, destination: { path: destKey } });
      await remove({ path: srcKey });
      showToast("PDF moved back to unassigned", "#888");
      removeCarouselItem(srcKey);
    } catch (err) {
      console.error(err);
      alert("Move to unassigned failed — check console.");
    } finally {
      setActionLoading(null);
    }
  }

  /* Send carousel PDF → public/markedDeleted/date_filename */
  async function handleCarouselMarkDelete() {
    if (!currentPdf) return;
    const srcKey = currentPdf.key;
    const destKey = `public/markedDeleted/${Date.now()}_${srcKey.split("/").pop()}`;
    setActionLoading("cdelete");
    try {
      await copy({ source: { path: srcKey }, destination: { path: destKey } });
      await remove({ path: srcKey });
      showToast("Carousel PDF marked for deletion", "#d73a49");
      removeCarouselItem(srcKey);
    } catch (err) {
      console.error(err);
      alert("Mark delete failed — check console.");
    } finally {
      setActionLoading(null);
    }
  }

  /*
    Attach carousel PDF to selected contract.
    - If contract already has a PDF: move existing → public/unassigned/date_old.pdf
    - Move carousel PDF → same path as old key  OR  a new contract-named path if no existing key
    - Update contract.pictureKey via GraphQL
  */
  async function handleAttachToContract() {
    if (!currentPdf || !selectedContract) return;
    const carouselKey = currentPdf.key;
    const existingKey = selectedContract.pictureKey ? parseKey(selectedContract.pictureKey) : null;

    // Decide destination for carousel file.
    // If contract already had a key, we reuse that key path (so nothing else breaks).
    // Otherwise create a sensible path.
    const newContractKey = existingKey
      ? existingKey
      : `public/contracts/${selectedContract.id}_${carouselKey.split("/").pop()}`;

    setActionLoading("attach");
    try {
      // 1. If contract had an existing PDF, move it to unassigned first
      if (existingKey) {
        const rescueKey = `public/unassigned/${Date.now()}_replaced_${existingKey.split("/").pop()}`;
        await copy({ source: { path: existingKey }, destination: { path: rescueKey } });
        await remove({ path: existingKey });
      }

      // 2. Move carousel PDF into contract's key slot
      await copy({ source: { path: carouselKey }, destination: { path: newContractKey } });
      await remove({ path: carouselKey });

      // 3. Update GraphQL
      await client.graphql({
        query: updateContract,
        variables: { input: { id: selectedContract.id, pictureKey: newContractKey } },
      });

      showToast(`PDF attached to contract ${selectedContract.contractNumber} ✓`, "#238636");
      removeCarouselItem(carouselKey);

      // Refresh selected contract's local data
      setContractsState(prev =>
        prev.map(c => c.id === selectedContract.id
          ? { ...c, pictureKey: newContractKey }
          : c
        )
      );
      setSelectedContract(prev => prev ? { ...prev, pictureKey: newContractKey } : prev);
    } catch (err) {
      console.error(err);
      alert("Attach failed — check console.");
    } finally {
      setActionLoading(null);
    }
  }

  /* Lock selected contract */
async function handleLockContract() {
  if (!selectedContract) return;
  setActionLoading("lock");
  
  try {
    // 1. GraphQL Update
    await client.graphql({
      query: updateContract,
      variables: { input: { id: selectedContract.id, locked: true } },
    });

    // 2. REST API Trigger - Corrected 'c.id' to 'selectedContract.id'
    try {
      const restOperation = post({
        apiName: 'contractsAPI',
        path: '/runTransactions',
        options: {
          body: { contractID: selectedContract.id } // Fixed variable name
        }
      });
      
      await restOperation.response;
      console.log("Transaction process triggered for:", selectedContract.id);
    } catch (apiErr) {
      console.error("API Trigger failed, but contract was locked:", apiErr);
    }

    // 3. UI Updates
    showToast(`Contract ${selectedContract.contractNumber} locked ✓`, "#1f6feb");
    
    setContractsState(prev => 
      prev.map(c => c.id === selectedContract.id ? { ...c, locked: true } : c)
    );
    setSelectedContract(prev => prev ? { ...prev, locked: true } : prev);

  } catch (err) {
    console.error(err);
    alert("Lock failed — check console.");
  } finally {
    setActionLoading(null);
  }
}

  /* Remove PDF from selected contract */
  async function handleRemoveContractPdf() {
    if (!selectedContract?.pictureKey) return;
    const srcKey = parseKey(selectedContract.pictureKey);
    const destKey = `public/unassigned/${Date.now()}_${srcKey.split("/").pop()}`;
    setActionLoading("cremove");
    try {
      await copy({ source: { path: srcKey }, destination: { path: destKey } });
      await remove({ path: srcKey });
      await client.graphql({
        query: updateContract,
        variables: { input: { id: selectedContract.id, pictureKey: null } },
      });
      showToast(`PDF removed from contract ${selectedContract.contractNumber}`, "#e3b341");
      setContractPdfUrl(null);
      setContractsState(prev => prev.map(c =>
        c.id === selectedContract.id ? { ...c, pictureKey: null } : c
      ));
      setSelectedContract(prev => prev ? { ...prev, pictureKey: null } : prev);
    } catch (err) {
      console.error(err);
      alert("Remove PDF failed — check console.");
    } finally {
      setActionLoading(null);
    }
  }

  /* Mark contract PDF for deletion */
  async function handleMarkDeleteContractPdf() {
    if (!selectedContract?.pictureKey) return;
    const srcKey = parseKey(selectedContract.pictureKey);
    const destKey = `public/markedDeleted/${Date.now()}_${srcKey.split("/").pop()}`;
    setActionLoading("cmarkdelete");
    try {
      await copy({ source: { path: srcKey }, destination: { path: destKey } });
      await remove({ path: srcKey });
      await client.graphql({
        query: updateContract,
        variables: { input: { id: selectedContract.id, pictureKey: null } },
      });
      showToast(`Contract ${selectedContract.contractNumber} PDF marked for deletion`, "#d73a49");
      setContractPdfUrl(null);
      setContractsState(prev => prev.map(c =>
        c.id === selectedContract.id ? { ...c, pictureKey: null } : c
      ));
      setSelectedContract(prev => prev ? { ...prev, pictureKey: null } : prev);
    } catch (err) {
      console.error(err);
      alert("Mark delete failed — check console.");
    } finally {
      setActionLoading(null);
    }
  }

  /* ════════════════════════════════════════
     RENDER
  ════════════════════════════════════════ */
  const busy = !!actionLoading;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "calc(100vh - 220px)",
      color: "white",
      position: "relative",
      minHeight: 0,
    }}>

      {/* TOAST */}
      {toast && <Toast msg={toast.msg} color={toast.color} />}

      {/* CONFIRM */}
      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          detail={confirm.detail}
          confirmLabel={confirm.label}
          confirmColor={confirm.color}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const fn = confirm.fn;
            setConfirm(null);
            fn();
          }}
        />
      )}

      {/* ── TWO-PANEL LAYOUT ── */}
      <div style={{ display: "flex", flex: 1, gap: 0, minHeight: 0 }}>

        {/* ══ LEFT: CAROUSEL ══ */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid #1e1e1e",
          minHeight: 0,
        }}>

          {/* Carousel header */}
          <div style={{
            padding: "10px 16px",
            borderBottom: "1px solid #1e1e1e",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            background: "#0d0d0d",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, color: "#aaa", fontWeight: 600 }}>📂 Unassigned PDFs</span>
              {!carouselLoading && <Badge color="#e3b341">{unassigned.length}</Badge>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Nav */}
              <button
                onClick={() => setCarouselIdx(i => Math.max(i - 1, 0))}
                disabled={carouselIdx === 0 || carouselLoading}
                style={navBtnStyle(carouselIdx === 0 || carouselLoading)}
              >‹</button>
              <span style={{ fontSize: 12, color: "#555", minWidth: 50, textAlign: "center" }}>
                {unassigned.length > 0 ? `${carouselIdx + 1} / ${unassigned.length}` : "0 / 0"}
              </span>
              <button
                onClick={() => setCarouselIdx(i => Math.min(i + 1, unassigned.length - 1))}
                disabled={carouselIdx >= unassigned.length - 1 || carouselLoading}
                style={navBtnStyle(carouselIdx >= unassigned.length - 1 || carouselLoading)}
              >›</button>
              <button
                onClick={loadUnassigned}
                style={{ padding: "4px 10px", borderRadius: 5, background: "#1e1e1e", color: "#666", border: "1px solid #2e2e2e", cursor: "pointer", fontSize: 11 }}
              >↺</button>
            </div>
          </div>

          {/* Filename strip */}
          {currentPdf && (
            <div style={{
              padding: "6px 16px",
              background: "#0a0a0a",
              borderBottom: "1px solid #141414",
              fontSize: 11,
              color: "#555",
              fontFamily: "monospace",
              flexShrink: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {currentPdf.filename}
            </div>
          )}

          {/* PDF viewer */}
          <div style={{ flex: 1, position: "relative", background: "#080808", overflow: "hidden" }}>
            {carouselLoading ? (
              <Centered color="#444">Loading unassigned PDFs…</Centered>
            ) : unassigned.length === 0 ? (
              <Centered color="#333">
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
                  <div>No unassigned PDFs found</div>
                </div>
              </Centered>
            ) : currentPdf ? (
              <iframe
                key={currentPdf.key}
                src={`${currentPdf.url}#navpanes=0&toolbar=0`}
                style={{ width: "100%", height: "100%", border: "none" }}
                title="Unassigned PDF"
              />
            ) : null}
          </div>

          {/* Carousel actions */}
          <div style={{
            flexShrink: 0,
            padding: "10px 16px",
            background: "#0d0d0d",
            borderTop: "1px solid #1a1a1a",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}>
            <span style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", marginRight: 4 }}>
              This PDF:
            </span>
            <ActionBtn
              small
              onClick={() => setConfirm({
                message: "Attach PDF to selected contract?",
                detail: selectedContract
                  ? `Will attach to contract ${selectedContract.contractNumber}. ${selectedContract.pictureKey ? "Existing PDF will be moved to unassigned." : ""}`
                  : "No contract selected.",
                label: "Attach",
                color: "#238636",
                fn: handleAttachToContract,
              })}
              disabled={!currentPdf || !selectedContract || busy}
              loading={actionLoading === "attach"}
              color="#238636"
              icon="🔗"
              label="Attach to Contract"
            />
            <ActionBtn
              small
              onClick={() => setConfirm({
                message: "Move PDF back to unassigned?",
                detail: "File will be re-stamped with current timestamp.",
                label: "Move",
                color: "#888",
                fn: handleCarouselToUnassigned,
              })}
              disabled={!currentPdf || busy}
              loading={actionLoading === "unassigned"}
              color="#888"
              icon="📤"
              label="Keep Unassigned"
            />
            <ActionBtn
              small
              onClick={() => setConfirm({
                message: "Mark this PDF for deletion?",
                detail: "File will be moved to /markedDeleted.",
                label: "Mark Delete",
                color: "#d73a49",
                fn: handleCarouselMarkDelete,
              })}
              disabled={!currentPdf || busy}
              loading={actionLoading === "cdelete"}
              color="#d73a49"
              icon="🗑️"
              label="Mark Delete"
            />
          </div>
        </div>

        {/* ══ RIGHT: CONTRACTS ══ */}
        <div style={{
          width: "38%",
          minWidth: 320,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          background: "#0d0d0d",
          minHeight: 0,
        }}>

          {/* Search header */}
          <div style={{
            padding: "10px 14px",
            borderBottom: "1px solid #1e1e1e",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: "#aaa", fontWeight: 600 }}>📋 Contracts</span>
              {!contractsLoading && <Badge color="#1f6feb">{contracts.length}</Badge>}
              <button
                onClick={loadContracts}
                style={{ marginLeft: "auto", padding: "4px 10px", borderRadius: 5, background: "#1e1e1e", color: "#666", border: "1px solid #2e2e2e", cursor: "pointer", fontSize: 11 }}
              >↺</button>
            </div>
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by number, name, type, commodity…"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 7,
                background: "#161616",
                border: "1px solid #2a2a2a",
                color: "#ddd",
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Contract list */}
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            {contractsLoading ? (
              <Centered color="#444">Loading contracts…</Centered>
            ) : filteredContracts.length === 0 ? (
              <Centered color="#333">No contracts match</Centered>
            ) : (
              filteredContracts.map(c => {
                const isSelected = selectedContract?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedContract(isSelected ? null : c)}
                    style={{
                      padding: "10px 14px",
                      borderBottom: "1px solid #161616",
                      cursor: "pointer",
                      background: isSelected ? "#1f6feb18" : "transparent",
                      borderLeft: isSelected ? "3px solid #1f6feb" : "3px solid transparent",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "#161616"; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 13, color: "#ddd", fontWeight: 700 }}>
                        #{c.contractNumber}
                      </span>
                      {c.locked && <span style={{ fontSize: 10, color: "#1f6feb" }}>🔒 LOCKED</span>}
                      {c.pictureKey
                        ? <span style={{ fontSize: 10, color: "#238636", marginLeft: "auto" }}>📄 has PDF</span>
                        : <span style={{ fontSize: 10, color: "#444", marginLeft: "auto" }}>no PDF</span>
                      }
                    </div>
                    <div style={{ fontSize: 11, color: "#666" }}>
                      {[c.name, c.contractType, c.commodity].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Selected contract detail + PDF + actions */}
          {selectedContract && (
            <div style={{
              flexShrink: 0,
              borderTop: "1px solid #1e1e1e",
              background: "#0a0a0a",
              display: "flex",
              flexDirection: "column",
              maxHeight: "50%",
            }}>

              {/* Meta row */}
              <div style={{
                padding: "10px 14px",
                borderBottom: "1px solid #141414",
                display: "flex",
                flexWrap: "wrap",
                gap: 16,
                flexShrink: 0,
              }}>
                {[
                  { label: "Contract #", value: selectedContract.contractNumber },
                  { label: "Name", value: selectedContract.name || "—" },
                  { label: "Type", value: selectedContract.contractType || "—" },
                  { label: "Qty", value: selectedContract.originalQuantity || "—" },
                ].map(f => (
                  <div key={f.label}>
                    <div style={{ fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em" }}>{f.label}</div>
                    <div style={{ fontSize: 12, color: "#ccc", fontWeight: 600 }}>{f.value}</div>
                  </div>
                ))}
              </div>

              {/* Contract PDF preview */}
              <div style={{ height: 220, position: "relative", background: "#080808", flexShrink: 0, overflow: "hidden" }}>
                {contractPdfLoading ? (
                  <Centered color="#444">Loading PDF…</Centered>
                ) : contractPdfUrl ? (
                  <iframe
                    key={contractPdfUrl}
                    src={`${contractPdfUrl}#navpanes=0&toolbar=0`}
                    style={{ width: "100%", height: "100%", border: "none" }}
                    title="Contract current PDF"
                  />
                ) : (
                  <Centered color="#333">
                    <div style={{ textAlign: "center", fontSize: 12 }}>
                      <div style={{ fontSize: 28, marginBottom: 6 }}>📭</div>
                      No PDF attached
                    </div>
                  </Centered>
                )}
              </div>

              {/* Contract actions */}
              <div style={{
                padding: "10px 14px",
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                flexShrink: 0,
                borderTop: "1px solid #141414",
              }}>
                <ActionBtn
                  small
                  onClick={handleLockContract}
                  disabled={!selectedContract || selectedContract.locked || busy}
                  loading={actionLoading === "lock"}
                  color="#1f6feb"
                  icon="🔒"
                  label={selectedContract.locked ? "Locked" : "Lock"}
                />
                <ActionBtn
                  small
                  onClick={() => setConfirm({
                    message: `Remove PDF from contract ${selectedContract.contractNumber}?`,
                    detail: "File will be moved to /unassigned.",
                    label: "Remove",
                    color: "#e3b341",
                    fn: handleRemoveContractPdf,
                  })}
                  disabled={!selectedContract?.pictureKey || busy}
                  loading={actionLoading === "cremove"}
                  color="#e3b341"
                  icon="📤"
                  label="Remove PDF"
                />
                <ActionBtn
                  small
                  onClick={() => setConfirm({
                    message: `Mark contract ${selectedContract.contractNumber} PDF for deletion?`,
                    detail: "File will be moved to /markedDeleted.",
                    label: "Mark Delete",
                    color: "#d73a49",
                    fn: handleMarkDeleteContractPdf,
                  })}
                  disabled={!selectedContract?.pictureKey || busy}
                  loading={actionLoading === "cmarkdelete"}
                  color="#d73a49"
                  icon="🗑️"
                  label="Mark Delete"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0d0d0d; }
        ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
      `}</style>
    </div>
  );
}

/* ── tiny helpers ── */
function Centered({ children, color }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100%", color: color || "#555", fontSize: 13,
    }}>
      {children}
    </div>
  );
}

function navBtnStyle(disabled) {
  return {
    width: 30, height: 30, borderRadius: 6,
    background: disabled ? "#111" : "#1e1e1e",
    color: disabled ? "#2a2a2a" : "#888",
    border: "1px solid #222",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
    padding: 0,
  };
}
