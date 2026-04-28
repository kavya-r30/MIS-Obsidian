from datetime import date
from backend.core.fiscal import fiscal_period, fy_start_iso, fy_end_iso


def test_april_first_is_q1_of_new_fy():
    assert fiscal_period(date(2026, 4, 1)) == ("2026-27", "Q1")


def test_june_thirty_is_q1():
    assert fiscal_period(date(2026, 6, 30)) == ("2026-27", "Q1")


def test_july_first_is_q2():
    assert fiscal_period(date(2026, 7, 1)) == ("2026-27", "Q2")


def test_september_thirty_is_q2():
    assert fiscal_period(date(2026, 9, 30)) == ("2026-27", "Q2")


def test_october_first_is_q3():
    assert fiscal_period(date(2026, 10, 1)) == ("2026-27", "Q3")


def test_december_thirty_one_is_q3():
    assert fiscal_period(date(2026, 12, 31)) == ("2026-27", "Q3")


def test_january_first_belongs_to_previous_fy_q4():
    assert fiscal_period(date(2027, 1, 1)) == ("2026-27", "Q4")


def test_march_thirty_one_is_last_day_of_q4():
    assert fiscal_period(date(2027, 3, 31)) == ("2026-27", "Q4")


def test_fy_start_iso_q1_is_april_first():
    assert fy_start_iso("2026-27", "Q1") == "2026-04-01"


def test_fy_start_iso_q4_is_january_first():
    assert fy_start_iso("2026-27", "Q4") == "2027-01-01"


def test_fy_end_iso_q1_is_june_thirty():
    assert fy_end_iso("2026-27", "Q1") == "2026-06-30"


def test_fy_end_iso_q4_is_march_thirty_one():
    assert fy_end_iso("2026-27", "Q4") == "2027-03-31"


def test_fy_start_iso_q2_is_july_first():
    assert fy_start_iso("2026-27", "Q2") == "2026-07-01"


def test_fy_start_iso_q3_is_october_first():
    assert fy_start_iso("2026-27", "Q3") == "2026-10-01"


def test_fy_end_iso_q2_is_september_thirty():
    assert fy_end_iso("2026-27", "Q2") == "2026-09-30"


def test_fy_end_iso_q3_is_december_thirty_one():
    assert fy_end_iso("2026-27", "Q3") == "2026-12-31"
