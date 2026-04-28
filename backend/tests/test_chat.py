from unittest.mock import patch, MagicMock

def test_chat_returns_reply(client, admin_token):
    with patch("backend.routers.chat.chat") as mock_chat:
        mock_chat.return_value = "You have 0 transactions in the system."
        res = client.post("/api/chat/", json={"message": "How many transactions do I have?"},
                          headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert "reply" in res.json()
    assert len(res.json()["reply"]) > 0

def test_chat_requires_auth(client):
    res = client.post("/api/chat/", json={"message": "hello"})
    assert res.status_code in (401, 403)
