import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/api";
import { getUrl } from "aws-amplify/storage";
import { listContracts } from "./graphql/queries";
import ContractSubmissionCard from "./ContractSubmissionCard";
import BulkUploadPage from "./Bulkuploadpage";
import logo from "./assets/CFE_Logo.png";

const client = generateClient();

export default function HomePage({ user, signOut }) {
  const [contracts, setContracts] = useState([]);
  const [filtered, setFiltered] = useState([]);

  const [statusFilter, setStatusFilter] = useState("open");
  const [signedFilter, setSignedFilter] = useState("all");
  const [contractType, setContractType] = useState("ALL");
  const [search, setSearch] = useState("");

  const [activeView, setActiveView] = useState("contracts");
  const [showSubmissionCard, setShowSubmissionCard] = useState(false);

  const [activeMedia, setActiveMedia] = useState(null);
  const [activeContractMedia, setActiveContractMedia] = useState(null);

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
        items.map(async (c) => {
          const parseKey = (key) => {
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

          if (!keys.length) return { ...c, media: [] };

          const media = await Promise.all(
            keys.map(async (key) => {
              const { url } = await getUrl({ path: key });
              const urlString = url.toString();
              const type = urlString.toLowerCase().includes(".pdf")
                ? "pdf"
                : "image";

              return { url: urlString, type };
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
     FILTERING
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

  const contractTypes = [
    "ALL",
    ...new Set(contracts.map(c => c.contractType).filter(Boolean)),
  ];

  /* =========================
     ESC KEY CLOSES MODALS
  ========================= */

  useEffect(() => {
    const onKey = (e) => {
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
        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          <img src={logo} alt="Logo" style={{ width: 120 }} />
          <h2>Contracts Dashboard</h2>
        </div>
        <button onClick={signOut}>Sign Out</button>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: 12, margin: "20px 0" }}>
        {[
          { key: "contracts", label: "Contracts" },
          { key: "uploadData", label: "Upload Data" },
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

      {activeView === "uploadData" && <BulkUploadPage />}

      {activeView === "contracts" && (
        <>
          {/* FILTERS */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
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

          {/* TABLE */}
          <table style={{ width: "100%", marginTop: 20 }}>
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
              {filtered.map(c => (
                <tr
                  key={c.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    const contractPdf = c.media.find(
                      m => m.type === "pdf" && !m.url.includes("transaction.pdf")
                    );
                    const transactionPdf = c.media.find(
                      m => m.url.includes("transaction.pdf")
                    );

                    setActiveMedia(null);
                    setActiveContractMedia({ contractPdf, transactionPdf });
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
                          setActiveContractMedia(null);
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

      {/* SINGLE DOCUMENT MODAL */}
      {activeMedia && (
        <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 1000 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", padding: 10 }}>
            <button onClick={() => window.print()}>🖨️ Print</button>
            <button onClick={() => setActiveMedia(null)}>✕ Close</button>
          </div>
          <iframe src={activeMedia.url} style={{ width: "100%", height: "100%" }} />
        </div>
      )}

      {/* COMBINED MODAL */}
      {activeContractMedia && (
        <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 1000 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", padding: 10 }}>
            <button onClick={() => window.print()}>🖨️ Print All</button>
            <button onClick={() => setActiveContractMedia(null)}>✕ Close</button>
          </div>

          <div style={{ overflowY: "auto", height: "100%" }}>
            {activeContractMedia.contractPdf && (
              <iframe
                src={activeContractMedia.contractPdf.url}
                style={{ width: "100%", height: "100vh" }}
              />
            )}
            {activeContractMedia.transactionPdf && (
              <iframe
                src={activeContractMedia.transactionPdf.url}
                style={{ width: "100%", height: "100vh" }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}