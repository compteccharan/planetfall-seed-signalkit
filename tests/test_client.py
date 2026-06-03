import io
import unittest
import urllib.request

import signalkit.client as client_module
from signalkit.client import fetch, fetch_frames


class FakeResponse:
    def __init__(self, body: bytes):
        self._body = body

    def read(self):
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass


class TestFetch(unittest.TestCase):
    def test_retries_twice_then_succeeds(self):
        calls = []

        def fake_urlopen(url, timeout):
            calls.append(url)
            if len(calls) < 3:
                raise OSError("simulated network error")
            return FakeResponse(b"hello telemetry")

        original = urllib.request.urlopen
        try:
            urllib.request.urlopen = fake_urlopen
            # patch sleep so the test doesn't actually wait
            slept = []
            original_sleep = client_module.time.sleep
            client_module.time.sleep = slept.append

            result = fetch("http://example.com/frame")
        finally:
            urllib.request.urlopen = original
            client_module.time.sleep = original_sleep

        self.assertEqual(result, b"hello telemetry")
        self.assertEqual(len(calls), 3)
        self.assertEqual(slept, [0.5, 1.0])  # sleep(0.5*1) then sleep(0.5*2)

    def test_raises_after_all_attempts_fail(self):
        def always_fail(url, timeout):
            raise OSError("always fails")

        original = urllib.request.urlopen
        original_sleep = client_module.time.sleep
        try:
            urllib.request.urlopen = always_fail
            client_module.time.sleep = lambda _: None
            with self.assertRaises(OSError):
                fetch("http://example.com/frame", max_retries=3)
        finally:
            urllib.request.urlopen = original
            client_module.time.sleep = original_sleep


class TestFetchFrames(unittest.TestCase):
    def _patch(self, body: bytes):
        original_urlopen = urllib.request.urlopen
        original_sleep = client_module.time.sleep
        urllib.request.urlopen = lambda url, timeout: FakeResponse(body)
        client_module.time.sleep = lambda _: None
        return original_urlopen, original_sleep

    def _restore(self, original_urlopen, original_sleep):
        urllib.request.urlopen = original_urlopen
        client_module.time.sleep = original_sleep

    def test_returns_parsed_dict(self):
        orig_u, orig_s = self._patch(b"sensor=A\nvalue=99\n")
        try:
            result = fetch_frames("http://example.com/frame")
        finally:
            self._restore(orig_u, orig_s)
        self.assertEqual(result, {"sensor": "A", "value": "99"})

    def test_empty_body_returns_empty_dict(self):
        orig_u, orig_s = self._patch(b"")
        try:
            result = fetch_frames("http://example.com/frame")
        finally:
            self._restore(orig_u, orig_s)
        self.assertEqual(result, {})

    def test_kwargs_forwarded_to_fetch(self):
        calls = []

        def fake_urlopen(url, timeout):
            calls.append(timeout)
            return FakeResponse(b"k=v\n")

        original_urlopen = urllib.request.urlopen
        original_sleep = client_module.time.sleep
        urllib.request.urlopen = fake_urlopen
        client_module.time.sleep = lambda _: None
        try:
            fetch_frames("http://example.com/frame", timeout=42.0)
        finally:
            urllib.request.urlopen = original_urlopen
            client_module.time.sleep = original_sleep

        self.assertEqual(calls, [42.0])


if __name__ == "__main__":
    unittest.main()
