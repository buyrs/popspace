const Middleware = require("./middleware")
const AsyncLock = require("async-lock")
const lock = new AsyncLock()

let initialized = false
let middleware = null

const allowReturnFromEmptyEventLoop = async (event, context) => {
  // https://www.jeremydaly.com/reuse-database-connections-aws-lambda/
  context.callbackWaitsForEmptyEventLoop = false
  return false
}

const parseParams = async (event, context) => {
  const contentType =
    event.headers["Content-Type"] || event.headers["content-type"]
  if (contentType === "application/json") {
    const body = JSON.parse(event.body)
    context.params = body || {}
  } else {
    context.params = {}
  }
  return false
}

const base64Decode = (str) => Buffer.from(str, "base64").toString("utf-8")

const getUser = async (event, context) => {
  // support Authorization header with a bearer token,
  // fallback to a `token` field on a POST body
  const authHeader = event.headers.authorization || event.headers.Authorization
  const token =
    authHeader && authHeader.startsWith("Bearer")
      ? base64Decode(authHeader.replace("Bearer ", ""))
      : context.params.token

  if (!token) {
    return false
  }
  const session = await db.accounts.sessionFromToken(token)
  if (!session) {
    return false
  }
  const userId = parseInt(session.user_id)
  const user = await db.accounts.userById(userId)
  if (!user) {
    return false
  }
  context.user = user
  context.session = session
  if(context.params) {
    // TODO: This is a compatibility layer for passing in tokens via body
    // As we move away from that style, we should migrate endpoints that rely on having the token
    // There are probably some wins we can have with downstream brevity,
    // e.g. usually the token is converted to a session, and thatt
    // could be part of the data the middleware always passes down
    context.params.token = token
  }
  return false
}

module.exports = {
  init: async () => {
    await lock.acquire("with_netlify_middleware", async () => {
      if (middleware) {
        // Protect against netlify race conditions for warm context reuse
        return
      }
      middleware = new Middleware()
      const result = []

      middleware.add(allowReturnFromEmptyEventLoop)
      middleware.add(parseParams)
      middleware.add(getUser)

      return middleware
    })
    return middleware
  }
}
