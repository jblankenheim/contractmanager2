import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/api";
import { getUrl } from "aws-amplify/storage";
import { listContracts } from "./graphql/queries";
import BulkUploadPage from "./Bulkuploadpage";
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
              {viewFiltered.map(c => (
                <tr
                  key={c.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    const contractPdf = c.media.find(m => m.type === "pdf");
                    const transactionPdf = c.media.find(m =>
                      m.url.includes("transaction")
                    );
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
    </div>
  );
}

