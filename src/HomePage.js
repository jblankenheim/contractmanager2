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

  // ✅ carries ALL pdfs, one iframe
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
     FILTERS
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
     UPLOAD
  ========================= */
  async function handleUploadContract() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const uploadKey = `uploads/contracts/${timestamp}.pdf`;

    const uploadResult = await uploadData({
      path: uploadKey,
      data: uploadFile,
      options: { contentType: "application/pdf", accessLevel: "public" },
    }).result;

    await post({
      apiName: "contractsAPI",
      path: "/submitEditedContract",
      options: {
        body: {
          sourceKey: uploadResult.path,
          contractNumber: uploadContractNumber,
          contractType: uploadContractType,
          pdfType: uploadPdfType,
        },
      },
    });

    setShowUploadContract(false);
    fetchContracts();
  }

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
        {["contracts", "review", "close", "bulk"].map(v => (
          <button
            key={v}
            onClick={() => setActiveView(v)}
            style={{
              minWidth: 180,
              padding: "12px 18px",
              background: activeView === v ? "#1f6feb" : "#2a2a2a",
              color: "white",
              borderRadius: 6,
            }}
          >
            {v}
          </button>
        ))}
      </div>

      {activeView === "bulk" && <BulkUploadPage />}

      {/* TABLE */}
      {activeView !== "bulk" && (
        <table style={{ width: "100%", marginTop: 20 }}>
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
                style={{ cursor: "pointer", background: "#111" }}
              >
                <td>{c.contractNumber}</td>
                <td>{c.contractType}</td>
                <td>{c.contractSigned ? "✔" : "✖"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ✅ SINGLE IFRAME — ALL PDFs */}
      {activeContractMedia && (
        <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 1000 }}>
          <button onClick={() => setActiveContractMedia(null)}>Close</button>

          <div style={{ display: "flex", gap: 8, padding: 8 }}>
            {activeContractMedia.pdfs.map((p, idx) => (
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
    </div>
  );
}

