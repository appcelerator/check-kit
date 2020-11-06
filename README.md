# check-kit

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Deps][david-image]][david-url]
[![Dev Deps][david-dev-image]][david-dev-url]

Checks if a newer version is available for command line interfaces.

It is designed for CLI's that want to be in control.

**What `check-kit` does:**

 * Checks if there is a new version available
 * Checks version for a specific dist tag
 * Fetches latest version from npm every so often
 * Persists the update metadata
 * Supports HTTP proxies

**What `check-kit` does _not_ do:**

 * Display a message if a new version is available

## Installation

    npm install check-kit --save

## Example

Basic usage:

```js
import check from 'check-kit';

(async () => {
    const { current, distTag, name, latest, updateAvailable } = await check();

    console.log(`Current version of package ${name} is ${current}`);

    if (updateAvailable) {
        console.log(`There is a new version available! ${current} -> ${latest}`);
    } else {
        console.log(`Version ${current} is the latest`);
    }
})();
```

If you know where the `package.json` is, you can pass it in:

```js
const result = await check({
    pkg: require('./package.json')
});
```

By default, `check-kit` will store update metadata in `/tmp/check-kit` directory. You can override
the directory, but not the metadata filename, by passing in the metadata directory:

```js
const result = await check({
    metaDir: `${os.homedir()}/myapp/update`
});
```

## API

### `async check(opts)`

Checks if the specified package has a newer version available.

`opts` and all options are optional.

| Option               | Type                 | Default    | Description                                             |
| -------------------- | -------------------- | ---------- | ------------------------------------------------------- |
| `opts.caFile`        | `String`             |            | A path to a PEM-formatted certificate authority bundle. |
| `opts.certFile`      | `String`             |            | A path to a client cert file used for authentication.   |
| `opts.checkInterval` | `Number`             | `3600000`  | The amount of time in milliseconds before checking for an update. Defaults to 1 hour. |
| `opts.cwd`           | `String`             | `"."`      | The current working directory used to locate the `package.json` if `opts.pkg` is not specified. |
| `opts.distTag`       | `String`             | `"latest"` | The tag to check for the latest version.                |
| `opts.force`         | `Boolean`            | `false`    | Forces an update check. |
| `opts.keyFile`       | `String`             |            | A path to a private key file used for authentication.   |
| `opts.metaDir `      | `String`             | `"/tmp/check-kit/"` | The directory to store package update information. The filename is derived by the package name and the dist tag. |
| `opts.pkg`           | `Object` \| `String` |            | The parsed `package.json`, path to the `package.json` file, or falsey and it will scan parent directories looking for a `package.json`. |
| `opts.proxy`         | `String`             |            | A proxy server URL. Can be `http` or `https`.           |
| `opts.registryUrl`   | `String`             |            | The npm registry URL. By default, it will autodetect the URL based on the package name/scope. |
| `opts.strictSSL`     | `Boolean`            | `true`     | When falsey, disables TLS/SSL certificate validation for both `https` requests and `https` proxy servers. |
| `opts.timeout`       | `Number`             | `1000`     | The number of milliseconds to wait to query npm before timing out. |

Returns a `Promise` that resolves the following:

| Property          | Type               | Description                                    |
| ----------------- | ------------------ | ---------------------------------------------- |
| `current`         | `String`           | The current version from the `package.json`.   |
| `distTag`         | `String`           | The dist tag used to check the version.        |
| `lastCheck`       | `Number`           | The timestamp the last check occurred.         |
| `latest`          | `String` \| `null` | The latest version returned from the registry or `null` if the package is not found. |
| `name`            | `String`           | The package name.                              |
| `updateAvailable` | `Boolean`          | Value is `true` if a new version is available. |

### Metadata file

The metadata file contains information about the package and whether an update is available based
on the last check.

You can override the directory where the metadata file is stored, but you cannot override the
metadata filename. The filename is derived from the package name and the distribution tag. For
example, the package `@foo/bar` would resolve the filename `@foo-bar-latest.json`.

## Legal

This project is open source under the [Apache Public License v2][1] and is developed by
[Axway, Inc](http://www.axway.com/) and the community. Please read the [`LICENSE`][1] file included
in this distribution for more information.

[1]: https://github.com/appcelerator/check-kit/blob/master/LICENSE
[npm-image]: https://img.shields.io/npm/v/check-kit.svg
[npm-url]: https://npmjs.org/package/check-kit
[downloads-image]: https://img.shields.io/npm/dm/check-kit.svg
[downloads-url]: https://npmjs.org/package/check-kit
[david-image]: https://img.shields.io/david/appcelerator/check-kit.svg
[david-url]: https://david-dm.org/appcelerator/check-kit
[david-dev-image]: https://img.shields.io/david/dev/appcelerator/check-kit.svg
[david-dev-url]: https://david-dm.org/appcelerator/check-kit#info=devDependencies
[hook-emitter]: https://www.npmjs.com/package/hook-emitter
