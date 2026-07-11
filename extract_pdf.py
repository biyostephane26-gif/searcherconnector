import os
from pdfminer.high_level import extract_text

pdf_path = os.path.join(os.getcwd(), 'document_pdf.pdf')
text = extract_text(pdf_path)
with open('pdf_text.txt', 'w', encoding='utf-8') as f:
    f.write(text)
