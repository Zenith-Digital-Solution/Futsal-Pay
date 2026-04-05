import pytest

from src.apps.payout.services.encryption import _get_key, decrypt_credentials, encrypt_credentials


def test_encrypt_and_decrypt_credentials_round_trip():
    payload = {"mobile": "9800000000", "bank_name": "NIMB"}

    token = encrypt_credentials(payload)

    assert isinstance(token, str)
    assert token != str(payload)
    assert decrypt_credentials(token) == payload


def test_get_key_is_stable_for_current_secret():
    key1 = _get_key()
    key2 = _get_key()

    assert key1 == key2
    assert len(key1) == 32


def test_decrypt_credentials_rejects_invalid_token():
    with pytest.raises(Exception):
        decrypt_credentials("not-a-valid-token")
