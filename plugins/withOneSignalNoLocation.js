/**
 * Expo config plugin: remove OneSignal's CoreLocation dependency.
 *
 * ROOT CAUSE:
 *   react-native-onesignal.podspec declares:
 *     s.dependency 'OneSignalXCFramework', '5.x.x'
 *   With no subspec specified, CocoaPods resolves to the default subspec
 *   'OneSignalComplete', which explicitly includes 'OneSignalLocation'.
 *   OneSignalLocation.xcframework links against CoreLocation, which causes
 *   Apple to require NSLocationWhenInUseUsageDescription → ITMS-90683.
 *
 * FIX:
 *   1. Explicitly declare `pod 'OneSignalXCFramework/OneSignal'` in the
 *      Podfile. When CocoaPods sees an explicit subspec declaration it uses
 *      that instead of the default, so OneSignalLocation is never pulled in.
 *      The 'OneSignal' subspec includes: Core, OSCore, Outcomes, Extension,
 *      Notifications, User, LiveActivities — everything needed for push
 *      notifications. It excludes: OneSignalLocation, OneSignalInAppMessages.
 *
 *   2. Add a post_install hook that removes any CoreLocation linker flags
 *      that may have been injected by other means (belt-and-suspenders).
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '# [withOneSignalNoLocation]';

// Explicit subspec override — placed inside the main target block so
// CocoaPods picks it up during dependency resolution.
const SUBSPEC_OVERRIDE = `
  ${MARKER} Override OneSignalXCFramework to exclude OneSignalLocation (CoreLocation).
  # The default subspec 'OneSignalComplete' includes OneSignalLocation which
  # links CoreLocation and triggers ITMS-90683. Explicitly requesting only
  # the 'OneSignal' subspec excludes Location and InAppMessages.
  pod 'OneSignalXCFramework/OneSignal'
`;

// post_install strip — removes any residual CoreLocation linker flags.
const POST_INSTALL_STRIP = `
  ${MARKER} Strip CoreLocation linker flags from all targets.
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      flags = config.build_settings['OTHER_LDFLAGS']
      if flags.is_a?(Array)
        config.build_settings['OTHER_LDFLAGS'] = flags.reject { |f| f.to_s.include?('CoreLocation') }
      elsif flags.is_a?(String)
        config.build_settings['OTHER_LDFLAGS'] = flags.gsub(/-framework\\s+"?CoreLocation"?/, '').strip
      end
    end
  end
`;

/**
 * @param {import('@expo/config-plugins').ExpoConfig} config
 */
const withOneSignalNoLocation = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (modConfig) => {
      const podfilePath = path.join(
        modConfig.modRequest.platformProjectRoot,
        'Podfile'
      );

      if (!fs.existsSync(podfilePath)) {
        console.warn('[withOneSignalNoLocation] Podfile not found — skipping patch.');
        return modConfig;
      }

      let podfile = fs.readFileSync(podfilePath, 'utf8');

      // Idempotent: skip if already patched
      if (podfile.includes(MARKER)) {
        return modConfig;
      }

      // ── Step 1: inject explicit subspec pod declaration ──────────────────
      // Insert it inside the main `target 'ChroniqoStopwatches' do` block
      // (or whatever the main target is named). We look for the first
      // `target '...' do` line and insert right after it.
      const targetMatch = podfile.match(/(\n\s*target '[^']+' do\n)/);
      if (targetMatch) {
        const insertAt = podfile.indexOf(targetMatch[0]) + targetMatch[0].length;
        podfile =
          podfile.slice(0, insertAt) +
          SUBSPEC_OVERRIDE +
          podfile.slice(insertAt);
      } else {
        // Fallback: append before the final `end`
        const lastEnd = podfile.lastIndexOf('\nend');
        if (lastEnd !== -1) {
          podfile =
            podfile.slice(0, lastEnd) +
            '\n' + SUBSPEC_OVERRIDE +
            podfile.slice(lastEnd);
        }
      }

      // ── Step 2: inject post_install strip ────────────────────────────────
      if (podfile.includes('post_install do |installer|')) {
        podfile = podfile.replace(
          'post_install do |installer|',
          'post_install do |installer|\n' + POST_INSTALL_STRIP
        );
      } else {
        podfile += '\npost_install do |installer|\n' + POST_INSTALL_STRIP + '\nend\n';
      }

      fs.writeFileSync(podfilePath, podfile);
      console.log(
        '[withOneSignalNoLocation] Patched Podfile: ' +
        'OneSignalXCFramework/OneSignal subspec declared, CoreLocation stripped.'
      );

      return modConfig;
    },
  ]);
};

module.exports = withOneSignalNoLocation;
