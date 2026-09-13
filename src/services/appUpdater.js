import { Capacitor, registerPlugin } from '@capacitor/core';

const AppUpdaterPlugin = registerPlugin('AppUpdater');

const GITHUB_REPO = 'futurxteam/SM-APP';
const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

// Helper to extract clean semver array [major, minor, patch] from any version string (e.g., "v1.1.0" or "Site Management v1.1.0")
function extractSemver(str) {
  if (!str) return [0, 0, 0];
  const m = str.match(/\d+(\.\d+)*/);
  if (!m) return [0, 0, 0];
  return m[0].split('.').map((n) => parseInt(n, 10) || 0);
}

// Compare two version strings (returns true if latest is strictly higher than current)
function isSemverNewer(latestStr, currentStr) {
  const l = extractSemver(latestStr);
  const c = extractSemver(currentStr);
  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    const lNum = l[i] || 0;
    const cNum = c[i] || 0;
    if (lNum > cNum) return true;
    if (lNum < cNum) return false;
  }
  return false;
}

const AppUpdater = {
  async check(isManual = false) {
    try {
      // 1. If running in browser preview mode
      if (!Capacitor.isNativePlatform()) {
        console.log('[AppUpdater] Running in browser preview (not native Android).');
        if (isManual) {
          // Fetch GitHub release to show info to the user
          try {
            const res = await fetch(`${GITHUB_API}?t=${Date.now()}`, {
              headers: { Accept: 'application/vnd.github+json' },
            });
            if (res.ok) {
              const rel = await res.json();
              const tag = rel.tag_name || rel.name || 'v1.1.0';
              window.alert(
                `ℹ️ Update Check (Web Preview Mode)\n\n` +
                `Latest GitHub Release: ${tag}\n` +
                `Repository: github.com/${GITHUB_REPO}\n\n` +
                `Note: Automatic in-app APK downloading and installation runs directly inside the Android APK.`
              );
              return;
            }
          } catch (e) {
            // fallback
          }
          window.alert(
            'ℹ️ In-app APK auto-updating runs on Android devices.\n\nYou are currently previewing in a browser.'
          );
        }
        return;
      }

      // 2. Running on Android native platform - get installed version
      let installed = { versionCode: 1, versionName: '1.0.0' };
      try {
        installed = await AppUpdaterPlugin.getVersion();
      } catch (err) {
        console.warn('[AppUpdater] getVersion failed, using fallback:', err);
      }

      console.log(
        '[AppUpdater] Installed version on device:',
        installed.versionCode,
        installed.versionName
      );

      // 3. Check GitHub latest release with cache-busting timestamp
      const response = await fetch(`${GITHUB_API}?t=${Date.now()}`, {
        headers: {
          Accept: 'application/vnd.github+json',
        },
      });

      if (!response.ok) {
        console.warn('[AppUpdater] GitHub update check returned HTTP', response.status);
        if (isManual) {
          window.alert(`Unable to check for updates (HTTP ${response.status}). Please check your internet connection.`);
        }
        return;
      }

      const release = await response.json();

      // Read versionCode from GitHub release description if specified (e.g. "versionCode: 2")
      const match = release.body?.match(/versionCode\s*[:=]\s*(\d+)/i);
      const latestVersionCode = match ? Number(match[1]) : 0;
      const latestTag = release.tag_name || release.name || '';
      const installedTag = installed.versionName || '';

      console.log('[AppUpdater] GitHub Release Details:', {
        tag: latestTag,
        versionCode: latestVersionCode,
        installedTag: installedTag,
        installedCode: installed.versionCode,
      });

      // Check if latest is newer either by versionCode or semantic versioning
      const isNewerByCode = latestVersionCode > 0 && latestVersionCode > (installed.versionCode || 0);
      const isNewerByTag = isSemverNewer(latestTag, installedTag);
      const isNewVersionAvailable = isNewerByCode || isNewerByTag;

      if (!isNewVersionAvailable) {
        console.log('[AppUpdater] App is already up to date.');
        if (isManual) {
          window.alert(
            `✅ You're up to date!\n\n` +
            `Installed Version: ${installed.versionName || '1.1.0'} (code: ${installed.versionCode || 2})\n` +
            `Latest Release: ${latestTag}`
          );
        }
        return;
      }

      // Find APK asset from release assets
      const apk = release.assets?.find((asset) => {
        const name = (asset.name || '').toLowerCase();
        return (
          name.endsWith('.apk') ||
          name.includes('site-management') ||
          name.includes('sitemanagement')
        );
      });

      if (!apk || !apk.browser_download_url) {
        console.warn('[AppUpdater] No APK asset found in latest GitHub release.');
        if (isManual) {
          window.alert(`A new version ${latestTag} exists, but no .apk file was attached to the release.`);
        }
        return;
      }

      // Prompt user to install update
      const confirmUpdate = window.confirm(
        `🚀 New Version ${latestTag} Available!\n\n` +
        `${release.body ? release.body + '\n\n' : ''}` +
        `Current version: ${installed.versionName || '1.0.0'} (code: ${installed.versionCode || 1})\n` +
        `New version: ${latestTag}\n\n` +
        `Would you like to download and install this update now?`
      );

      if (!confirmUpdate) {
        return;
      }

      // Download and launch Android installer
      console.log('[AppUpdater] Downloading APK from:', apk.browser_download_url);
      await AppUpdaterPlugin.downloadAndInstall({
        url: apk.browser_download_url,
      });

    } catch (error) {
      console.error('[AppUpdater] App update check failed:', error);
      if (isManual) {
        window.alert(`Update check failed: ${error.message || error}`);
      }
    }
  },
};

export default AppUpdater;