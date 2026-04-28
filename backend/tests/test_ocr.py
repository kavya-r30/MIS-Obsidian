from unittest.mock import patch
from PIL import Image, ImageDraw
from backend.services.ocr import extract_text_from_file

# NOTE: tests mock pytesseract — requires tesseract binary in production

def test_extract_text_from_image(tmp_path):
    img = Image.new("RGB", (400, 100), color="white")
    draw = ImageDraw.Draw(img)
    draw.text((10, 10), "Invoice Amount: $500", fill="black")
    img_path = str(tmp_path / "test.png")
    img.save(img_path)
    with patch("pytesseract.image_to_string", return_value="Invoice Amount: $500"):
        text = extract_text_from_file(img_path)
    assert isinstance(text, str)
    assert len(text) > 0

def test_extract_text_unsupported_format(tmp_path):
    bad_file = tmp_path / "file.txt"
    bad_file.write_text("hello")
    text = extract_text_from_file(str(bad_file))
    assert text == ""
