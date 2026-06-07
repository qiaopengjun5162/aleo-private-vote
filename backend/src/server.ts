import { buildServer } from "./app.js";

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "127.0.0.1";
const server = await buildServer();

await server.listen({ host, port });
