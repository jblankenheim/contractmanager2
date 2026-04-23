import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/api";
import { getUrl } from "aws-amplify/storage";
import { listContracts } from "./graphql/queries";
import BulkUploadPage from "./Bulkuploadpage";
import { post } from "aws-amplify/api";
import { uploadData } from "aws-amplify/storage";
import logo from "./assets/CFE_Logo.png";
import ReviewAndLock from "./ReviewAndLock";

const client = generateClient();

export default function HomePage({ user, signOut }) {
  /* =========================
     STATE
  ========================= */
  const [contracts, setContracts] = useState([]);
  const [filtered, setFiltered] = useState([]);

  const [activeView, setActiveView] = useState("contracts");

  const [statusFilter, setStatusFilter] = useState("open");
  const [signedFilter, setSignedFilter] = useState("all");
  const [contractType, setContractType] = useState("ALL");
  const [search, setSearch] = useState("");

  const [activeMedia, setActiveMedia] = useState(null);

  // Multi-PDF viewer (row click)
  const [activeContractMedia, setActiveContractMedia] = useState(null);
  /*
    {
      pdfs: [{ url, type }],
      activeIndex: number
    }
  */

  const [showUploadContract, setShowUploadContract] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState(null);

  const [uploadContractNumber, setUploadContractNumber] = useState("");
  const [uploadContractType, setUploadContractType] = useState("");
  const [uploadPdfType, setUploadPdfType] = useState("contract");

  /* =========================
     FETCH CONTRACTS
  ========================= */
  useEffect(() => {
    fetchContracts();
  }, []);

  async function fetchContracts() {
    const res = await client.graphql({
      query: listContracts,
      variables: { limit: 1000 },
    });

    const items = res?.data?.listContracts?.items ?? [];

    const withMedia = await Promise.all(
      items.map(async c => {
        const parseKey = key => {
          if (!key) return null;
          try {
            const parsed = JSON.parse(key);
            return Array.isArray(parsed) ? parsed[0] : parsed;
          } catch {
            return key;
          }
        };

        const keys = [
          c.pictureKey,
          c.transactionKey,
          c.addendumKey1,
          c.addendumKey2,
          c.duplicateKey,
        ]
          .map(parseKey)
          .filter(Boolean);

        const media = await Promise.all(
          keys.map(async key => {
            const { url } = await getUrl({ path: key });
            const u = url.toString();
            return {
              url: u,
              type: u.toLowerCase().includes(".pdf") ? "pdf" : "image",
            };
          })
        );

        return { ...c, media };
      })
    );

    setContracts(withMedia);
    setFiltered(withMedia);
  }

  /* =========================
     FILTER BAR LOGIC
  ========================= */
  useEffect(() => {
    let data = [...contracts];

    if (statusFilter === "open") data = data.filter(c => !c.closedDate);
    if (statusFilter === "closed") data = data.filter(c => c.closedDate);

    // ✅ Changed: Use pictureKey instead of contractSigned
    if (signedFilter === "signed") data = data.filter(c => !!c.pictureKey);
    if (signedFilter === "unsigned") data = data.filter(c => !c.pictureKey);

    if (contractType !== "ALL") {
      data = data.filter(c => c.contractType === contractType);
    }

    if (search) {
      data = data.filter(c =>
        String(c.contractNumber || "")
          .toLowerCase()
          .includes(search.toLowerCase())
      );
    }
    setFiltered(data);
  }, [contracts, statusFilter, signedFilter, contractType, search]);

  /* =========================
     VIEW FILTER
  ========================= */
  const viewFiltered = filtered.filter(c => {
    // ✅ Changed: Use pictureKey instead of contractSigned
    if (activeView === "review") return !c.closedDate && !c.pictureKey;
    if (activeView === "close") return c.pictureKey && !c.closedDate;
    return true;
  });

  const contractTypes = [
    "ALL",
    ...new Set(contracts.map(c => c.contractType).filter(Boolean)),
  ];

  /* =========================
     ESC CLOSE
  ========================= */
  useEffect(() => {
    const onKey = e => {
      if (e.key === "Escape") {
        setActiveMedia(null);
        setActiveContractMedia(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* =========================
     RENDER
  ========================= */
  return (
    <div style={{ padding: 20, color: "white" }}>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 15, alignItems: "center" }}>
          <img src={logo} alt="Logo" style={{ width: 120 }} />
          <h2>Contracts Dashboard</h2>
        </div>
        <button onClick={signOut}>Sign Out</button>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: 12, margin: "20px 0" }}>
        {[
          { key: "contracts", label: "Contracts" },
          { key: "reviewlock", label: "Review" },
          { key: "close", label: "Review for Close" },
          { key: "bulk", label: "Bulk Upload" },

        ].map(t => (
          <button
            key={t.key}
            onClick={() => {
              setActiveView(t.key);

              if (t.key === "contracts") {
                fetchContracts();
              }
            }}
            style={{
              minWidth: 180,
              padding: "12px 18px",
              background: activeView === t.key ? "#1f6feb" : "#2a2a2a",
              color: "white",
              borderRadius: 6,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {/* Review and lock contracts */}
      {activeView === "reviewlock" && <ReviewAndLock />}
      {/* BULK UPLOAD */}
      {activeView === "bulk" && <BulkUploadPage />}



      {/* CONTRACT VIEWS */}
      {activeView !== "bulk" && (
        <>
          {/* FILTER BAR */}
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <select
              value={contractType}
              onChange={e => setContractType(e.target.value)}
            >
              {contractTypes.map(t => (
                <option key={t}>{t}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="all">All</option>
            </select>

            <select
              value={signedFilter}
              onChange={e => setSignedFilter(e.target.value)}
            >
              <option value="all">All Signed</option>
              <option value="signed">Signed</option>
              <option value="unsigned">Unsigned</option>
            </select>

            <input
              placeholder="Search contract #"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* UPLOAD BUTTON */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
            <button
              onClick={() => setShowUploadContract(true)}
              style={{
                padding: "10px 16px",
                background: "#238636",
                color: "white",
                borderRadius: 6,
                fontWeight: "bold",
              }}
            >
              Upload Contract
            </button>
          </div>

          {/* TABLE */}
          <table
            style={{
              width: "100%",
              marginTop: 10,
              borderCollapse: "separate",
              borderSpacing: "0 6px",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "12px" }}>Contract #</th>
                <th style={{ textAlign: "left", padding: "12px" }}>Name</th>
                <th style={{ textAlign: "left", padding: "12px" }}>Type</th>
                <th style={{ textAlign: "left", padding: "12px" }}>Commodity</th>
                <th style={{ textAlign: "left", padding: "12px" }}>Quantity</th>
                <th style={{ textAlign: "left", padding: "12px" }}>Docs</th>
                <th style={{ textAlign: "left", padding: "12px" }}>Signed</th>
                <th style={{ textAlign: "left", padding: "12px" }}>Closed</th>
              </tr>
            </thead>
            <tbody>
              {viewFiltered.map((c, index) => (
                <tr
                  key={c.id}
                  onClick={() => {
                    const pdfs = c.media.filter((m) => m.type === "pdf");
                    if (pdfs.length) {
                      setActiveContractMedia({ pdfs, activeIndex: 0 });
                    }
                  }}
                  style={{
                    cursor: "pointer",
                    backgroundColor: index % 2 === 0 ? "#111" : "#1b1b1b",
                    borderLeft: "4px solid #1f6feb",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#1a2a3a";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = index % 2 === 0 ? "#111" : "#1b1b1b";
                  }}
                >
                  <td style={{ padding: "12px" }}>{c.contractNumber}</td>
                  <td style={{ padding: "12px" }}>{c.name || ""}</td>
                  <td style={{ padding: "12px" }}>{c.contractType}</td>
                  <td style={{ padding: "12px" }}>{c.commodity || ""}</td>
                  <td style={{ padding: "12px" }}>{c.originalQuantity || ""}</td>
                  <td style={{ padding: "12px" }}>
                    {c.media.map((m, i) => (
                      <button
                        key={i}
                        style={{ marginRight: 4, fontSize: "11px", padding: "2px 6px" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMedia(m);
                        }}
                      >
                        {m.type}
                      </button>
                    ))}
                  </td>
                  <td style={{ color: c.pictureKey ? "#238636" : "#d73a49", padding: "12px" }}>
                    {c.pictureKey ? "Signed" : "Unsigned"}
                  </td>
                  <td style={{ padding: "12px" }}>{c.closedDate ?? ""}</td>

                  {/* New Notes Field */}
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    {c.notes ? (
                      <span
                        title={c.notes}
                        style={{ cursor: "help", fontSize: "18px" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          alert(c.notes);
                        }}
                      >
                        📝
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* MULTI-PDF VIEWER (row click) */}
      {activeContractMedia && (
        <div
          style={{ position: "fixed", inset: 0, background: "#000", zIndex: 1000 }}
        >
          <button onClick={() => setActiveContractMedia(null)}>Close</button>

          <div style={{ display: "flex", gap: 8, padding: 8 }}>
            {activeContractMedia.pdfs.map((_, idx) => (
              <button
                key={idx}
                onClick={() =>
                  setActiveContractMedia(prev => ({ ...prev, activeIndex: idx }))
                }
                style={{
                  background:
                    activeContractMedia.activeIndex === idx ? "#1f6feb" : "#2a2a2a",
                  color: "white",
                  padding: "4px 12px",
                  borderRadius: 4,
                }}
              >
                PDF {idx + 1}
              </button>
            ))}
          </div>

          <iframe
            src={activeContractMedia.pdfs[activeContractMedia.activeIndex].url}
            style={{ width: "100%", height: "calc(100% - 60px)" }}
          />
        </div>
      )}

      {/* SINGLE PDF / IMAGE VIEWER (Docs buttons) */}
      {activeMedia && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#000",
            zIndex: 1500,
          }}
        >
          <button onClick={() => setActiveMedia(null)}>Close</button>

          {activeMedia.type === "pdf" ? (
            <iframe
              src={activeMedia.url}
              style={{ width: "100%", height: "calc(100% - 40px)" }}
            />
          ) : (
            <img
              src={activeMedia.url}
              alt=""
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                margin: "auto",
                display: "block",
              }}
            />
          )}
        </div>
      )}

      {/* UPLOAD CONTRACT MODAL — full-screen two-panel */}
      {showUploadContract && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.92)",
            zIndex: 2000,
            display: "flex",
          }}
        >
          {/* LEFT PANEL — form */}
          <div
            style={{
              width: 340,
              flexShrink: 0,
              background: "#1b1b1b",
              padding: 28,
              display: "flex",
              flexDirection: "column",
              gap: 14,
              borderRight: "1px solid #2e2e2e",
              overflowY: "auto",
            }}
          >
            <h3 style={{ margin: "0 0 6px", color: "white", fontSize: 18 }}>
              Upload Contract
            </h3>

            <input
              placeholder="Contract Number"
              value={uploadContractNumber}
              onChange={e => setUploadContractNumber(e.target.value)}
              style={{
                padding: "9px 12px",
                borderRadius: 6,
                border: "1px solid #3a3a3a",
                background: "#111",
                color: "white",
                fontSize: 14,
              }}
            />

            <select
              value={uploadContractType}
              onChange={e => setUploadContractType(e.target.value)}
              style={{
                padding: "9px 12px",
                borderRadius: 6,
                border: "1px solid #3a3a3a",
                background: "#111",
                color: "white",
                fontSize: 14,
                appearance: "none", // Removes default browser styling
                cursor: "pointer"
              }}
            >
              <option value="" disabled>Select Contract Type</option>
              {[
                "BASIS_FIXED",
                "DEFERRED_PAYMENT",
                "PRICE_LATER",
                "EXTENDED_PRICING",
                "CASH_BUY",
                "MINIMUM_PRICED",
                "HEDGED_TO_ARRIVE",
                "UNASSIGNED"
              ].map(type => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ')} {/* Makes it look cleaner: BASIS FIXED */}
                </option>
              ))}
            </select>

            <select
              value={uploadPdfType}
              onChange={e => setUploadPdfType(e.target.value)}
              style={{
                padding: "9px 12px",
                borderRadius: 6,
                border: "1px solid #3a3a3a",
                background: "#111",
                color: "white",
                fontSize: 14,
              }}
            >
              <option value="contract">Contract</option>
              <option value="addendum">Addendum</option>
            </select>

            {/* File drop zone */}
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "20px 12px",
                borderRadius: 6,
                border: "2px dashed #3a3a3a",
                background: "#111",
                color: "#888",
                cursor: "pointer",
                fontSize: 13,
                textAlign: "center",
              }}
            >
              {uploadFile ? (
                <>
                  <span style={{ fontSize: 22 }}>📄</span>
                  <span style={{ color: "white", fontWeight: 600 }}>
                    {uploadFile.name}
                  </span>
                  <span style={{ fontSize: 11 }}>Click to replace</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 22 }}>⬆️</span>
                  <span>Click to select a PDF or image</span>
                </>
              )}
              <input
                type="file"
                accept="application/pdf,image/*"
                style={{ display: "none" }}
                onChange={e => {
                  const file = e.target.files[0];
                  if (!file) return;
                  setUploadFile(file);
                  setUploadPreviewUrl(URL.createObjectURL(file));
                }}
              />
            </label>

            {/* Spacer pushes buttons to bottom */}
            <div style={{ flex: 1 }} />

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => {
                  setShowUploadContract(false);
                  setUploadFile(null);
                  setUploadPreviewUrl(null);
                  setUploadContractNumber("");
                  setUploadContractType("");
                  setUploadPdfType("contract");
                }}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 6,
                  background: "#2a2a2a",
                  color: "white",
                  border: "1px solid #3a3a3a",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                Cancel
              </button>

              <button style={{ width: "50%", borderRadius: "5", background: "green" }}
                onClick={async () => {
                  if (!uploadFile || !uploadContractNumber || !uploadContractType) return;

                  try {
                    const tempKey = `public/temp/${Date.now()}_${uploadFile.name}`;
                    await uploadData({ path: tempKey, data: uploadFile });

                    const restOperation = post({
                      apiName: 'contractsAPI',
                      path: '/submitEditedContract',
                      options: {
                        body: {
                          sourceKey: tempKey,
                          contractType: uploadContractType,
                          contractNumber: uploadContractNumber,
                          pdfType: uploadPdfType
                        }
                      }
                    });

                    // Amplify v6: unwrap .response, then .body.json()
                    const { body } = await restOperation.response;
                    const data = await body.json();

                    if (data.redirected) {
                      alert(data.message);
                    }

                    setShowUploadContract(false);
                    setUploadFile(null);
                    setUploadPreviewUrl(null);
                    setUploadContractNumber("");
                    setUploadContractType("");
                    setUploadPdfType("contract");
                    fetchContracts();

                  } catch (err) {
                    // Log the full error details
                    console.error("Upload failed:", JSON.stringify(err), err?.message, err?.response);
                    alert(`Error: ${err?.message ?? "Unknown — check console"}`);
                  }
                }}

              >
                Upload
              </button>
            </div>
          </div>

          {/* RIGHT PANEL — large preview */}
          <div style={{ flex: 1, position: "relative", background: "#0a0a0a" }}>
            {uploadPreviewUrl ? (
              uploadFile?.type?.startsWith("image/") ? (
                <img
                  src={uploadPreviewUrl}
                  alt="Preview"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <iframe
                  src={`${uploadPreviewUrl}#navpanes=0&toolbar=0&statusbar=0`}
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "none"
                  }}
                  title="Upload Preview"
                />
              )
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#444",
                  fontSize: 15,
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 48 }}>📋</span>
                <span>Select a file to preview it here</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}