import base64
from pathlib import Path
from mistralai.client import Mistral
from ..core.config import settings


def _mistral_client() -> Mistral:
    return Mistral(api_key=settings.MISTRAL_API_KEY, timeout_ms=60000)


def _image_to_text(image_bytes: bytes, mime: str) -> str:
    """Run Mistral OCR on raw image bytes and return markdown text."""
    b64 = base64.b64encode(image_bytes).decode()
    client = _mistral_client()
    r = client.ocr.process(
        model="mistral-ocr-latest",
        document={"type": "image_url", "image_url": f"data:{mime};base64,{b64}"},
    )
    return "\n\n".join(p.markdown for p in r.pages) if r.pages else ""


def extract_text_from_file(file_path: str) -> str:
    ext = Path(file_path).suffix.lower()
    try:
        if ext in (".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"):
            mime = "image/jpeg" if ext in (".jpg", ".jpeg") else f"image/{ext.lstrip('.')}"
            with open(file_path, "rb") as f:
                return _image_to_text(f.read(), mime)

        elif ext == ".pdf":
            # Convert each PDF page to an image, then OCR each
            from pdf2image import convert_from_path
            import io
            pages = convert_from_path(file_path, dpi=200)
            texts = []
            for page in pages:
                buf = io.BytesIO()
                page.save(buf, format="PNG")
                texts.append(_image_to_text(buf.getvalue(), "image/png"))
            return "\n\n".join(texts)

        else:
            return ""
    except Exception as e:
        print(f"OCR failed for {file_path}: {e}")
        return ""
