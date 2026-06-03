import unittest
import urllib.request

import signalkit.client as client_module
from signalkit.client import fetch


class TestReproFlaky(unittest.TestCase):
    """Repro harness for the flaky telemetry fetch path.

    With max_retries=0 (the current default), a single transient failure is not
    swallowed by retry logic — it propagates immediately and deterministically.
    Previously, max_retries=3 masked the failure: a retry could succeed by chance,
    making the root cause invisible during debugging.
    """

    def test_single_transient_failure_propagates_immediately(self):
        calls = []

        def failing_urlopen(url, timeout):
            calls.append(url)
            raise OSError("transient telemetry error")

        original_urlopen = urllib.request.urlopen
        original_sleep = client_module.time.sleep
        slept = []
        try:
            urllib.request.urlopen = failing_urlopen
            client_module.time.sleep = slept.append

            with self.assertRaises(OSError, msg="failure must propagate, not be swallowed"):
                fetch("http://example.com/frame")
        finally:
            urllib.request.urlopen = original_urlopen
            client_module.time.sleep = original_sleep

        self.assertEqual(len(calls), 1, "exactly one attempt with max_retries=0")
        self.assertEqual(slept, [], "no sleep between retries when max_retries=0")


if __name__ == "__main__":
    unittest.main()
