# Block Defense

Minimal 2D top-down multiplayer browser shooter with:

- Node.js server
- Socket.io networking
- HTML5 Canvas client
- client-side prediction
- server reconciliation
- interpolation for remote players

## Project structure

```text
.
|-- client
|   |-- input.js
|   |-- main.js
|   |-- network.js
|   |-- player.js
|   `-- render.js
|-- public
|   |-- index.html
|   `-- styles.css
|-- render.yaml
|-- server
|   |-- combat.js
|   |-- game.js
|   |-- players.js
|   `-- server.js
|-- shared
|   |-- constants.js
|   `-- utils.js
`-- package.json
```

## Local run

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the server:

   ```bash
   npm start
   ```

3. Open the game in a browser:

   ```text
   http://localhost:3000
   ```

4. Open multiple tabs or multiple browsers to test multiplayer locally.

## Render deployment

You can deploy this project as a **Web Service** on Render.

### Option A: render.yaml

1. Push the project to GitHub.
2. In Render, create a new Blueprint or Web Service connected to the repository.
3. Render will detect `render.yaml` and use:
   - Build command: `npm install`
   - Start command: `npm start`
4. Deploy.

### Option B: manual service setup

1. Push the project to GitHub.
2. In Render Dashboard, create **New > Web Service**.
3. Connect the repository.
4. Use:
   - Runtime: `Node`
   - Build command: `npm install`
   - Start command: `npm start`
5. Deploy the service.

## Notes

- The server binds to `0.0.0.0` and uses `process.env.PORT`, which is required on Render.
- Render will serve both the Socket.io server and static client from the same Node service.
- The game uses a server-authoritative state model. Clients send only movement and shooting input.
