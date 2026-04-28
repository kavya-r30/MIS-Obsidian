from datetime import date


def fiscal_period(d: date) -> tuple[str, str]:
    """Map a date to (fiscal_year, quarter) for Indian fiscal calendar.
    FY runs April–March. Q1=Apr–Jun, Q2=Jul–Sep, Q3=Oct–Dec, Q4=Jan–Mar."""
    if d.month >= 4:
        fy_start = d.year
        q_num = (d.month - 4) // 3 + 1
    else:
        fy_start = d.year - 1
        q_num = 4
    return f"{fy_start}-{(fy_start + 1) % 100:02d}", f"Q{q_num}"


_Q_TO_START_MONTH = {"Q1": 4, "Q2": 7, "Q3": 10, "Q4": 1}
_Q_TO_END = {"Q1": (6, 30), "Q2": (9, 30), "Q3": (12, 31), "Q4": (3, 31)}


def _fy_start_year(fy: str) -> int:
    return int(fy.split("-")[0])


def fy_start_iso(fy: str, quarter: str) -> str:
    year = _fy_start_year(fy)
    month = _Q_TO_START_MONTH[quarter]
    if quarter == "Q4":
        year += 1
    return f"{year:04d}-{month:02d}-01"


def fy_end_iso(fy: str, quarter: str) -> str:
    year = _fy_start_year(fy)
    month, day = _Q_TO_END[quarter]
    if quarter == "Q4":
        year += 1
    return f"{year:04d}-{month:02d}-{day:02d}"
