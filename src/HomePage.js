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

  // ✅ SINGLE VIEWER STATE
  const [activeContractMedia, setActiveContractMedia] = useState(null);
  /*
    {
      items: [{ url, type, label }],
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
            return {
              url: url.toString(),
              type: url.toString().toLowerCase().endsWith(".pdf")
                ? "pdf"
                : "image",
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
     GLOBAL FILTERS
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

  /* =========================
     RENDER
  ========================= */
  return (
    <div style={{ padding: 20, color: "white" }}>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 15 }}>
          <img src={logo} alt="Logo" style={{ width: 120 }} />
          <h2>Contracts Dashboard</h2>
        </div>
        <button onClick={signOut}>Sign Out</button>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: 12, margin: "20px 0" }}>
        {["contracts", "review", "close", "bulk"].map(v => (
          <button
            key={v}
            onClick={() => setActiveView(v)}
            style={{
              padding: 12,
              background: activeView === v ? "#1f6feb" : "#2a2a2a",
            }}
          >
            {v.toUpperCase()}
          </button>
        ))}
      </div>

      {activeView === "bulk" && <BulkUploadPage />}

      {activeView !== "bulk" && (
        <table width="100%" style={{ marginTop: 20 }}>
          <thead>
            <tr>
              <th>Contract #</th>
              <th>Type</th>
              <th>Docs</th>
              <th>Signed</th>
            </tr>
          </thead>
          <tbody>
            {viewFiltered.map(c => (
              <tr
                key={c.id}
                style={{ cursor: "pointer" }}
                onClick={() => {
                  const items = [];

                  const contractPdf = c.media.find(
                    m => m.type === "pdf" && m.url.includes("contract")
                  );

                  const transactionPdf = c.media.find(
                    m => m.type === "pdf" && m.url.includes("transaction")
                  );

                  if (contractPdf)
                    items.push({ ...contractPdf, label: "Contract" });

                  if (transactionPdf)
                    items.push({ ...transactionPdf, label: "Transaction" });

                  if (items.length) {
                    setActiveContractMedia({
                      items,
                      activeIndex: 0,
                    });
                  }
                }}
              >
                <td>{c.contractNumber}</td>
                <td>{c.contractType}</td>
                <td>{c.media.length}</td>
                <td>{c.contractSigned ? "✔" : "✖"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ✅ SINGLE DOCUMENT VIEWER */}
      {activeContractMedia && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#000",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: 10,
              background: "#111",
            }}
          >
            <div style={{ display: "flex", gap: 10 }}>
              {activeContractMedia.items.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() =>
                    setActiveContractMedia(prev => ({
                      ...prev,
                      activeIndex: idx,
                    }))
                  }
                  style={{
                    background:
                      idx === activeContractMedia.activeIndex
                        ? "#1f6feb"
                        : "#333",
                    padding: "6px 12px",
                    color: "white",
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button onClick={() => setActiveContractMedia(null)}>✕</button>
          </div>

          <iframe
            title="Document Viewer"
            src={
              activeContractMedia.items[
                activeContractMedia.activeIndex
              ].url
            }
            style={{ flex: 1, width: "100%", border: "none" }}
          />
        </div>
      )}
    </div>
  );
}

