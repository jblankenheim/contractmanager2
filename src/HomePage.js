import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/api";
import { getUrl } from "aws-amplify/storage";
import { listContracts } from "./graphql/queries";
import ContractSubmissionCard from "./ContractSubmissionCard";
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

      const parseKey = (key) => {
        if (!key) return null;
        try {
          const parsed = JSON.parse(key);
          return Array.isArray(parsed) ? parsed[0] : parsed;
        } catch {
          return key;
        }
      };

      const withMedia = await Promise.all(
        items.map(async (c) => {
          const keys = [
            c.pictureKey,
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

  const closeSubmissionAndRefresh = async () => {
    setShowSubmissionCard(false);
    await fetchContracts();
  };

  useEffect(() => {
    let data = [...contracts];

    if (statusFilter === "open") data = data.filter((c) => !c.closedDate);
    else if (statusFilter === "closed") data = data.filter((c) => c.closedDate);

    if (signedFilter === "signed")
      data = data.filter((c) => c.contractSigned);
    else if (signedFilter === "unsigned")
      data = data.filter((c) => !c.contractSigned);

    if (contractType !== "ALL")
      data = data.filter((c) => c.contractType === contractType);

    if (search) {
      data = data.filter((c) =>
        String(c.contractNumber || "")
          .toLowerCase()
          .includes(search.toLowerCase())
      );
    }

    setFiltered(data);
  }, [contracts, statusFilter, signedFilter, contractType, search]);

  const contractTypes = [
    "ALL",
    ...new Set(contracts.map((c) => c.contractType).filter(Boolean)),
  ];

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setActiveMedia(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const tabs = [
    { key: "contracts", label: "Contracts" },
    { key: "reviewNew", label: "Review New" },
    { key: "reviewClose", label: "Review Close" },
    { key: "uploadData", label: "Upload Data" },
  ];

  return (
    <div style={{ padding: 20, color: "white" }}>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          <img src={logo} alt="Logo" style={{ width: 120 }} />
          <h2>Contracts Dashboard</h2>
        </div>
        <button onClick={signOut}>Sign Out</button>
      </div>

      {/* VIEW SWITCH (WIDER + CAPITALIZED) */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveView(t.key)}
            style={{
              padding: "12px 18px",
              minWidth: 180,
              background: activeView === t.key ? "#1f6feb" : "#2a2a2a",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              textAlign: "center",
              fontWeight: 500,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* CONTRACTS VIEW */}
      {activeView === "contracts" && (
        <>
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <select value={contractType} onChange={(e) => setContractType(e.target.value)}>
              {contractTypes.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="all">All</option>
            </select>

            <select value={signedFilter} onChange={(e) => setSignedFilter(e.target.value)}>
              <option value="all">All Signed</option>
              <option value="signed">Signed</option>
              <option value="unsigned">Unsigned</option>
            </select>

            <input
              placeholder="Search contract #"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button onClick={() => setShowSubmissionCard(true)}>
            Add Signed Contract
          </button>

          {showSubmissionCard && (
            <ContractSubmissionCard
              onCancel={closeSubmissionAndRefresh}
              onSuccess={closeSubmissionAndRefresh}
            />
          )}

          <table style={{ width: "100%", marginTop: 20, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Contract #</th>
                <th style={{ textAlign: "left" }}>Type</th>
                <th style={{ textAlign: "left" }}>Docs</th>
                <th style={{ textAlign: "left" }}>Signed</th>
                <th style={{ textAlign: "left" }}>Closed</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>{c.contractNumber}</td>
                  <td>{c.contractType}</td>

                  <td>
                    {c.media?.map((m, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveMedia(m)}
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

      {/* MODAL */}
      {activeMedia && (
        <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 1000 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              padding: "10px 20px",
              background: "#111",
              borderBottom: "1px solid #333",
            }}
          >
            <button
              onClick={() => window.print()}
              style={{
                background: "#1f6feb",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              🖨️ Print
            </button>

            <button
              onClick={() => setActiveMedia(null)}
              style={{
                background: "#444",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              ✕ Close
            </button>
          </div>

          <iframe
            src={activeMedia.url}
            style={{ width: "100%", height: "100%", border: "none" }}
          />
        </div>
      )}
    </div>
  );
}