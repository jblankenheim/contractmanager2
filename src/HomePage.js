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
  const [activeContractMedia, setActiveContractMedia] = useState(null);

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
    try {
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
              const urlString = url.toString();
              return {
                url: urlString,
                type: urlString.toLowerCase().includes(".pdf") ? "pdf" : "image",
              };
            })
          );

          return { ...c, media };
        })
      );

      setContracts(withMedia);
      setFiltered(withMedia);
    } catch (err) {
      console.error("Failed to fetch contracts:", err);
    }
  }

  /* =========================
     FILTERS (GLOBAL)
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
     VIEW-BASED FILTERING
  ========================= */
  const viewFiltered = filtered.filter(c => {
    switch (activeView) {
      case "review":
        return !c.closedDate && !c.contractSigned;
      case "close":
        return c.contractSigned && !c.closedDate;
      default:
        return true;
    }
  });

  const contractTypes = [
    "ALL",
    ...new Set(contracts.map(c => c.contractType).filter(Boolean)),
  ];

  /* =========================
     ESC CLOSE MODALS
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
  async function handleUploadContract() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const uploadKey = `uploads/contracts/${timestamp}.pdf`;

      // 1️⃣ Upload temp file to S3
      const uploadResult = await uploadData({
        path: uploadKey,
        data: uploadFile,
        options: {
          contentType: "application/pdf",
          accessLevel: "public",
        },
      }).result;

      const sourceKey = uploadResult.path;

      // 2️⃣ Send to API
      const response = await post({
        apiName: "contractsAPI",
        path: "/submitEditedContract",
        options: {
          body: {
            sourceKey,
            contractNumber: uploadContractNumber,
            contractType: uploadContractType,
            pdfType: uploadPdfType,
          },
        },
      });

      console.log("Upload success:", response);

      // 3️⃣ Reset UI
      setShowUploadContract(false);
      setUploadFile(null);
      setUploadPreviewUrl(null);
      setUploadContractNumber("");
      setUploadContractType("");
      setUploadPdfType("contract");

      fetchContracts();

    } catch (err) {
      console.error("Upload failed FULL:", err);
      alert("Upload failed");
    }
  }
  const CONTRACT_TYPE_OPTIONS = [
    "BASIS_FIXED",
    "DEFERRED_PAYMENT",
    "PRICED_LATER",
    "EXTENDED_PRICING",
    "CASH_BUY",
    "MINIMUM_PRICED",
    "HEDGED_TO_ARRIVE",
    "UNASSIGNED",
  ];

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
          <table style={{
            width: "100%", 
            marginTop: 20, 
            width: "100%",
            marginTop: 20,
            borderCollapse: "separate",
            borderSpacing: "0 6px", 
            borderRadius: 8,
            overflow: "hidden",
          }}>
            <thead>
              <tr>
                <th>Contract #</th>
                <th>Type</th>
                <th>Docs</th>
                <th>Signed</th>
                <th>Closed</th>
              </tr>
            </thead>
            <tbody>
              {viewFiltered.map(c => (
                <tr
                  key={c.id}
                  onClick={() => {
                    const contractPdf = c.media.find(m => m.type === "pdf");
                    const transactionPdf = c.media.find(m =>
                      m.url.includes("transaction")
                    );
                    setActiveContractMedia({ contractPdf, transactionPdf });
                  }}
                  style={{
                    cursor: "pointer",
                    backgroundColor: "#111", // default dark row
                    borderLeft: "4px solid #1f6feb",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = "#1a1a1a";
                  }}
                  onMouseLeave={e => {
                    const index = viewFiltered.findIndex(x => x.id === c.id);
                    e.currentTarget.style.backgroundColor =
                      index % 2 === 0 ? "#111" : "#1b1b1b";
                  }}
                >
                  <td>{c.contractNumber}</td>
                  <td>{c.contractType}</td>
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
          style={{
            position: "fixed",
            inset: 0,
            background: "#000",
            zIndex: 2000,
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* HEADER */}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <h2>Upload Contract</h2>
            <button onClick={() => {
              setShowUploadContract(false);
              setUploadFile(null);
              setUploadPreviewUrl(null);
              setUploadContractNumber("");
              setUploadContractType("");
              setUploadPdfType("contract");
            }}>
              ✕ Close
            </button>
          </div>

          {/* FORM */}
          <div style={{ display: "flex", gap: 12 }}>
            <input
              placeholder="Contract Number"
              value={uploadContractNumber}
              onChange={e => setUploadContractNumber(e.target.value)}
            />

            <select
              value={uploadContractType}
              onChange={e => setUploadContractType(e.target.value)}
            >
              <option value="">Select Contract Type</option>
              {CONTRACT_TYPE_OPTIONS.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              value={uploadPdfType}
              onChange={e => setUploadPdfType(e.target.value)}
            >
              <option value="contract">Contract</option>
              <option value="addendum">Addendum</option>
            </select>

            <input
              type="file"
              accept="application/pdf"
              onChange={e => {
                const file = e.target.files[0];
                if (!file) return;

                setUploadFile(file);
                setUploadPreviewUrl(URL.createObjectURL(file));
              }}
            />
          </div>

          {/* PREVIEW */}
          <div style={{ flex: 1, border: "1px solid #333" }}>
            {uploadPreviewUrl ? (
              <iframe
                src={uploadPreviewUrl}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <div style={{ padding: 40, color: "#888" }}>
                Select a PDF to preview
              </div>
            )}
          </div>

          {/* ACTION BAR */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button onClick={() => setShowUploadContract(false)}>Cancel</button>

            <button
              style={{
                background: "#1f6feb",
                color: "white",
                padding: "10px 18px",
                borderRadius: 6,
                fontWeight: "bold",
              }}
              onClick={handleUploadContract}
              disabled={
                !uploadFile ||
                !uploadContractNumber ||
                !uploadContractType
              }
            >
              Upload
            </button>

          </div>
        </div>
      )}

    </div>
  );
}

