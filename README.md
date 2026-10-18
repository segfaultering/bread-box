# Bread Box

Bread Box is a browser extension that keeps your accounts in separate, persistent browser profiles. Use it to stay signed into work, personal, or client accounts on the same website without repeatedly logging out.

## How it works

Create a named container, then open it from the extension. A small local Node.js companion launches your browser with a separate profile for that container. Each profile keeps its own cookies, local storage, IndexedDB, service workers, and settings, so your sessions survive closing and reopening the browser.

Containers open in separate browser windows. All data stays on your computer; Bread Box has no hosted service, cloud account, or telemetry.

## Features

- Create and rename containers, with color markers in the launcher.
- Keep independent logins for the same website.
- Open the current page in a container while leaving the original tab open.
- Right-click a link and choose **Open link in container**.
- Reuse existing containers and their saved sessions.

## Technologies

- **JavaScript, HTML, and CSS** for the extension interface.
- **Chromium Manifest V3** with a background service worker and context menus.
- **Native Messaging** to connect the extension to the local companion.
- **Node.js 22+** for profile management, installation, and tests.

No third-party dependencies or npm installation are required.

## Set up locally

You need **Linux or macOS**, **Node.js 22 or newer**, and a locally installed **Chrome, Chromium, Brave, or Edge**. Windows and Snap/Flatpak browser installations are not supported yet.

1. Clone the project and enter its directory:

   ```sh
   git clone https://github.com/segfaultering/bread-box.git
   cd bread-box
   ```

2. Open your browser's extensions page (for example, `chrome://extensions`), enable **Developer mode**, click **Load unpacked**, and select the project's `extension` folder.
3. Open **Bread Box** from the Extensions menu. Click **Download installer**, then run the downloaded script. It automatically includes your browser, extension ID, and companion files. No administrator access is needed.
4. Return to the popup and click **Check connection**. Create a container, click its name, and log into your website normally.

Downloaded scripts may need execute permission. On Linux, allow execution in the file's Properties and choose **Run in Terminal** where available. On macOS, give the `.command` file execute permission and open it in Terminal. You can also run either script from a terminal with `sh /path/to/downloaded-file`.

Repeat setup for each browser you want to use. If the connection fails, download and run a fresh installer from that browser. Rerun it if you move or remove the Node.js version used during installation.

### Manual companion installation

Instead of downloading the installer, copy the extension ID from your browser's extensions page and run:

```sh
npm run install:host -- --extension-id YOUR_EXTENSION_ID --browser chrome
```

The browser option accepts `chrome`, `chromium`, `brave`, or `edge`. For a nonstandard browser location, add `--executable /absolute/path/to/browser`.

## Development

```sh
npm test        # Run the automated tests
npm run build   # Rebuild the bundled companion installer
```

Reload the extension after extension changes. After changing companion code in `native/`, rebuild the installer, reload the extension, and download and run the new installer.

The code is organized into `extension/` (interface and browser integration), `native/` (local companion), `scripts/` (installer bundling), and `test/` (automated tests).

## Data and limitations

Container data lives in `~/.bread-box/data/<browser>/`: `containers.json` stores the catalog, and `profiles/` holds browser profiles. Close container windows before backing up this directory. Containers are shared between Bread Box installations for the same browser; different browsers have separate catalogs.

- Isolation is per window/profile, rather than per tab. Color markers appear only in the launcher.
- Existing logins are not copied into containers. Fresh profiles have their own extensions and settings; Bread Box is not automatically installed in them.
- Separate profiles do not hide your IP address or prevent fingerprinting. Avoid browser sync across containers if you want settings to stay independent.
- Container deletion, automatic domain routing, and import/export are not implemented yet.
