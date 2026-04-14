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

  // ✅ Modal viewer supports BOTH image + pdf
  const [activeMedia, setActiveMedia] = useState(null); // { url, type }


  useEffect(() => {
    fetchContracts();
  }, []);

  /* =============================
     Fetch Contracts + Signed URLs
  ============================= */

async function fetchContracts() {
  try {
    const res = await client.graphql({
      query: listContracts,
      variables: { limit: 1000 },
    });

    const items = res.data.listContracts.items ?? [];

    const withMedia = await Promise.all(
      items.map(async (c) => {
        const keys = [
          c.pictureKey,
          c.addendumKey1,
          c.addendumKey2,
          c.duplicateKey,
        ].filter(Boolean);

        if (!keys.length) return { ...c, media: [] };

        const media = await Promise.all(
          keys.map(async (key) => {
            const { url } = await getUrl({ key });
            const urlString = url.toString();
            const type = urlString.toLowerCase().endsWith(".pdf")
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


  /* =============================
     Refresh on Submit OR Cancel
  ============================= */
  const closeSubmissionAndRefresh = async () => {
    setShowSubmissionCard(false);
    await fetchContracts();
  };

  /* =============================
     Filtering Logic
  ============================= */
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

  /* =============================
     Styles
  ============================= */
  const th = { padding: 10, borderBottom: "2px solid #444", textAlign: "left" };
  const td = { padding: 10, borderBottom: "1px solid #ddd" };

useEffect(() => {
  const onKey = (e) => e.key === "Escape" && setActiveMedia(null);
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, []);

  return (
    <div style={{ padding: 20, color: "white" }}>
      {/* ================= Header ================= */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          <img src={logo} alt="Logo" style={{ width: 120 }} />
          <h2>Contracts Dashboard</h2>
        </div>
        <button onClick={signOut}>Sign Out</button>
      </div>

      {/* ================= View Switch ================= */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {["contracts", "reviewNew", "reviewClose"].map((v) => (
          <button
            key={v}
            onClick={() => setActiveView(v)}
            style={{
              padding: 12,
              background: activeView === v ? "#1f6feb" : "#2a2a2a",
              color: "white",
            }}
          >
            {v === "contracts"
              ? "Contracts"
              : v === "reviewNew"
              ? "Review New Signed Contracts"
              : "Review to Close"}
          </button>
        ))}
      </div>

      {/* ================= Contracts View ================= */}
      {activeView === "contracts" && (
        <>
          {/* Filters */}
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
              placeholder="Search contract number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button onClick={() => setShowSubmissionCard(true)}>
            Add Signed Contract
          </button>

          {showSubmissionCard && (
            <div style={{ marginTop: 30 }}>
              <ContractSubmissionCard
                onCancel={closeSubmissionAndRefresh}
                onSuccess={closeSubmissionAndRefresh}
              />
            </div>
          )}

          {/* ================= Table ================= */}
          <table style={{ width: "100%", marginTop: 30, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Contract #</th>
                <th style={th}>Type</th>
                <th style={th}>Contract</th>
                <th style={th}>Signed</th>
                <th style={th}>Closed Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 20, textAlign: "center" }}>
                    No contracts found
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id}>
                    <td style={td}>{c.contractNumber}</td>
                    <td style={td}>{c.contractType}</td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: 8 }}>
                       
{c.media.map((m, i) =>
  m.type === "pdf" ? (
    <div
      key={i}
      onClick={() => setActiveMedia(m)}
      title="View PDF"
      style={{
        width: 60,
        height: 60,
        overflow: "hidden",
        borderRadius: 4,
        cursor: "zoom-in",
        border: "1px solid #444",
        background: "#222",
      }}
    >
      <iframe
        // Force page 1 and hide UI
        src={`${m.url}#page=1&view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
        title="PDF Thumbnail"
        style={{
          width: 600,              // render large…
          height: 800,
          border: "none",
          transform: "scale(0.1)", // …then scale down
          transformOrigin: "top left",
          pointerEvents: "none",   // clicks go to wrapper
        }}
      />
    </div>
  ) : (
    <img
      key={i}
      src={m.url}
      alt="Contract"
      onClick={() => setActiveMedia(m)}
      style={{
        width: 60,
        height: 60,
        objectFit: "cover",
        borderRadius: 4,
        cursor: "zoom-in",
      }}
    />
  )
)}

                      </div>
                    </td>
                    <td style={td}>{c.contractSigned ? "✅" : "❌"}</td>
                    <td style={td}>{c.closedDate ?? ""}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </>
      )}

      {/* ================= Modal Viewer ================= */}
     {activeMedia && (
  <div
    onClick={() => setActiveMedia(null)}
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.85)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()} // ✅ prevent accidental close
      style={{
        position: "relative",
        width: "90%",
        height: "90%",
        background: "white",
        borderRadius: 6,
        overflow: "hidden",
        boxShadow: "0 0 40px black",
      }}
    >
      {/* Close button */}
      <button
        onClick={() => setActiveMedia(null)}
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 10,
          background: "#000",
          color: "white",
          border: "none",
          padding: "6px 10px",
          cursor: "pointer",
        }}
      >
        ✕
      </button>

<a
  href={activeMedia.pdfUrl}
  target="_blank"
  rel="noopener noreferrer"
  style={{
    position: "absolute",
    top: 10,
    left: 10,
    color: "white",
    background: "#1f6feb",
    padding: "6px 10px",
    textDecoration: "none",
    fontSize: 14,
  }}
>
  Download
</a>


      {/* PDF Viewer */}
      <iframe
        src={activeMedia.pdfUrl}
        title="Contract PDF"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
        }}
      />
    </div>
  </div>
)}
    </div>
  );
}
