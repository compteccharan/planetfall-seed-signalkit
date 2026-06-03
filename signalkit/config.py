import os

_DEFAULT = 10.0


def default_timeout() -> float:
    val = os.environ.get("SIGNALKIT_TIMEOUT")
    if val is None:
        return _DEFAULT
    try:
        return float(val)
    except ValueError:
        return _DEFAULT
