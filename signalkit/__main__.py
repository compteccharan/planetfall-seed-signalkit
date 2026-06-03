import sys

from .client import fetch_frames


def main():
    if len(sys.argv) != 2:
        print("usage: python3 -m signalkit <url>", file=sys.stderr)
        sys.exit(1)
    frame = fetch_frames(sys.argv[1])
    for key, value in frame.items():
        print(f"{key}={value}")


if __name__ == "__main__":
    main()
