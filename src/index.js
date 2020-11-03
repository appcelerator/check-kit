/* istanbul ignore if */
if (!Error.prepareStackTrace) {
	require('source-map-support/register');
}

import fs from 'fs';
import path from 'path';
import semver from 'semver';
import snooplogg from 'snooplogg';
import * as request from '@axway/amplify-request';
import { promisify } from 'util';

const exists = file => promisify(fs.access)(file).then(() => true).catch(() => false);
const readFile = promisify(fs.readFile);

const { error, log, warn } = snooplogg('check-kit');
const { highlight } = snooplogg.styles;

/**
 * Checks if there's an new version of a package is available.
 *
 * @param {Object} [opts] - Various options.
 * @access public
 */
export async function check(opts = {}) {
	if (!opts || typeof opts !== 'object') {
		throw new TypeError('Expected options to be an object');
	}

	let { cwd, distTag = 'latest', pkg } = opts;

	if (cwd && typeof cwd !== 'string') {
		throw new TypeError('Expected cwd to be a string');
	}

	if (!distTag || typeof distTag !== 'string') {
		throw new TypeError('Expected distTag to be a non-empty string');
	}

	if (!pkg) {
		// scan directories to find the package.json
		pkg = await findPackage(cwd);
	}

	if (typeof pkg === 'string') {
		// try to read the package.json
		pkg = await loadPackage(pkg);
	}

	// validate parsed package.json object
	if (!pkg || typeof pkg !== 'object') {
		throw new TypeError('Expected pkg to be a parsed package.json object');
	}

	const { name, version } = pkg;

	if (!name || typeof name !== 'string') {
		throw new Error('Expected name in package.json to be a non-empty string');
	}

	if (!version || typeof version !== 'string') {
		throw new Error('Expected version in package.json to be a non-empty string');
	}

	// get the latest version
	const latest = await getLatestVersion(name, distTag, opts);
	const update = latest ? semver.gt(latest, version) : false;

	if (update) {
		log(`${highlight(`${name}@${version}`)} has newer version ${highlight(latest)} available`);
	} else {
		log(`${highlight(`${name}@${version}`)} is already the latest version`);
	}

	return {
		current: version,
		distTag,
		latest,
		name,
		update
	};
}

export default check;

/**
 * Scans the current directory up to the root to find the `package.json`.
 *
 * @param {String} [cwd] - The current working directory.
 * @returns {Promise} Resolves the path to the `package.json`.
 */
async function findPackage(cwd) {
	let dir = path.resolve(cwd || '');
	const { root } = path.parse(dir);

	while (true) {
		const file = path.join(dir, 'package.json');
		if (await exists(file)) {
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
 * Attempts to read and parse the `package.json` file.
 *
 * @param {String} file - The path to the `package.json`.
 * @returns {Promise} Resolves the parsed `package.json` object.
 */
async function loadPackage(file) {
	let contents;
	try {
		contents = await readFile(file, 'utf8');
	} catch (err) {
		if (err.code === 'ENOENT') {
			err.message = `File not found: ${file}`;
		} else {
			err.message = `Failed to read file: ${file} (${err.message})`;
		}
		throw err;
	}

	try {
		return JSON.parse(contents);
	} catch (err) {
		err.message = `Failed to parse package.json: ${err.message}`;
		throw err;
	}
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
	const regUrl = opts.registryUrl || require('registry-auth-token/registry-url')(p !== -1 ? name.substring(0, p) : '');
	const got = request.init(opts);
	const reqOpts = {
		headers: {
			accept: 'application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*'
		},
		responseType: 'json',
		retry: 0,
		url: new URL(encodeURIComponent(name).replace(/^%40/, '@'), regUrl)
	};
	let info;

	while (!info) {
		try {
			info = (await got(reqOpts)).body;
		} catch (err) {
			if (err.code === 'ECONNREFUSED') {
				err.message = 'Failed to connect to npm registry';
			}

			if (!err.response || !String(err.response.statusCode).startsWith(4)) {
				error(`Failed to query registry: ${err.message}`);
				throw err;
			}

			if (reqOpts.headers.authorization) {
				// we already tried, bail out
				return null;
			}

			// package does not exist or we can't access it
			const authInfo = require('registry-auth-token')(regUrl, { recursive: true });
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
