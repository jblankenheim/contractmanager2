import { useState } from "react";
import { post } from "aws-amplify/api";
import { uploadData } from "aws-amplify/storage";

const CONTRACT_TYPES = [
  "DEFERRED_PAYMENT",
  "PRICED_LATER",
  "EXTENDED_PRICING",
  "CASH_BUY",
  "MINIMUM_PRICE",
  "UNASSIGNED"
];

export default function ContractSubmissionCard({ onCancel }) {
  const [files, setFiles] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submittingIndex, setSubmittingIndex] = useState(null);

  // upload files → create review objects

const handleUpload = async () => {
  if (!files.length) return;

  setLoading(true);

  try {
    const uploaded = await Promise.all(
      files.map(async (file) => {
        const logicalKey = `uploads/review/${Date.now()}-${file.name}`;

        const { result } = uploadData({
          path: logicalKey,
          data: file
        });

        const uploadResult = await result;

        console.log("REAL S3 KEY:", uploadResult.key); // ← keep this temporarily

        return {
          contractNumber: "",
          contractType: "MINIMUM_PRICE",
          pdfType: "contract",

          // ✅ THIS IS THE ONLY CORRECT KEY
          pictureKey: uploadResult.key,

          signedUrl: URL.createObjectURL(file)
        };
      })
    );

    setContracts(uploaded);
    setFiles([]);
  } catch (err) {
    console.error(err);
    alert("Upload failed");
  } finally {
    setLoading(false);
  }
};


  const handleEdit = (index, field, value) => {
    setContracts((prev) => {
      const copy = [...prev];
      copy[index][field] = value;
      return copy;
    });
  };

  const submitEditedContract = async (contract, index) => {
    setSubmittingIndex(index);

    try {
      


const payload = {
  sourceKey: contract.pictureKey,  
  contractNumber: contract.contractNumber,
  contractType: contract.contractType,
  pdfType: contract.pdfType
};




      await post({
        apiName: "contractsAPI",
        path: "/submitEditedContract",
        options: { body: payload }
      });

      alert("Submitted successfully!");
    } catch (err) {
      console.error(err);
      alert("Submission failed");
    } finally {
      setSubmittingIndex(null);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: "auto", color: "white" }}>
      <h2>Contract Submission</h2>

      {/* FILE INPUT */}
      <input
        type="file"
        multiple
        onChange={(e) => setFiles(Array.from(e.target.files))}
      />

      <div style={{ marginTop: 10 }}>
        <button onClick={handleUpload} disabled={loading || !files.length}>
          {loading ? "Uploading..." : "Upload"}
        </button>

        {onCancel && (
          <button onClick={onCancel} style={{ marginLeft: 10 }}>
            Cancel
          </button>
        )}
      </div>

      {/* CONTRACT LIST */}
      {contracts.map((c, i) => (
        <div key={i} style={{ marginTop: 25, border: "1px solid #333" }}>

          {/* CONTROL BAR */}
          <div
            style={{
              display: "flex",
              gap: 10,
              padding: 10,
              background: "#222",
              alignItems: "center",
              flexWrap: "wrap"
            }}
          >
            {/* CONTRACT NUMBER */}
            <div>
              <strong>Contract #:</strong>
              <input
                style={{ marginLeft: 5 }}
                value={c.contractNumber}
                onChange={(e) =>
                  handleEdit(i, "contractNumber", e.target.value)
                }
              />
            </div>

            {/* CONTRACT TYPE */}
            <div>
              <strong>Type:</strong>
              <select
                style={{ marginLeft: 5 }}
                value={c.contractType}
                onChange={(e) =>
                  handleEdit(i, "contractType", e.target.value)
                }
              >
                {CONTRACT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* PDF TYPE */}
            <div>
              <strong>PDF Type:</strong>
              <select
                style={{ marginLeft: 5 }}
                value={c.pdfType}
                onChange={(e) =>
                  handleEdit(i, "pdfType", e.target.value)
                }
              >
                <option value="contract">contract</option>
                <option value="addendum">addendum</option>
              </select>
            </div>

            {/* SUBMIT */}
            <button
              style={{ marginLeft: "auto" }}
              onClick={() => submitEditedContract(c, i)}
              disabled={submittingIndex === i}
            >
              {submittingIndex === i ? "Submitting..." : "Submit"}
            </button>
          </div>

          {/* PDF PREVIEW */}
          {c.signedUrl && (
            <iframe
              src={`${c.signedUrl}#toolbar=1&navpanes=0&view=FitH`}
              style={{
                width: "100%",
                height: "80vh",
                border: "none",
                background: "#111"
              }}
              title={`Contract ${i}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
