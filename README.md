# BlowThemAll NodeJS server

## Dependencies

This server uses npm to manage the dependencies. You can see them all in
`package.json`. Here is a list of dependencies that **you** must provide:

- Node.js 0.12.x
- npm 2.5.x
- Redis

## Running

You can set the following environment variables to change the server behaviour:

- `npm_package_config_port`: Change the server default port.

You can change these settings also through npm. For instance, if you run:

    npm config set blowthemall:port 8001

Then, when you run execute `npm start`, you'll use this new value.

## LICENSE

The project is licensed under the LGPLv3, or, at your opinion, any later
version.
