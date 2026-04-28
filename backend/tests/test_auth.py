def test_login_success(client, admin_user):
    res = client.post("/api/auth/login", json={"email": "admin@test.com", "password": "password"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "admin"

def test_login_wrong_password(client, admin_user):
    res = client.post("/api/auth/login", json={"email": "admin@test.com", "password": "wrong"})
    assert res.status_code == 401

def test_login_unknown_email(client):
    res = client.post("/api/auth/login", json={"email": "nobody@test.com", "password": "x"})
    assert res.status_code == 401
