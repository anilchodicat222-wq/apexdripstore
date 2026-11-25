// Server-side authorization for the owner dashboard.
// The browser sends the Netlify Identity access token in the Authorization header.
// We never trust the token's contents on their own: the Identity service validates it
// and returns the user, and only users with the "admin" role (set by the site owner in
// the Netlify dashboard, not changeable by users) are allowed through.

const ADMIN_ROLE = "admin";

function identityBase(request) {
  const configured = process.env.URL;
  try {
    if (configured) return new URL("/.netlify/identity", configured).href;
  } catch {}
  return new URL("/.netlify/identity", request.url).href;
}

export async function getAdmin(request) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+([A-Za-z0-9._-]{20,4096})$/);
  if (!match) return { status: 401, error: "Sign in required." };
  let response;
  try {
    response = await fetch(`${identityBase(request)}/user`, {
      headers: { authorization: `Bearer ${match[1]}` },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return { status: 503, error: "Identity service unavailable. Try again shortly." };
  }
  if (!response.ok) return { status: 401, error: "Your session has expired. Sign in again." };
  const user = await response.json().catch(() => null);
  const roles = Array.isArray(user?.app_metadata?.roles) ? user.app_metadata.roles : [];
  if (!user?.id) return { status: 401, error: "Sign in required." };
  if (!roles.includes(ADMIN_ROLE)) return { status: 403, error: "This account does not have owner access." };
  return { user: { id: user.id, email: user.email, roles } };
}
