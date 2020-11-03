import check from '../dist/index';
import http from 'http';
import path from 'path';
import snooplogg from 'snooplogg';

const { log } = snooplogg('test:check-kit');
const { highlight } = snooplogg.styles;

describe('check-kit', function () {
	describe('Error handling', () => {
		it('should error if options is not an object', async () => {
			await expect(check('foo')).to.eventually.be.rejectedWith(TypeError, 'Expected options to be an object');
			await expect(check(123)).to.eventually.be.rejectedWith(TypeError, 'Expected options to be an object');
		});

		it('should error if cwd is invalid', async () => {
			await expect(check({
				cwd: 123
			})).to.eventually.be.rejectedWith(TypeError, 'Expected cwd to be a string');
		});

		it('should error if distTag is invalid', async () => {
			await expect(check({
				distTag: 123
			})).to.eventually.be.rejectedWith(TypeError, 'Expected distTag to be a non-empty string');

			await expect(check({
				distTag: ''
			})).to.eventually.be.rejectedWith(TypeError, 'Expected distTag to be a non-empty string');

			await expect(check({
				distTag: null
			})).to.eventually.be.rejectedWith(TypeError, 'Expected distTag to be a non-empty string');
		});

		it('should error if package.json is not found', async () => {
			await expect(check({
				cwd: '/'
			})).to.eventually.be.rejectedWith(Error, 'Unable to find a package.json');
		});

		it('should error if package.json does not exist', async () => {
			await expect(check({
				pkg: '/does-not-exist'
			})).to.eventually.be.rejectedWith(Error, 'File not found: /does-not-exist');
		});

		it('should error if pkg is a directory', async () => {
			await expect(check({
				pkg: __dirname
			})).to.eventually.be.rejectedWith(Error, `Failed to read file: ${__dirname}`);
		});
	});

	describe('package.json', () => {
		it('should error if package.json is malformed', async () => {
			await expect(check({
				pkg: path.resolve(__dirname, 'fixtures/malformed/package.json')
			})).to.eventually.be.rejectedWith(Error, 'Failed to parse package.json: Unexpected token { in JSON at position 1');
		});

		it('should error if pkg is not an object', async () => {
			await expect(check({
				pkg: path.resolve(__dirname, 'fixtures/no-object/package.json')
			})).to.eventually.be.rejectedWith(Error, 'Expected pkg to be a parsed package.json object');

			await expect(check({
				pkg: 123
			})).to.eventually.be.rejectedWith(Error, 'Expected pkg to be a parsed package.json object');
		});

		it('should error if package.json has no name', async () => {
			await expect(check({
				pkg: path.resolve(__dirname, 'fixtures/no-name/package.json')
			})).to.eventually.be.rejectedWith(Error, 'Expected name in package.json to be a non-empty string');
		});

		it('should error if package.json has no version', async () => {
			await expect(check({
				pkg: path.resolve(__dirname, 'fixtures/no-version/package.json')
			})).to.eventually.be.rejectedWith(Error, 'Expected version in package.json to be a non-empty string');
		});

		it('should check a valid package.json', async () => {
			const result = await check({
				pkg: path.resolve(__dirname, 'fixtures/good/package.json')
			});

			expect(result.current).to.equal('1.2.3');
			expect(result.distTag).to.equal('latest');
			expect(result.latest).to.not.equal(null);
			expect(result.update).to.equal(true);
		});

		it('should check a valid package.json with scoped name', async () => {
			const result = await check({
				pkg: path.resolve(__dirname, 'fixtures/good-scoped/package.json')
			});

			expect(result.current).to.equal('1.2.3');
			expect(result.distTag).to.equal('latest');
			expect(result.latest).to.not.equal(null);
			expect(result.update).to.equal(true);
		});

		it('should scan and check a valid package.json', async () => {
			const result = await check({
				cwd: path.resolve(__dirname, 'fixtures/good-latest/empty')
			});

			expect(result.current).to.equal('99.9.9');
			expect(result.distTag).to.equal('latest');
			expect(result.latest).to.not.equal(null);
			expect(result.update).to.equal(false);
		});
	});

	describe('pkg object', () => {
		it('should error if pkg has no name', async () => {
			await expect(check({
				pkg: {}
			})).to.eventually.be.rejectedWith(Error, 'Expected name in package.json to be a non-empty string');
		});

		it('should error if pkg has no version', async () => {
			await expect(check({
				pkg: { name: 'foo' }
			})).to.eventually.be.rejectedWith(Error, 'Expected version in package.json to be a non-empty string');
		});

		it('should check a valid pkg object', async () => {
			const result = await check({
				pkg: {
					name: 'cli-kit',
					version: '0.0.1'
				}
			});

			expect(result.current).to.equal('0.0.1');
			expect(result.distTag).to.equal('latest');
			expect(result.latest).to.not.equal(null);
			expect(result.update).to.equal(true);
		});

		it('should fail to find non-existent package', async () => {
			const result = await check({
				pkg: {
					name: 'th1s-packag3-do3s-not-ex1st',
					version: '1.2.3'
				}
			});

			expect(result.current).to.equal('1.2.3');
			expect(result.distTag).to.equal('latest');
			expect(result.latest).to.equal(null);
			expect(result.update).to.equal(false);
		});

		it('should error if dist tag does not exist', async () => {
			await expect(check({
				distTag: 'foo',
				pkg: {
					name: 'cli-kit',
					version: '1.2.3'
				}
			})).to.eventually.be.rejectedWith(Error, 'Distribution tag "foo" does not exist');
		});
	});

	describe('registry', async () => {
		before(async function () {
			// start the web server
			await new Promise(resolve =>  {
				this.connections = {};
				this.server = http.createServer((req, res) => {
					switch (req.url) {
						case '/restricted-package':
							res.writeHead(401);
							res.end('Not authorized');
							break;

						case '/bad-pkg':
							res.writeHead(200);
							res.end('{{{{');
							break;

						case '/no-object':
							res.writeHead(200);
							res.end('"hi"');
							break;

						case '/no-ver':
							res.writeHead(200);
							res.end('{"name":"no-ver"}');
							break;

						case '/bar':
							res.writeHead(500);
							res.end('Server error');
							break;

						default:
							res.writeHead(404);
							res.end('Not found');
					}
				}).on('connection', conn => {
					const key = conn.remoteAddress + ':' + conn.remotePort;
					log(`Received incoming connection from ${highlight(key)}`);
					this.connections[key] = conn.on('close', () => {
						delete this.connections[key];
					});
				}).listen(1337, () => {
					log('Local HTTP server listening on port 1337');
					resolve();
				});
			});
		});

		after(async function () {
			// stop the web server
			const conns = Object.keys(this.connections);
			log(`Stopping local HTTP server (${conns.length} connection${conns !== 1 ? 's' : ''})`);
			for (const key of conns) {
				this.connections[key].destroy();
				delete this.connections[key];
			}
			await new Promise(resolve => this.server.close(resolve));
		});

		it('should not resolve latest if package not found', async () => {
			const result = await check({
				pkg: {
					name: 'does-not-exist',
					version: '1.2.3'
				},
				registryUrl: 'http://localhost:1337'
			});

			expect(result.current).to.equal('1.2.3');
			expect(result.distTag).to.equal('latest');
			expect(result.latest).to.equal(null);
			expect(result.update).to.equal(false);
		});

		it('should error if no access to package', async () => {
			const result = await check({
				pkg: {
					name: 'does-not-exist',
					version: '1.2.3'
				},
				registryUrl: 'http://127.0.0.1:1337'
			});

			expect(result.current).to.equal('1.2.3');
			expect(result.distTag).to.equal('latest');
			expect(result.latest).to.equal(null);
			expect(result.update).to.equal(false);
		});

		it('should error if failed to connect to registry', async function () {
			this.timeout(5000);
			this.slow(4000);

			await expect(check({
				pkg: {
					name: 'foo',
					version: '1.2.3'
				},
				registryUrl: 'http://127.0.0.1:1338'
			})).to.eventually.be.rejectedWith(Error, 'Failed to connect to npm registry');
		});

		it('should error if registry return 500', async () => {
			await expect(check({
				pkg: {
					name: 'bar',
					version: '1.2.3'
				},
				registryUrl: 'http://127.0.0.1:1337'
			})).to.eventually.be.rejectedWith(Error, 'Response code 500 (Internal Server Error)');
		});

		it('should error if registry returned bad JSON response', async () => {
			await expect(check({
				pkg: {
					name: 'bad-pkg',
					version: '1.2.3'
				},
				registryUrl: 'http://127.0.0.1:1337'
			})).to.eventually.be.rejectedWith(Error, /^Unexpected token { in JSON at position/);
		});

		it('should error if registry returned non-object JSON response', async () => {
			await expect(check({
				pkg: {
					name: 'no-object',
					version: '1.2.3'
				},
				registryUrl: 'http://127.0.0.1:1337'
			})).to.eventually.be.rejectedWith(TypeError, 'Expected registry package info to be an object');
		});

		it('should error if registry returned JSON response without a version', async () => {
			await expect(check({
				pkg: {
					name: 'no-ver',
					version: '1.2.3'
				},
				registryUrl: 'http://127.0.0.1:1337'
			})).to.eventually.be.rejectedWith(Error, 'Distribution tag "latest" does not exist');
		});
	});
});
