import json
import boto3
import os
import re
import time
from pypdf import PdfReader
from pdf2image import convert_from_path
import pytesseract

s3 = boto3.client('s3')
lambda_client = boto3.client('lambda')

TARGET_LAMBDA = "arn:aws:lambda:us-east-2:311064037995:function:submitEditedContractLambda-dev"
pytesseract.pytesseract.tesseract_cmd = "/opt/bin/tesseract"
poppler_path = "/opt/bin"

CONTRACT_TYPES = {
    "PRICE_LATER": ["price later contract", "price later"],
    "DEFERRED_PAYMENT": ["deferred payment", "deferred pay", "credit sale contract"],
    "MINIMUM_PRICED": ["minimum price", "min price"],
    "CASH_BUY": ["cash buy"],
    "EXTENDED_PRICING": ["extended pricing", "extended price"],
    "BASIS_FIXED": ["basis fixed"],
    "HEDGED-TO-ARRIVE": ["hedged to arrive", "hedged-to-arrive", "hta"]
}

# Simplified regex to find labels; validation happens in the logic below
contract_pattern = re.compile(r"(?:contract|contract\s*no|contract\s*#|contract\s*number)\s*[:\.]?\s*([A-Z0-9]+)", re.IGNORECASE)

def normalize_text(text):
    return " ".join(text.lower().replace("-", " ").split())

def get_contract_type(text):
    norm = normalize_text(text)
    header_area = norm[:1000]
    for c_type, patterns in CONTRACT_TYPES.items():
        if any(p in header_area for p in patterns):
            return c_type
    for c_type, patterns in CONTRACT_TYPES.items():
        if any(p in norm for p in patterns):
            return c_type
    return "UNASSIGNED"

def lambda_handler(event, context):
    if 'pdfType' in event:
        print(f"Worker received: Page {event.get('pageNumber')} - Type: {event.get('contractType')}")
        return {"statusCode": 200, "body": f"Contract {event.get('contractNumber')} processed"}

    try:
        record = event['Records'][0]
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']
    except (KeyError, IndexError):
        return {"statusCode": 400}

    download_path = f'/tmp/{os.path.basename(key)}'
    s3.download_file(bucket, key, download_path)
    reader = PdfReader(download_path)

    for i, page in enumerate(reader.pages):
        page_num = i + 1
        text = page.extract_text() or ""
        
        if not text.strip():
            images = convert_from_path(download_path, poppler_path=poppler_path, first_page=page_num, last_page=page_num)
            text = pytesseract.image_to_string(images[0])

        contract_number = None
        
        # 1. PRIMARY SEARCH (Label based)
        match = contract_pattern.search(text)
        if match:
            candidate = match.group(1)
            # REJECT if it doesn't have at least 8 digits (Ignores 'Reprinted', 'Credit', etc.)
            if sum(c.isdigit() for c in candidate) >= 8:
                contract_number = candidate

        # 2. FALLBACK SEARCH (Header hunt)
        if not contract_number:
            # Find all 8-12 char alphanumeric blocks
            all_blocks = re.findall(r"\b[A-Z0-9]{8,12}\b", text[:1000].upper())
            # Keep ONLY those with 8+ digits
            valid_ids = [b for b in all_blocks if sum(c.isdigit() for c in b) >= 8]
            if valid_ids:
                contract_number = valid_ids[0]

        contract_type = get_contract_type(text)

        final_key = key
        if not contract_number:
            final_key = f"public/unassigned/{int(time.time())}_p{page_num}.pdf"
            s3.copy_object(Bucket=bucket, CopySource={'Bucket': bucket, 'Key': key}, Key=final_key)

        worker_data = {
            "sourceKey": final_key,
            "contractType": contract_type,
            "contractNumber": contract_number,
            "pdfType": "contract",
            "pageNumber": page_num
        }
        
        print(f"Final Extraction - ID: {contract_number}, Type: {contract_type}")

        lambda_client.invoke(
            FunctionName=TARGET_LAMBDA,
            InvocationType='Event',
            Payload=json.dumps({"body": json.dumps(worker_data)})
        )

    return {"statusCode": 200, "body": f"Split {len(reader.pages)} pages."}