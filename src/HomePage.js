import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/api";
import { getUrl } from "aws-amplify/storage";
import { listContracts } from "./graphql/queries";
import BulkUploadPage from "./Bulkuploadpage";
import { post } from "aws-amplify/api";
import { uploadData } from "aws-amplify/storage";
import logo from "./assets/CFE_Logo.png";

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

  // ✅ all PDFs, one iframe
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
        ].map(parseKey).filter(Boolean);

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

    if (signedFilter === "signed") data = data.filter(c => c.contractSigned);
    if (signedFilter === "unsigned") data = data.filter(c => !c.contractSigned);

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
    if (activeView === "review") return !c.closedDate && !c.contractSigned;
    if (activeView === "close") return c.contractSigned && !c.closedDate;
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

<<<<<<< HEAD
      {/* TABS */}
      <div style={{ display: "flex", gap: 12, margin: "20px 0" }}>
        {[
          { key: "contracts", label: "Contracts" },
          { key: "review", label: "Review" },
          { key: "close", label: "Review for Close" },
          { key: "bulk", label: "Bulk Upload" },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveView(t.key)}
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

      {/* BULK UPLOAD */}
      {activeView === "bulk" && <BulkUploadPage />}

      {/* CONTRACT VIEWS */}
      {activeView !== "bulk" && (
        <>
          {/* FILTER BAR */}
          <div style={{ display: "flex", gap: 10 }}>
            <select value={contractType} onChange={e => setContractType(e.target.value)}>
              {contractTypes.map(t => (
                <option key={t}>{t}</option>
              ))}
            </select>

            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="all">All</option>
            </select>

            <select value={signedFilter} onChange={e => setSignedFilter(e.target.value)}>
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
          <table style={{ width: "100%", marginTop: 20, borderCollapse: "separate", borderSpacing: "0 6px", borderRadius: 8, overflow: "hidden" }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '12px' }}>Contract #</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Name</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Type</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Commodity</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Quantity</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Docs</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Signed</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Closed</th>
              </tr>
            </thead>
            <tbody>
              {viewFiltered.map((c, index) => (
                <tr
                  key={c.id}
                  onClick={() => {
                    const contractPdf = c.media.find(m => m.type === "pdf");
                    const transactionPdf = c.media.find(m => m.url.includes("transaction"));
                    setActiveContractMedia({ contractPdf, transactionPdf });
                  }}
                  style={{
                    cursor: "pointer",
                    backgroundColor: index % 2 === 0 ? "#111" : "#1b1b1b",
                    borderLeft: "4px solid #1f6feb",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#1a1a1a"; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = index % 2 === 0 ? "#111" : "#1b1b1b"; }}
                >
                  <td style={{ padding: '12px' }}>{c.contractNumber}</td>
                  <td style={{ padding: '12px' }}>{c.name || ""}</td>
                  <td style={{ padding: '12px' }}>{c.contractType}</td>
                  <td style={{ padding: '12px' }}>{c.commodity || ""}</td>
                  <td style={{ padding: '12px' }}>{c.quantity || ""}</td>
                  <td style={{ padding: '12px' }}>
                    {c.media.map((m, i) => (
                      <button
                        key={i}
                        style={{ marginRight: 4, fontSize: '11px', padding: '2px 6px' }}
                        onClick={e => {
                          e.stopPropagation();
                          setActiveMedia(m);
                        }}
                      >
                        {m.type}
                      </button>
                    ))}
                  </td>
                  <td style={{ padding: '12px' }}>{c.contractSigned ? "✔" : "✖"}</td>
                  <td style={{ padding: '12px' }}>{c.closedDate ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* MODALS (unchanged from your logic) */}
      {activeMedia && (
        <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 1000 }}>
          <button onClick={() => setActiveMedia(null)}>Close</button>
          <iframe src={activeMedia.url} style={{ width: "100%", height: "100%" }} />
        </div>
      )}

      {activeContractMedia && (
        <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 1000 }}>
          <button onClick={() => setActiveContractMedia(null)}>Close</button>
          {activeContractMedia.contractPdf && (
            <iframe src={activeContractMedia.contractPdf.url} style={{ width: "100%", height: "100vh" }} />
          )}
          {activeContractMedia.transactionPdf && (
            <iframe src={activeContractMedia.transactionPdf.url} style={{ width: "100%", height: "100vh" }} />
          )}
        </div>
      )}

      {showUploadContract && (
        <div
=======
    {/* TABS */}
    <div style={{ display: "flex", gap: 12, margin: "20px 0" }}>
      {[
        { key: "contracts", label: "Contracts" },
        { key: "review", label: "Review" },
        { key: "close", label: "Review for Close" },
        { key: "bulk", label: "Bulk Upload" },
      ].map(t => (
        <button
          key={t.key}
          onClick={() => setActiveView(t.key)}
>>>>>>> 20a958cc031bea8934b758e6a1797dd6642450a5
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

    {activeView === "bulk" && <BulkUploadPage />}

    {/* FILTER BAR */}
    {activeView !== "bulk" && (
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <select value={contractType} onChange={e => setContractType(e.target.value)}>
          {contractTypes.map(t => (
            <option key={t}>{t}</option>
          ))}
        </select>

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="all">All</option>
        </select>

        <select value={signedFilter} onChange={e => setSignedFilter(e.target.value)}>
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
    )}

    {/* TABLE */}
    {activeView !== "bulk" && (
      <table style={{ width: "100%", marginTop: 10 }}>
        <tbody>
          {viewFiltered.map(c => (
            <tr
              key={c.id}
              onClick={() => {
                const pdfs = c.media.filter(m => m.type === "pdf");
                if (pdfs.length) {
                  setActiveContractMedia({ pdfs, activeIndex: 0 });
                }
              }}
              style={{
                cursor: "pointer",
                backgroundColor: "#111",
                borderLeft: "4px solid #1f6feb",
              }}
            >
              <td>{c.contractNumber}</td>
              <td>{c.contractType}</td>

              {/* DOCS COLUMN */}
              <td>
                {c.media.map((m, i) => (
                  <button
                    key={i}
                    onClick={e => {
                      e.stopPropagation();
                      setActiveMedia(m);
                    }}
                  >
                    {m.type}
                  </button>
                ))}
              </td>

              <td>{c.contractSigned ? "✔" : "✖"}</td>
              <td>{c.closedDate ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}

    {/* ✅ MULTI‑PDF VIEWER (row click) */}
    {activeContractMedia && (
      <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 1000 }}>
        <button onClick={() => setActiveContractMedia(null)}>Close</button>

        <div style={{ display: "flex", gap: 8, padding: 8 }}>
          {activeContractMedia.pdfs.map((_, idx) => (
            <button
              key={idx}
              onClick={() =>
                setActiveContractMedia(prev => ({
                  ...prev,
                  activeIndex: idx,
                }))
              }
            >
              PDF {idx + 1}
            </button>
          ))}
        </div>

        <iframe
          src={activeContractMedia.pdfs[activeContractMedia.activeIndex].url}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    )}

    {/* ✅ SINGLE PDF / IMAGE VIEWER (Docs buttons) */}
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
            style={{ width: "100%", height: "100%" }}
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
  </div>
);

}
