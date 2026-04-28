import unittest

from app.services.card_uid import (
    CardUIDNormalizationError,
    convert_ios_serial_to_rfid_uid,
    normalize_card_uid_input,
)


class CardUIDNormalizationTests(unittest.TestCase):
    def test_convert_serial_number_to_rfid_uid(self):
        self.assertEqual(convert_ios_serial_to_rfid_uid("F2:F1:51:14"), "0340914674")

    def test_extracts_serial_number_from_tag_detail(self):
        sample = """
        Tag type : ISO 14443-4
        Mifare Plus
        Serial number
        F2:F1:51:14
        Historical Bytes
        0xC1052F2F01BCD6B791
        """

        self.assertEqual(normalize_card_uid_input(ios_scan_text=sample), "0340914674")

    def test_rejects_non_4_byte_serial_numbers(self):
        with self.assertRaises(CardUIDNormalizationError):
            convert_ios_serial_to_rfid_uid("01:23:45:67:89:AB:CD")

    def test_requires_exactly_one_input_source(self):
        with self.assertRaises(CardUIDNormalizationError):
            normalize_card_uid_input()

        with self.assertRaises(CardUIDNormalizationError):
            normalize_card_uid_input(rfid_uid="1234567890", ios_scan_text="F2:F1:51:14")


if __name__ == "__main__":
    unittest.main()
