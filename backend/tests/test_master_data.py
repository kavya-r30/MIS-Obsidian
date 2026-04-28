def test_list_master_data(client, admin_token):
    res = client.get("/api/master-data/", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_create_master_data(client, admin_token):
    res = client.post("/api/master-data/", json={"data_type": "vendor", "value": "Test Vendor"}, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert res.json()["value"] == "Test Vendor"

def test_manager_cannot_create_master_data(client, manager_token):
    res = client.post("/api/master-data/", json={"data_type": "vendor", "value": "X"}, headers={"Authorization": f"Bearer {manager_token}"})
    assert res.status_code == 403
