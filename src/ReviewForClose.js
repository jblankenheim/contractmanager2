import React, { useState, useMemo } from "react";
import { getCurrentUser } from "aws-amplify/auth";
import { post } from "aws-amplify/api";
 
export default function ReviewForClose({ contracts = [] }) {
  const [search, setSearch] = useState("");
  const [showLowBushels, setShowLowBushels] = useState(false);
  const [activeContractMedia, setActiveContractMedia] = useState(null);
  const [activeMedia, setActiveMedia] = useState(null);
 
  // Notes popup state
  const [notesPopup, setNotesPopup] = useState(null); // { contractID, notes }
  const [notesValue, setNotesValue] = useState("");
 
  // Close/Cancel confirm state
  const [confirmPopup, setConfirmPopup] = useState(null); // { contract, action: 'close' | 'cancel' }
 
  const [loadingId, setLoadingId] = useState(null);
 
  // Filter logic
  const filtered = useMemo(() => {
    let list = [...contracts];
 
    if (showLowBushels) {
      list = list.filter((c) => {
        const qty = parseFloat(c.remainingQuantity);
        return !isNaN(qty) && qty < 10;
      });
    }
 
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter((c) =>
        (c.contractNumber ?? "").toLowerCase().includes(s)
      );
    }
 
    return list;
  }, [contracts, search, showLowBushels]);
 
  const handleCloseCancel = async (contract, action) => {
    setLoadingId(contract.id + action);
    try {
      const { username } = await getCurrentUser();
 
      const isClosed = action === "close";
      const isCanceled = action === "cancel";
 
      const restOp = post({
        apiName: "contractsAPI",
        path: "/closeCancel",
        options: {
          body: {
            contractID: contract.id,
            userName: username,
            closed: isClosed,
            canceled: isCanceled,
            notes: contract.notes ?? "",
          },
        },
      });
 
      const { body } = await restOp.response;
      await body.json();
 
      setConfirmPopup(null);
    } catch (err) {
      console.error("closeCancel failed:", err);
      alert(`Error: ${err?.message ?? "Unknown — check console"}`);
    } finally {
      setLoadingId(null);
    }
  };
 
  const openNotesPopup = (contract) => {
    setNotesPopup({ contractID: contract.id, contract });
    setNotesValue(contract.notes ?? "");
  };
 
  const saveNotes = async () => {
    if (!notesPopup) return;
    try {
      const { username } = await getCurrentUser();
      const restOp = post({
        apiName: "contractsAPI",
        path: "/closeCancel",
        options: {
          body: {
            contractID: notesPopup.contractID,
            userName: username,
            closed: false,
            canceled: false,
            notes: notesValue,
          },
        },
      });
      const { body } = await restOp.response;
      await body.json();
      setNotesPopup(null);
    } catch (err) {
      console.error("Notes save failed:", err);
      alert(`Error: ${err?.message ?? "Unknown — check console"}`);
    }
  };
 
  const styles = {
    container: {
      padding: "16px 0",
      color: "white",
    },
    toolbar: {
      display: "flex",
      gap: 10,
      alignItems: "center",
      marginBottom: 16,
      flexWrap: "wrap",
    },
    searchInput: {
      padding: "9px 14px",
      borderRadius: 6,
      border: "1px solid #3a3a3a",
      background: "#111",
      color: "white",
      fontSize: 14,
      width: 220,
    },
    bushelsBtn: (active) => ({
      padding: "9px 16px",
      borderRadius: 6,
      border: `1px solid ${active ? "#f0a500" : "#3a3a3a"}`,
      background: active ? "#3a2800" : "#1b1b1b",
      color: active ? "#f0a500" : "#aaa",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
      transition: "all 0.15s",
    }),
    resultCount: {
      marginLeft: "auto",
      color: "#666",
      fontSize: 13,
    },
    card: (index) => ({
      background: index % 2 === 0 ? "#111" : "#161616",
      borderLeft: "4px solid #1f6feb",
      borderRadius: 6,
      marginBottom: 8,
      overflow: "hidden",
    }),
    cardHeader: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 16px",
      cursor: "pointer",
      flexWrap: "wrap",
    },
    contractNum: {
      color: "#58a6ff",
      fontWeight: 700,
      fontSize: 14,
      minWidth: 100,
    },
    tag: (color) => ({
      fontSize: 11,
      padding: "2px 8px",
      borderRadius: 12,
      background: color + "22",
      color: color,
      border: `1px solid ${color}44`,
      fontWeight: 600,
    }),
    meta: {
      color: "#888",
      fontSize: 13,
    },
    actions: {
      display: "flex",
      gap: 8,
      marginLeft: "auto",
      alignItems: "center",
    },
    docBtn: {
      fontSize: 11,
      padding: "3px 8px",
      background: "#1f2d3d",
      color: "#58a6ff",
      border: "1px solid #1f6feb44",
      borderRadius: 4,
      cursor: "pointer",
    },
    notesBtn: {
      padding: "6px 12px",
      borderRadius: 5,
      background: "#2a2a2a",
      color: "#e3b341",
      border: "1px solid #3a3a3a",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 600,
    },
    closeBtn: {
      padding: "6px 14px",
      borderRadius: 5,
      background: "#2d1a1a",
      color: "#f85149",
      border: "1px solid #f8514933",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 700,
    },
    cancelBtn: {
      padding: "6px 14px",
      borderRadius: 5,
      background: "#1a1a2d",
      color: "#a371f7",
      border: "1px solid #a371f733",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 700,
    },
    signedDot: (signed) => ({
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: signed ? "#238636" : "#d73a49",
      display: "inline-block",
      marginRight: 5,
    }),
    overlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.85)",
      zIndex: 3000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    modal: {
      background: "#1b1b1b",
      border: "1px solid #2e2e2e",
      borderRadius: 10,
      padding: 28,
      width: 380,
      maxWidth: "90vw",
    },
  };
 
  return (
    <div style={styles.container}>
      {/* Toolbar */}
      <div style={styles.toolbar}>
        <input
          placeholder="Search contract #..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        <button
          style={styles.bushelsBtn(showLowBushels)}
          onClick={() => setShowLowBushels((v) => !v)}
        >
          🌾 Remaining Bushels &lt; 10
        </button>
        <span style={styles.resultCount}>{filtered.length} contract{filtered.length !== 1 ? "s" : ""}</span>
      </div>
 
      {/* Contract Cards */}
      {filtered.length === 0 && (
        <div style={{ color: "#555", padding: "32px 0", textAlign: "center" }}>
          No contracts match your filters.
        </div>
      )}
 
      {filtered.map((c, index) => (
        <div key={c.id} style={styles.card(index)}>
          {/* Header row */}
          <div
            style={styles.cardHeader}
            onClick={() => {
              const pdfs = c.media?.filter((m) => m.type === "pdf") ?? [];
              if (pdfs.length) setActiveContractMedia({ pdfs, activeIndex: 0 });
            }}
          >
            <span style={styles.contractNum}>#{c.contractNumber}</span>
 
            {c.name && <span style={styles.meta}>{c.name}</span>}
 
            <span style={styles.tag("#58a6ff")}>{c.contractType}</span>
 
            {c.commodity && (
              <span style={styles.tag("#3fb950")}>{c.commodity}</span>
            )}
 
            {c.remainingQuantity && (
              <span style={{ ...styles.meta, fontSize: 12 }}>
                {c.remainingQuantity} bu
              </span>
            )}
 
            <span>
              <span style={styles.signedDot(!!c.pictureKey)} />
              <span style={{ fontSize: 12, color: c.pictureKey ? "#3fb950" : "#d73a49" }}>
                {c.pictureKey ? "Signed" : "Unsigned"}
              </span>
            </span>
 
            {c.closedDate && (
              <span style={{ ...styles.meta, fontSize: 11 }}>
                Closed: {c.closedDate}
              </span>
            )}
 
            {/* Docs buttons */}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {(c.media ?? []).map((m, i) => (
                <button
                  key={i}
                  style={styles.docBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMedia(m);
                  }}
                >
                  {m.type}
                </button>
              ))}
            </div>
 
            {/* Notes icon if exists */}
            {c.notes && (
              <span
                title={c.notes}
                style={{ fontSize: 16, cursor: "help" }}
                onClick={(e) => {
                  e.stopPropagation();
                  openNotesPopup(c);
                }}
              >
                📝
              </span>
            )}
 
            {/* Action buttons */}
            <div style={styles.actions} onClick={(e) => e.stopPropagation()}>
              <button
                style={styles.notesBtn}
                onClick={() => openNotesPopup(c)}
              >
                {c.notes ? "Edit Notes" : "Add Notes"}
              </button>
              <button
                style={styles.closeBtn}
                onClick={() => setConfirmPopup({ contract: c, action: "close" })}
              >
                Close
              </button>
              <button
                style={styles.cancelBtn}
                onClick={() => setConfirmPopup({ contract: c, action: "cancel" })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ))}
 
      {/* ── Multi-PDF viewer (row click) ── */}
      {activeContractMedia && (
        <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 4000 }}>
          <button
            style={{ margin: 8, padding: "4px 14px", background: "#2a2a2a", color: "white", borderRadius: 4 }}
            onClick={() => setActiveContractMedia(null)}
          >
            ✕ Close
          </button>
          <div style={{ display: "flex", gap: 8, padding: "0 8px 8px" }}>
            {activeContractMedia.pdfs.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveContractMedia((prev) => ({ ...prev, activeIndex: idx }))}
                style={{
                  background: activeContractMedia.activeIndex === idx ? "#1f6feb" : "#2a2a2a",
                  color: "white",
                  padding: "4px 12px",
                  borderRadius: 4,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                PDF {idx + 1}
              </button>
            ))}
          </div>
          <iframe
            src={activeContractMedia.pdfs[activeContractMedia.activeIndex].url}
            style={{ width: "100%", height: "calc(100% - 70px)" }}
            title="PDF Viewer"
          />
        </div>
      )}
 
      {/* ── Single media viewer (Docs buttons) ── */}
      {activeMedia && (
        <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 4500 }}>
          <button
            style={{ margin: 8, padding: "4px 14px", background: "#2a2a2a", color: "white", borderRadius: 4 }}
            onClick={() => setActiveMedia(null)}
          >
            ✕ Close
          </button>
          {activeMedia.type === "pdf" ? (
            <iframe
              src={activeMedia.url}
              style={{ width: "100%", height: "calc(100% - 40px)" }}
              title="Media Viewer"
            />
          ) : (
            <img
              src={activeMedia.url}
              alt=""
              style={{ maxWidth: "100%", maxHeight: "100%", margin: "auto", display: "block" }}
            />
          )}
        </div>
      )}
 
      {/* ── Notes Popup ── */}
      {notesPopup && (
        <div style={styles.overlay} onClick={() => setNotesPopup(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 6px", color: "white", fontSize: 16 }}>
              Notes — #{notesPopup.contract.contractNumber}
            </h3>
            <p style={{ color: "#666", fontSize: 12, margin: "0 0 14px" }}>
              These notes will be saved to the contract record.
            </p>
            <textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              rows={5}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 6,
                border: "1px solid #3a3a3a",
                background: "#111",
                color: "white",
                fontSize: 13,
                resize: "vertical",
                boxSizing: "border-box",
              }}
              placeholder="Enter notes..."
            />
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button
                onClick={() => setNotesPopup(null)}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  borderRadius: 6,
                  background: "#2a2a2a",
                  color: "#aaa",
                  border: "1px solid #3a3a3a",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveNotes}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  borderRadius: 6,
                  background: "#1f6feb",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}
 
      {/* ── Close / Cancel Confirm Popup ── */}
      {confirmPopup && (
        <div style={styles.overlay} onClick={() => setConfirmPopup(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 8px", color: "white", fontSize: 16 }}>
              {confirmPopup.action === "close" ? "Close" : "Cancel"} Contract?
            </h3>
            <p style={{ color: "#888", fontSize: 13, margin: "0 0 6px" }}>
              Contract <strong style={{ color: "white" }}>#{confirmPopup.contract.contractNumber}</strong>
            </p>
            <p style={{ color: "#888", fontSize: 13, margin: "0 0 20px" }}>
              {confirmPopup.action === "close"
                ? "This will mark the contract as closed. Continue?"
                : "This will cancel the contract. Continue?"}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              {/* No = go back / cancel the action */}
              <button
                onClick={() => setConfirmPopup(null)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 6,
                  background: "#2a2a2a",
                  color: "white",
                  border: "1px solid #3a3a3a",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                No — Go Back
              </button>
              {/* Yes = proceed */}
              <button
                disabled={!!loadingId}
                onClick={() => handleCloseCancel(confirmPopup.contract, confirmPopup.action)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 6,
                  background: confirmPopup.action === "close" ? "#2d1a1a" : "#1a1a2d",
                  color: confirmPopup.action === "close" ? "#f85149" : "#a371f7",
                  border: `1px solid ${confirmPopup.action === "close" ? "#f8514955" : "#a371f755"}`,
                  cursor: loadingId ? "not-allowed" : "pointer",
                  fontWeight: 700,
                  opacity: loadingId ? 0.6 : 1,
                }}
              >
                {loadingId
                  ? "Processing..."
                  : `Yes — ${confirmPopup.action === "close" ? "Close" : "Cancel"} Contract`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}