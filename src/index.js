import fs from 'fs-extra';
import path from 'path';
import semver from 'semver';
import snooplogg from 'snooplogg';
import * as request from '@axway/amplify-request';
import { isCI } from 'ci-info';
import tmp from 'tmp';
import { writeFileSync } from './fsutil.js';

const { error, log, warn } = snooplogg('check-kit');
const { highlight } = snooplogg.styles;

/**
 * Checks if there's an new version of a package is available.
 *
 * @param {Object} [opts] - Various options.
 * @param {Boolean} [opts.applyOwner=true] - When `true`, determines the owner of the closest
 * existing parent directory and apply the owner to the file and any newly created directories.
 * @param {String} [opts.caFile] - A path to a PEM-formatted certificate authority bundle.
 * @param {String} [opts.certFile] - A path to a client cert file used for authentication.
 * @param {Number} [opts.checkInterval=3600000] - The amount of time in milliseconds before
 * checking for an update. Defaults to 1 hour.
 * @param {String} [opts.cwd] - The current working directory used to locate the `package.json` if
 * `pkg` is not specified.
 * @param {String} [opts.distTag='latest'] - The tag to check for the latest version.
 * @param {Boolean} [opts.force=false] - Forces an update check.
 * @param {String} [opts.keyFile] - A path to a private key file used for authentication.
 * @param {String} [opts.metaDir] - The directory to store package update information.
 * @param {Object|String} [opts.pkg] - The parsed `package.json`, path to the package.json file, or
 * falsey and it will scan parent directories looking for a package.json.
 * @param {String} [opts.proxy] - A proxy server URL. Can be `http` or `https`.
 * @param {String} [opts.registryUrl] - The npm registry URL. By default, it will autodetect the
 * URL based on the package name/scope.
 * @param {Boolean} [opts.strictSSL=true] - When falsey, disables TLS/SSL certificate validation
 * for both `https` requests and `https` proxy servers.
 * @param {Number} [opts.timeout=1000] - The number of milliseconds to wait to query npm before
 * timing out.
 * @returns {Promise} Resolves an object containing the update information.
 */
export async function check(opts = {}) {
	if (!opts || typeof opts !== 'object') {
		throw new TypeError('Expected options to be an object');
	}

	let {
		checkInterval = 3600000, // 1 hour
		distTag = 'latest',
		force,
		metaDir
	} = opts;

	// bail immediately if update notifications have been explicitly disabled or we're running
	// within a test
	if (!force && !process.env.FORCE_UPDATE_NOTIFIER && (process.env.NO_UPDATE_NOTIFIER || process.env.NODE_ENV === 'test' || isCI)) {
		return {};
	}

	if (!distTag || typeof distTag !== 'string') {
		throw new TypeError('Expected distTag to be a non-empty string');
	}

	// determine the meta directory
	if (!metaDir) {
		metaDir = process.env.TEST_META_DIR || path.join(tmp.tmpdir, 'check-kit');
	} else if (typeof metaDir !== 'string') {
		throw new TypeError('Expected metaDir to be a string');
	}

	// load the package.json
	const { name, version } = await loadPackageJson(opts);
	if (!name || typeof name !== 'string') {
		throw new Error('Expected name in package.json to be a non-empty string');
	}
	if (!version || typeof version !== 'string') {
		throw new Error('Expected version in package.json to be a non-empty string');
	}

	const now = Date.now();
	const metaFile = path.resolve(metaDir, `${name.replace(/[/\\]/g, '-')}-${distTag}.json`);
	const meta = Object.assign(
		{
			latest: null,
			lastCheck: null,
			updateAvailable: false
		},
		await loadMetaFile(metaFile),
		{
			current: version,
			distTag,
			name
		}
	);

	// get the latest version from npm if:
	//  - forcing update
	//  - or there is no meta data
	//  - or there's no last check timestamp
	//  - or the last check is > check interval
	if (force || !meta.lastCheck || (now > meta.lastCheck + checkInterval)) {
		try {
			meta.latest = await getLatestVersion(name, distTag, opts);
			meta.lastCheck = now;
		} catch (err) {
			// check if we're offline
			/* istanbul ignore if */
			if (err.code === 'ENOTFOUND') {
				warn(err.message);
			} else {
				throw err;
			}
		}
	}

	meta.updateAvailable = meta.latest ? semver.gt(meta.latest, version) : false;
	await writeFileSync(metaFile, JSON.stringify(meta, null, 2), { applyOwner: opts.applyOwner });

	if (meta.updateAvailable) {
		log(`${highlight(`${name}@${version}`)} has newer version ${highlight(meta.latest)} available`);
	} else if (meta.latest) {
		log(`${highlight(`${name}@${version}`)} is already the latest version (${meta.latest})`);
	} else {
		log(`${highlight(`${name}@${version}`)} not found`);
	}

	return meta;
}

export default check;

/**
 * Scans the current directory up to the root to find the `package.json`.
 *
 * @param {String} [cwd='.'] - The current working directory.
 * @returns {Promise} Resolves the path to the `package.json`.
 */
export async function findPackageJson(cwd) {
	if (cwd && typeof cwd !== 'string') {
		throw new TypeError('Expected cwd to be a string');
	}

	let dir = path.resolve(cwd || '');
	const { root } = path.parse(dir);

	while (true) {
		const file = path.join(dir, 'package.json');
		if (await fs.exists(file)) {
			log(`Found ${highlight(file)}`);
			return file;
		}
		if (dir === root) {
			throw new Error('Unable to find a package.json');
		}
		dir = path.dirname(dir);
	}
}

/**
 * Loads the specified meta file and sanity checks it.
 *
 * @param {String} metaFile - The path of the file to load.
 * @returns {Object}
 */
async function loadMetaFile(metaFile) {
	try {
		// read the meta file
		log(`Loading meta file: ${highlight(metaFile)}`);
		const meta = await fs.readJson(metaFile);
		if (meta && typeof meta === 'object') {
			return meta;
		}
	} catch (e) {
		// meta file does not exist or is malformed
	}

	return null;
}

/**
 * Attempts to read and parse the `package.json` file.
 *
 * @param {Object} [opts] - Various options.
 * @param {String} [opts.cwd] - The current working directory.
 * @param {String} [opts.pkg] - The path to the `package.json`.
 * @returns {Promise} Resolves the parsed `package.json` object.
 */
export async function loadPackageJson(opts = {}) {
	if (!opts || typeof opts !== 'object') {
		throw new TypeError('Expected options to be an object');
	}

	let { pkg } = opts;

	if (!pkg) {
		// scan directories to find the package.json
		pkg = await findPackageJson(opts.cwd);
	}

	if (typeof pkg === 'string') {
		let contents;
		try {
			contents = await fs.readFile(pkg, 'utf8');
		} catch (err) {
			if (err.code === 'ENOENT') {
				err.message = `File not found: ${pkg}`;
			} else {
				err.message = `Failed to read file: ${pkg} (${err.message})`;
			}
			throw err;
		}

		try {
			pkg = JSON.parse(contents);
		} catch (err) {
			err.message = `Failed to parse package.json: ${err.message}`;
			throw err;
		}
	}

	// validate parsed package.json object
	if (!pkg || typeof pkg !== 'object') {
		throw new TypeError('Expected pkg to be a parsed package.json object');
	}

	return pkg;
}

/**
 * Retrieves the latest version associated with the specified dist tag.
 *
 * @param {String} name - The package name.
 * @param {String} distTag - The name of the distribution tag to return.
 * @param {Object} [opts] - Options to initialized the request client.
 * @returns {Promise} Resolves the latest version or `null` if not found.
 */
async function getLatestVersion(name, distTag, opts) {
	const p = name.indexOf('/');
	const regUrl = opts.registryUrl || (await import('registry-auth-token/registry-url.js')).default(p !== -1 ? name.substring(0, p) : '');
	const got = request.init(opts);
	const reqOpts = {
		followRedirect: true,
		headers: {
			accept: 'application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*'
		},
		responseType: 'json',
		retry: 0,
		timeout: {
			request: Object.prototype.hasOwnProperty.call(opts, 'timeout') ? opts.timeout : 1000
		},
		url: new URL(encodeURIComponent(name).replace(/^%40/, '@'), regUrl)
	};
	let info;

	while (!info) {
		try {
			info = (await got(reqOpts)).body;
		} catch (err) {
			if (err.code === 'ECONNREFUSED') {
				err.message = `Failed to connect to npm registry: ${err.message}`;
				throw err;
			}

			if (!err.response || !String(err.response.statusCode).startsWith(4)) {
				error(`Failed to query registry: ${err.message}`);
				throw err;
			}

			if (err.response.statusCode === 404) {
				const error = new Error(`Response code ${err.response.statusCode} (${err.response.statusMessage})`);
				error.code = 'ENOTFOUND';
				throw error;
			}

			if (reqOpts.headers.authorization) {
				// we already tried, bail out
				return null;
			}

			// package does not exist or we can't access it
			const authInfo = (await import('registry-auth-token')).default(regUrl, { recursive: true });
			if (!authInfo) {
				// no auth info, bail out
				return null;
			}

			reqOpts.headers.authorization = `${authInfo.type} ${authInfo.token}`;
			warn('Request failed, retrying with authorization header...');
		}
	}

	if (!info || typeof info !== 'object') {
		throw new TypeError('Expected registry package info to be an object');
	}

	const version = info['dist-tags']?.[distTag];
	if (!version) {
		throw new Error(`Distribution tag "${distTag}" does not exist`);
	}

	return version;
}
