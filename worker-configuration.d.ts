declare namespace Cloudflare {
  interface Env {
    OAUTH_KV: KVNamespace;
    PINTEREST_CLIENT_ID: string;
    PINTEREST_CLIENT_SECRET: string;
    COOKIE_ENCRYPTION_KEY: string;
    MCP_OBJECT: DurableObjectNamespace<import("./src/index").PinterestMCP>;
  }
}

interface Env extends Cloudflare.Env {}
