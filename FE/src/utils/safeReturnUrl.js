export function getSafeReturnUrl(search) {
  const requestedUrl = new URLSearchParams(search).get("returnUrl");
  if (
    !requestedUrl ||
    !requestedUrl.startsWith("/") ||
    requestedUrl.startsWith("//") ||
    requestedUrl.includes("\\")
  ) {
    return "/";
  }

  return requestedUrl;
}
