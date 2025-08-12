# noblankfavicons - how to install

1. Download the latest release.
2. Extract the `noblankfavicons.zip` file somewhere on your machine.
3. Open Chrome and go to `chrome://extensions/`.
4. Toggle **Developer mode** on (top-right).
5. Click **Load unpacked** and select the `extension` folder, within the `noblankfavicons` foldier.
6. Visit any website that has no favicon (or remove the `link[rel~='icon']` tags in devtools) and verify the generated favicon appears. [https://example.com] is a great website to test, as it has no favicon.

Notes:
- This extension uses a content script and will not run on `chrome://` pages, the Chrome Web Store, or extension pages.
- The built-in identicon is deterministic and based on the page hostname, so the same host will always get the same icon.
- There is a bug where sometimes websites with favicons get replaced by *noblankfavicons*'. This may be an issue with Chrome itself.
