import { buildServer } from "./app.js";
import { createFileDemoStore } from "./data.js";

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "127.0.0.1";
const store = process.env.VOTE_STORE_PATH ? await createFileDemoStore(process.env.VOTE_STORE_PATH) : undefined;
const server = await buildServer({ store });

await server.listen({ host, port });
