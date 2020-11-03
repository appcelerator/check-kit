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
 * Supports HTTP proxies

**What `check-kit` does _not_ do:**

 * Determine if the check should happen
 * Display a message if a new version is available
 * Record when the last check occurred

## Installation

    npm install check-kit --save

## Example

```js
import check from 'check-kit';
import fs from 'fs';

(async () => {
    // It's the caller's responsibility to determine if the check should be performed
    // AND when the last check was performed
    let shouldCheck = !process.env.NO_UPDATE_NOTIFIER && process.env.NODE_ENV !== 'test';
    if (shouldCheck) {
        try {
            const lastCheck = parseInt(fs.readFileSync('.lastcheck', 'utf8'));
            if (!isNaN(lastCheck) && lastCheck + (24 * 60 * 60 * 1000) < Date.now()) {
                shouldCheck = false;
            }
        } catch (e) {
            // fall through
        }
    }

    if (shouldCheck) {
        // perform the check
        const { current, distTag, name, latest, update } = await check();

        console.log(`Current version is ${current}`);

        if (update) {
            console.log(`There is a new version available! ${latest}`);
        } else {
            console.log(`Version ${current} is the latest`);
        }

        fs.writeFileSync('.lastcheck', Date.now());
    }
})();
```

If you know where the `package.json` is, you can pass it in:

```js
const result = await check({
    pkg: require('./package.json')
});
```

## API

### `async check(opts)`

Checks if the specified package has a newer version available.

All options are optional.

| Option             | Type                 | Default    | Description                                             |
| ------------------ | -------------------- | ---------- | ------------------------------------------------------- |
| `opts.caFile`      | `String`             |            | A path to a PEM-formatted certificate authority bundle. |
| `opts.certFile`    | `String`             |            | A path to a client cert file used for authentication.   |
| `opts.cwd`         | `String`             | `"."`      | The current working directory.                          |
| `opts.distTag`     | `String`             | `"latest"` | The tag to check for the latest version.                |
| `opts.keyFile`     | `String`             |            | A path to a private key file used for authentication.   |
| `opts.pkg`         | `Object` \| `String` |            | The parsed `package.json`, path to the `package.json` file, or falsey and it will scan parent directories looking for a `package.json`. |
| `opts.proxy`       | `String`             |            | A proxy server URL. Can be `http` or `https`.           |
| `opts.registryUrl` | `String`             |            | The npm registry URL. By default, it will autodetect the URL based on the package name/scope. |
| `opts.strictSSL`   | `Boolean`            | `true`     | When falsey, disables TLS/SSL certificate validation for both `https` requests and `https` proxy servers. |

Returns a `Promise` that resolves the following:

| Property  | Type               | Description                                    |
| --------- | ------------------ | ---------------------------------------------- |
| `current` | `String`           | The current version from the `package.json`.   |
| `distTag` | `String`           | The dist tag used to check the version.        |
| `name`    | `String`           | The package name.                              |
| `latest`  | `String` \| `null` | The latest version returned from the registry or `null` if the package is not found. |
| `update`  | `Boolean`          | Value is `true` if a new version is available. |

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
