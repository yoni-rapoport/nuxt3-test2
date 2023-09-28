import { GenericResponse, createRemultServer } from "remult/server";
import { Task } from "../../shared/task";
import { H3Event } from "h3";
import { ResponseRequiredForSSE } from "remult/SseSubscriptionServer";

const api = createRemultServer<H3Event>(
  {
    entities: [Task],
  },
  {
    buildGenericRequestInfo: (event) => {
      return {
        method: event.node.req.method,
        url: event.node.req.url,
        on: (a: "close", b: () => void) =>
          event.node.req.on("close", () => {
            b();
          }),
      };
    },
    getRequestBody: async (event) => readBody(event),
  }
);

export default defineEventHandler(async (event) => {
  let sse = false;

  const response: GenericResponse & ResponseRequiredForSSE = {
    end: () => {},
    json: () => {},
    status: () => {
      return response;
    },
    write: (what) => {
      event.node.res.write(what);
    },
    writeHead: (status, headers) => {
      sse = true;
      event.node.res.writeHead(status, headers);
    },
  };
  const r = await api.handle(event, response);

  if (sse) {
    await new Promise((resolve) => {
      event.node.req.on("close", () => resolve({}));
    });
  }
  if (r) {
    return r.data;
  }
});
