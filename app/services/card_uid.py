import re
from typing import Optional


IOS_SERIAL_STATUS_PATTERN = re.compile(
    r"serial\s+number(?:\s*[:：])?\s*([0-9a-fA-F][0-9a-fA-F](?:[\s:\-]?[0-9a-fA-F][0-9a-fA-F])*)",
    re.IGNORECASE,
)
IOS_SERIAL_ONLY_PATTERN = re.compile(
    r"^\s*([0-9a-fA-F][0-9a-fA-F](?:[\s:\-]?[0-9a-fA-F][0-9a-fA-F])*)\s*$"
)


class CardUIDNormalizationError(ValueError):
    """Raised when a card UID input cannot be normalized."""


def normalize_card_uid_input(
    rfid_uid: Optional[str] = None,
    ios_scan_text: Optional[str] = None,
) -> str:
    normalized_uid = (rfid_uid or "").strip()
    normalized_ios_text = (ios_scan_text or "").strip()

    if bool(normalized_uid) == bool(normalized_ios_text):
        raise CardUIDNormalizationError("請擇一提供卡片 ID 或 iOS NFC Tools 掃描結果")

    if normalized_uid:
        return normalized_uid

    serial_number = extract_ios_serial_number(normalized_ios_text)
    if not serial_number:
        raise CardUIDNormalizationError("找不到 iOS NFC Tools 的 Serial number 欄位")

    return convert_ios_serial_to_rfid_uid(serial_number)


def extract_ios_serial_number(text: str) -> Optional[str]:
    if not text:
        return None

    match = IOS_SERIAL_STATUS_PATTERN.search(text)
    if match:
        return match.group(1)

    match = IOS_SERIAL_ONLY_PATTERN.match(text)
    if match:
        return match.group(1)

    return None


def convert_ios_serial_to_rfid_uid(serial_number: str) -> str:
    compact_serial = re.sub(r"[\s:\-]", "", serial_number).upper()
    if len(compact_serial) != 8:
        raise CardUIDNormalizationError("目前僅支援 4-byte 的 iOS Serial number")

    if not re.fullmatch(r"[0-9A-F]{8}", compact_serial):
        raise CardUIDNormalizationError("iOS Serial number 格式不正確")

    byte_pairs = [compact_serial[index:index + 2] for index in range(0, len(compact_serial), 2)]
    reversed_hex = "".join(reversed(byte_pairs))
    decimal_uid = int(reversed_hex, 16)
    return str(decimal_uid).zfill(10)
