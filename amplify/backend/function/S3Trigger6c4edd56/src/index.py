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

# Update with your actual target friendly name or ARN
TARGET_LAMBDA = "arn:aws:lambda:us-east-2:311064037995:function:S3Trigger6c4edd56-dev"
pytesseract.pytesseract.tesseract_cmd = "/opt/bin/tesseract"
poppler_path = "/opt/bin"

CONTRACT_TYPES = {
    "MINIMUM_PRICED": ["minimum price", "min price"],
    "CASH_BUY": ["cash buy"],
    "EXTENDED_PRICING": ["extended pricing", "extended price"],
    "DEFERRED_PAYMENT": ["deferred payment", "deferred pay"],
    "PRICE_LATER": ["price later", "priced later"],
    "BASIS_FIXED": ["basis fixed"],
    "HEDGED-TO-ARRIVE": ["hedged to arrive", "hedged-to-arrive", "hta"]
}

contract_pattern = re.compile(r"Contract(?:\s*No\.?)?\s*[:\.]?\s*(\d+)", re.IGNORECASE)

def normalize_text(text):
    return " ".join(text.lower().replace("-", " ").split())

def get_contract_type(text):
    norm = normalize_text(text)
    match = re.search(r"(contract type|type)\s*[:\-]?\s*(.+)", norm)
    if match:
        value = match.group(2)
        for c_type, patterns in CONTRACT_TYPES.items():
            if any(p in value for p in patterns): return c_type
    for c_type, patterns in CONTRACT_TYPES.items():
        if any(p in norm for p in patterns): return c_type
    return "UNASSIGNED"

def lambda_handler(event, context):
    bucket = event['Records'][0]['s3']['bucket']['name']
    key = event['Records'][0]['s3']['object']['key']
    download_path = '/tmp/contract.pdf'
    
    s3.download_file(bucket, key, download_path)
    
    reader = PdfReader(download_path)
    
    # Process each page as a separate document
    for i, page in enumerate(reader.pages):
        page_num = i + 1
        text = page.extract_text() or ""
        contract_number = None
        
        # OCR Fallback
        if not text.strip():
            # Convert ONLY the current page to an image
            images = convert_from_path(
                download_path, 
                poppler_path=poppler_path, 
                first_page=page_num, 
                last_page=page_num
            )
            page_image = images[0]
            
            for angle in [0, 90, 180, 270]:
                rotated = page_image.rotate(angle, expand=True)
                text = pytesseract.image_to_string(rotated)
                match = contract_pattern.search(text)
                if match:
                    contract_number = match.group(1)
                    break
        else:
            match = contract_pattern.search(text)
            if match:
                contract_number = match.group(1)
        
        contract_type = get_contract_type(text)
        
        # Determine Final Path/Payload
        final_destination = key
        if not contract_number:
            # For multi-page docs, append page number to prevent overwriting in unassigned
            unassigned_key = f"public/unassigned/{int(time.time())}_p{page_num}.pdf"
            s3.copy_object(
                Bucket=bucket, 
                CopySource={'Bucket': bucket, 'Key': key}, 
                Key=unassigned_key
            )
            final_destination = unassigned_key

        # Trigger downstream Lambda for THIS page
        payload = {
            "sourceKey": final_destination,
            "contractType": contract_type,
            "contractNumber": contract_number,
            "pdfType": "contract",
            "pageNumber": page_num # Helpful for debugging multi-page source files
        }

        lambda_client.invoke(
            FunctionName=TARGET_LAMBDA,
            InvocationType='Event',
            Payload=json.dumps(payload)
        )

  
    return {"statusCode": 200, "body": f"Processed {len(reader.pages)} pages independently."}