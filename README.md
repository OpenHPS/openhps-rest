<h1 align="center">
  <img alt="OpenHPS" src="https://openhps.org/images/logo_text-512.png" width="40%" /><br />
  @openhps/rest
</h1>
<p align="center">
    <a href="https://github.com/OpenHPS/openhps-rest/actions/workflows/main.yml" target="_blank">
        <img alt="Build Status" src="https://github.com/OpenHPS/openhps-rest/actions/workflows/main.yml/badge.svg">
    </a>
    <a href="https://badge.fury.io/js/@openhps%2Frest">
        <img src="https://badge.fury.io/js/@openhps%2Frest.svg" alt="npm version" height="18">
    </a>
</p>

<h3 align="center">
    <a href="https://github.com/OpenHPS/openhps-core">@openhps/core</a> &mdash; <a href="https://openhps.org/docs/rest">API</a>
</h3>

<br />

This repository contains the REST API component for OpenHPS (Open Source Hybrid Positioning System). It includes nodes for handling remote connections.

OpenHPS is a data processing positioning framework. It is designed to support many different use cases ranging from simple positioning such as detecting the position of a pawn on a chessboard using RFID, to indoor positioning methods using multiple cameras.

## Features

## Getting Started

If you have [npm installed](https://www.npmjs.com/get-npm), start using @openhps/rest with the following command.

```bash
npm install @openhps/rest --save
```

## Usage

> **express 5**: `@openhps/rest` requires `express@^5`. The `path` you pass to a
> server node goes straight to the express router, and express 5 replaced
> path-to-regexp 0.x with 8.x, so a few patterns that worked under express 4 now
> throw at route-registration time:
>
> | express 4       | express 5                   |
> | --------------- | --------------------------- |
> | `/api/*`        | `/api/*splat`               |
> | `/api/:id?`     | `/api/{:id}`                |
> | `/api/:id(\d+)` | validate inside the handler |
>
> Plain paths such as `/api/v1` are unaffected.

### Server (Push-based)

```typescript
import * as express from 'express';
import * as bodyParser from 'body-parser';

const app = express();
app.use(bodyParser.json()); // Body parser is required
server = app.listen(1555, () => {
    ModelBuilder.create()
        .from(
            new RESTServerSource({
                express: app,
                path: '/api/v1',
            }),
        )
        .to(/* ... */)
        .build()
        .then((model) => {
            // Server listening on port 1555
            // endpoint: 127.0.0.1:1555/api/v1
        });
});
```

### Client (Push-based)

```typescript
ModelBuilder.create()
    .from(/* ... */)
    .to(
        new RESTClientSink({
            url: 'http://localhost:1555/api/v1',
        }),
    )
    .build()
    .then((model) => {});
```

### Middleware

The server supports the addition of middleware for the push and pull actions.

```typescript
import * as express from 'express';
import * as bodyParser from 'body-parser';

const app = express();
app.use(bodyParser.json()); // Body parser is required
server = app.listen(1555, () => {
    ModelBuilder.create()
        .from(
            new RESTServerSource({
                express: app,
                path: '/api/v1',
                middleware: [
                    (req, res, next) => {
                        if (req.body.token === 'abc') {
                            next();
                        } else {
                            next(new Error('Unauthorized!'));
                        }
                    },
                ],
            }),
        )
        .to(/* ... */)
        .build()
        .then((model) => {
            // Server listening on port 1555
            // endpoint: 127.0.0.1:1555/api/v1
        });
});
```

### Client Authentication

Client authentication can be achieved by providing it in the configuration options.
More information about available options can be found [here](https://axios-http.com/docs/req_config).

```typescript
ModelBuilder.create()
    .from(/* ... */)
    .to(
        new RESTClientSink({
            url: 'http://localhost:1555/api/v1',
            config: {
                auth: {
                    username: 'test',
                    password: '123',
                },
            },
        }),
    )
    .build()
    .then((model) => {});
```

## Contributors

The framework is open source and was developed as part of the PhD of Maxim Van de Wynckel under the supervision of Prof. Dr. Beat Signer. It is currently maintained by [MVdW-Software](https://mvdw-software.com).

## Contributing

Use of OpenHPS, contributions and feedback is highly appreciated. Please read our [contributing guidelines](https://github.com/OpenHPS/.github/blob/HEAD/CONTRIBUTING.md) for more information.

## License

Copyright (C) 2019-2024 Maxim Van de Wynckel & Vrije Universiteit Brussel

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
