# v3.0.1 (July 7, 2022)

 * fix: Added missing `src` directory. Doh!

# v3.0.0 (July 7, 2022)

 * BREAKING CHANGE: Require Node.js 14.15.0 LTS or newer.
 * BREAKING CHANGE: Changed package to a ES module.
 * chore: Updated dependencies.

# v2.0.0 (Feb 15, 2022)

 * BREAKING CHANGE: Require Node.js 12.13.0 LTS or newer.
 * fix: Fixed handling of 404 requests when getting latest version.
 * chore: Updated dependencies.

# v1.2.1 (Jun 8, 2021)

 * fix: Writing a file with a mode was applying the mode to the file and newly created directories.
 * fix: Default new directories to mode 777.

# v1.2.0 (Jun 7, 2021)

 * feat: Added `applyOwner` flag with default of `true` which sets the owner of the metadata file
   to the owner of closest existing parent directory to protect against commands run as sudo.
 * chore: Updated dependencies.

# v1.1.2 (Jan 25, 2021)

 * fix: Always recalculate the update available flag and write the results to disk in order to
   prevent a stale update available flag. ([CLI-106](https://jira.axway.com/browse/CLI-106))
 * chore: Updated dependencies.

# v1.1.1 (Jan 5, 2021)

 * chore: Updated dependencies.

# v1.1.0 (Dec 1, 2020)

 * fix: Bumped minimum Node.js requirement to 10.19.0 to prevent warnings on install.
 * chore: Updated dependencies.

# v1.0.2 (Nov 30, 2020)

 * chore: Updated dependencies.

# v1.0.1 (Nov 9, 2020)

 * fix: Fixed typo that caused npm to be checked every time.

# v1.0.0 (Nov 9, 2020)

 * Initial release with support for:
   - Fetching the latest version for a specific dist tag
   - Fetches latest version from npm every so often
   - Persist the update metadata
   - HTTP proxy support
