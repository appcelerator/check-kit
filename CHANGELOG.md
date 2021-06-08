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
