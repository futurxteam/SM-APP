import { Capacitor, registerPlugin } from '@capacitor/core';

const AppUpdaterPlugin = registerPlugin('AppUpdater');

const GITHUB_API =
  'https://api.github.com/repos/futurxteam/SM-APP/releases/latest';

const AppUpdater = {
  async check() {
    // Only run inside the native Android/iOS app
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      // Get the actual installed Android version
      const installed = await AppUpdaterPlugin.getVersion();

      console.log(
        'Installed version:',
        installed.versionCode,
        installed.versionName
      );

      // Check GitHub latest release
      const response = await fetch(GITHUB_API, {
        headers: {
          Accept: 'application/vnd.github+json',
        },
      });

      if (!response.ok) {
        console.log(
          'GitHub update check failed:',
          response.status
        );
        return;
      }

      const release = await response.json();

      // Read versionCode from GitHub release description
      const match = release.body?.match(
        /versionCode\s*:\s*(\d+)/i
      );

      if (!match) {
        console.log(
          'No versionCode found in GitHub release.'
        );
        return;
      }

      const latestVersionCode = Number(match[1]);

      console.log(
        'Latest version:',
        latestVersionCode,
        release.tag_name
      );

      // Already up to date
      if (latestVersionCode <= installed.versionCode) {
        console.log('App is already up to date.');
        return;
      }

      // Find APK
      const apk = release.assets?.find(
        (asset) => asset.name === 'SiteManagement.apk'
      );

      if (!apk) {
        console.log(
          'SiteManagement.apk not found in GitHub release.'
        );
        return;
      }

      // Ask user
      const update = window.confirm(
        `A new version ${release.tag_name} is available.\n\n` +
        `${release.name || ''}\n\n` +
        `Current version: ${installed.versionName}\n` +
        `New version: ${release.tag_name}\n\n` +
        `Would you like to update now?`
      );

      if (!update) {
        return;
      }

      // Download and launch Android installer
      await AppUpdaterPlugin.downloadAndInstall({
        url: apk.browser_download_url,
      });

    } catch (error) {
      console.error(
        'App update check failed:',
        error
      );
    }
  },
};

export default AppUpdater;