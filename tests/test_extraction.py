"""Unit tests for document validation and text extraction."""

from __future__ import annotations

import pytest

from app.errors import (
    CorruptedFile,
    EmptyDocument,
    InvalidFile,
    ScannedDocument,
    UnsupportedFileType,
)
from app.extraction import (
    _render_lines,
    extract_upload,
    sanitize_filename,
    validate_file_meta,
)
from helpers import DOCX_MIME, docx_bytes, pdf_bytes, zip_without_document_xml


# --- filename / metadata validation ------------------------------------------
def test_sanitize_filename_strips_traversal():
    assert sanitize_filename("../../etc/passwd.txt") == "passwd.txt"
    assert sanitize_filename("C:\\Windows\\evil.pdf") == "evil.pdf"
    assert sanitize_filename("/tmp/../a/b/report.docx") == "report.docx"


def test_sanitize_filename_defaults_and_control_chars():
    assert sanitize_filename(None) == "document"
    assert sanitize_filename("") == "document"
    assert sanitize_filename("...") == "document"
    assert sanitize_filename("bad\x00name.txt") == "badname.txt"


def test_sanitize_filename_truncates_long_names():
    name = sanitize_filename("x" * 300 + ".pdf")
    assert name.endswith(".pdf")
    assert len(name) <= 120


def test_unsupported_extension():
    with pytest.raises(UnsupportedFileType) as exc:
        validate_file_meta("virus.exe", "application/x-msdownload")
    assert exc.value.code == "unsupported_type"
    assert exc.value.status_code == 415


def test_missing_extension():
    with pytest.raises(UnsupportedFileType):
        validate_file_meta("README", "text/plain")


def test_mime_mismatch_rejected():
    with pytest.raises(UnsupportedFileType):
        validate_file_meta("notes.txt", "image/png")


def test_generic_octet_stream_allowed():
    assert validate_file_meta("notes.txt", "application/octet-stream") == "txt"
    assert validate_file_meta("a.pdf", None) == "pdf"


# --- PDF ---------------------------------------------------------------------
def test_pdf_extracts_heading_bullets_and_counts():
    result = extract_upload("report.pdf", "application/pdf", pdf_bytes())
    assert result.page_count == 1
    assert "# Quarterly Report" in result.text
    assert "- Sales expanded in Europe." in result.text
    assert "Revenue grew by 12 percent" in result.text
    assert result.word_count > 5
    assert result.char_count == len(result.text)
    assert "Quarterly Report" in result.headings


def test_pdf_fake_magic_rejected():
    with pytest.raises(InvalidFile) as exc:
        extract_upload("fake.pdf", "application/pdf", b"not a pdf at all")
    assert exc.value.code == "invalid_file"


def test_pdf_scanned_requires_ocr():
    with pytest.raises(ScannedDocument) as exc:
        extract_upload("scan.pdf", "application/pdf", pdf_bytes(scanned=True))
    assert exc.value.code == "ocr_required"
    assert "OCR" in exc.value.message


def test_pdf_encrypted_rejected():
    with pytest.raises(InvalidFile):
        extract_upload("locked.pdf", "application/pdf", pdf_bytes(encrypted=True))


def test_pdf_without_text_is_empty():
    with pytest.raises(EmptyDocument):
        extract_upload("blank.pdf", "application/pdf", pdf_bytes(blank=True))


def test_pdf_corrupted_bytes():
    with pytest.raises((InvalidFile, CorruptedFile)):
        extract_upload("broken.pdf", "application/pdf", b"%PDF-1.7\n garbage")


def test_pdf_empty_file():
    with pytest.raises(EmptyDocument):
        extract_upload("zero.pdf", "application/pdf", b"")


# --- DOCX --------------------------------------------------------------------
def test_docx_preserves_headings_lists_tables():
    result = extract_upload("doc.docx", DOCX_MIME, docx_bytes())
    assert "# Introduction" in result.text
    assert "- Sales expanded in Europe." in result.text
    assert "- Costs stayed flat." in result.text
    assert "| Metric | Value |" in result.text
    assert "| Revenue | +12% |" in result.text
    assert result.table_count == 1
    assert "Introduction" in result.headings
    assert any("table" in w for w in result.warnings)


def test_docx_invalid_zip():
    with pytest.raises((InvalidFile, CorruptedFile)):
        extract_upload("bad.docx", DOCX_MIME, b"PK\x03\x04definitely not a zip")


def test_docx_zip_without_word_document():
    with pytest.raises((InvalidFile, CorruptedFile)) as exc:
        extract_upload("bad.docx", DOCX_MIME, zip_without_document_xml())
    assert exc.value.code in ("invalid_file", "corrupted_file")


def test_docx_empty_document():
    with pytest.raises(EmptyDocument):
        extract_upload("empty.docx", DOCX_MIME, docx_bytes(empty=True))


# --- TXT ---------------------------------------------------------------------
def test_txt_extracts_text_and_lists():
    raw = "Heading\n\nFirst paragraph.\n\n- one\n- two\n".encode()
    result = extract_upload("notes.txt", "text/plain", raw)
    assert result.word_count == 7
    assert "- one" in result.text
    assert result.page_count is None


def test_txt_unicode_preserved():
    raw = "Café résumé — naïve 日本語".encode("utf-8")
    result = extract_upload("unicode.txt", "text/plain", raw)
    assert "Café" in result.text and "日本語" in result.text


def test_txt_utf16_with_bom():
    raw = b"\xff\xfe" + "Hello UTF-16 world".encode("utf-16-le")
    result = extract_upload("utf16.txt", "text/plain", raw)
    assert "Hello UTF-16 world" in result.text


def test_txt_empty_rejected():
    with pytest.raises(EmptyDocument):
        extract_upload("empty.txt", "text/plain", b"   \n\t \n")


def test_txt_binary_rejected():
    with pytest.raises(InvalidFile):
        extract_upload("binary.txt", "text/plain", b"\x00\x01\x02\x03" * 50)


def test_render_lines_normalises_bullets_and_keeps_numbering():
    out = _render_lines(["\u2022 First item", "\u2022 Second item", "1. Numbered item"])
    assert out == ["- First item", "- Second item", "1. Numbered item"]


def test_unknown_extension_dispatcher():
    with pytest.raises(UnsupportedFileType):
        extract_upload("a.rtf", "application/rtf", b"{\\rtf1}")
