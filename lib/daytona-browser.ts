import type { Sandbox } from "@daytona/sdk"

const browserSetup = `set -eu
browser=ai-teammates-chromium.desktop
export XDG_CURRENT_DESKTOP=XFCE

case "$(xdg-settings get default-web-browser 2>/dev/null || true)" in
  ""|debian-sensible-browser.desktop|chromium.desktop|"$browser") ;;
  *) exit 0 ;;
esac

test -x /usr/bin/chromium
data_dir="\${XDG_DATA_HOME:-$HOME/.local/share}"
helper_dir="$data_dir/xfce4/helpers"
mkdir -p "$helper_dir"
helper=$(mktemp "$helper_dir/$browser.XXXXXX")
trap 'rm -f "$helper"' EXIT

cat > "$helper" <<'EOF'
[Desktop Entry]
Type=X-XFCE-Helper
Name=Chromium
Icon=chromium
X-XFCE-Category=WebBrowser
X-XFCE-Commands=/usr/bin/chromium --no-sandbox --disable-dev-shm-usage --no-first-run;
X-XFCE-CommandsWithParameter=/usr/bin/chromium --no-sandbox --disable-dev-shm-usage --no-first-run "%s";
EOF

mv -f "$helper" "$helper_dir/$browser"
xdg-settings set default-web-browser "$browser"
`

export async function configureDesktopBrowser(sandbox: Sandbox) {
  if (sandbox.snapshot !== "daytona-small") return

  // Chromium's Linux sandbox cannot start on this snapshot. Keep the flags
  // scoped to the launcher inside the teammate's isolated Daytona sandbox.
  const result = await sandbox.process.executeCommand(
    browserSetup,
    undefined,
    undefined,
    10
  )
  if (result.exitCode !== 0) {
    throw new Error("Could not configure the Daytona desktop browser.")
  }
}
