# Bread Box

A Manifest V3 Chromium extension with persistent account containers backed by independent browser user data directories. Cookies, local storage, IndexedDB, service workers and browser settings belong to each profile. No dependencies, hosted service, telemetry, cookie interception or remote debugging.

## Run locally

Requires Node.js 22+ and a locally installed Chrome, Chromium, Brave or Edge on Linux or macOS. Windows and sandbox-packaged browsers (Snap/Flatpak) are not supported yet.

1. Open `chrome://extensions` (or your browser's extensions page), enable **Developer mode**, choose **Load unpacked**, and select this project's `extension` folder.
2. Open Bread Box from the browser's Extensions menu and click **Download installer**. Run the downloaded file. Bread Box identifies the browser hosting the extension and prepares its installer automatically, including the extension ID and all companion files. You do not need to select a browser or have the project folder available when running the installer.
3. Click **Check connection** in the popup (reopen it if it closed). Once connected, create a container and click its name to open it. Log in normally; subsequent opens retain that account. Check **Open the current page** to send a page to a container, or right-click a link and select **Open link in container**.

To enable another browser, load the extension in that browser and repeat its setup. No administrator access or npm dependency installation is needed.

Downloaded scripts may need permission to execute. On Linux, use the file's Properties to allow running it as a program, then choose Run in Terminal where supported. On macOS, the `.command` file may also need execute permission before opening in Terminal. Some systems require running shell scripts from a terminal. This is a portable script installer, not a signed desktop installer; Node.js 22+ must already be installed.

For advanced or scripted installation:

```sh
node native/install.mjs --extension-id YOUR_EXTENSION_ID --browser chrome
```

For this developer command, `--browser` is required and accepts `chrome`, `chromium`, `brave`, or `edge`. For a nonstandard installation add `--executable /absolute/path/to/browser`. Normal setup fills in the browser automatically.

The installer copies the companion into `~/.bread-box/host/` and registers it with the browser hosting the extension for this extension ID. It uses the absolute path of the Node executable running the installer; rerun installation if you move or remove that Node version. Reload the extension after code changes. After changing companion sources, run `npm run build` to refresh the packaged installer, reload the extension and download/run a new installer. No npm dependency installation is required.

## Current behavior and limits

- Each container opens in its own browser profile/window. Repeated opens use the running profile. Chromium cannot provide Firefox's native per-tab containers through its public extension APIs.
- Names and color dots identify containers in the launcher. Native browser tab strips/window frames are not colored by this version.
- Opening a page leaves its original tab untouched. Existing login state is never copied into a container.
- The extension starts in your main browser profile. Fresh container profiles have their own extensions and settings; Bread Box is not automatically installed into them. Load it manually there if you want the launcher in those windows, then rerun the companion installer for the ID shown there. Native registration allows the most recently installed ID for that browser.
- Separate profiles isolate browser storage; they are not OS sandboxes and do not hide your IP address or prevent fingerprinting. Avoid enabling browser sync across containers if you want their settings to remain independent.
- This initial version supports creation, renaming, persistent sessions and link launching. Domain routing, deletion, import/export and Windows packaging are future work.
- Catalogs are shared between Bread Box installations for the same browser. Different browser families have separate catalogs. Container deletion is deliberately absent to avoid accidentally deleting active login data.

Data lives in `~/.bread-box/data/<browser>/`: `containers.json` stores names/colors and `profiles/<id>/` holds browser-managed account data. Back up that directory only while its browser windows are closed. The companion uses private permissions for its data directory and validates URL schemes, container identifiers and caller origins. Browser launch arguments are passed directly without a shell.

To uninstall the bridge, remove `com.breadbox.containers.json` from your browser's `NativeMessagingHosts` directory and remove `~/.bread-box/host/`. On Linux the registration is under `~/.config/<browser>/NativeMessagingHosts`; on macOS it is under `~/Library/Application Support/<browser>/NativeMessagingHosts` (vendor paths vary). Keep the data folder to retain logins. Close all container windows before intentionally deleting any profile data.

If the popup says setup is needed, download a fresh installer from the affected browser and run it again. If a killed companion leaves `catalog.lock` behind, ensure no companion is running and remove that empty directory from the data folder.

## Validation

```sh
npm test
```

Tests cover persistent catalog updates, concurrent writers, isolated launch directories, argument/URL validation, companion installation, caller validation and native-message framing through a real subprocess with a fake browser executable. Actual browser logins and macOS behavior still require manual verification.

Manual acceptance: open Work and Personal on the same site, log into different accounts, refresh both, then close/reopen them and confirm each retains its own login. Check link launching and invalid URL errors. Browser testing requires a graphical browser; the development environment used for this version has none installed.

Architecture references: [Chromium user data directories](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/user_data_dir.md), [Chrome native messaging](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging).
