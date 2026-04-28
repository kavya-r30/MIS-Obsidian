def test_list_rules_requires_auth(client):
    res = client.get("/api/rules/")
    assert res.status_code in (401, 403)

def test_create_rule_admin(client, admin_token):
    res = client.post("/api/rules/", json={"rule_name": "test_rule", "rule_type": "amount_threshold", "description": "Test"}, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert res.json()["rule_name"] == "test_rule"

def test_create_rule_manager_forbidden(client, manager_token):
    res = client.post("/api/rules/", json={"rule_name": "x", "rule_type": "amount_threshold", "description": "x"}, headers={"Authorization": f"Bearer {manager_token}"})
    assert res.status_code == 403

def test_update_rule(client, admin_token):
    create = client.post("/api/rules/", json={"rule_name": "upd_rule", "rule_type": "amount_threshold", "description": "desc"}, headers={"Authorization": f"Bearer {admin_token}"})
    rule_id = create.json()["id"]
    res = client.patch(f"/api/rules/{rule_id}", json={"is_active": False}, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert res.json()["is_active"] == False
