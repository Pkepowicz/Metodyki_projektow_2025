import { getToken } from "./auth";

/**
 * Usage: const response = await post(route, body)
 * @param apiRoute string e.g. "auth/login"
 * @param body object e.g. {email: "email@m.com", password: "password"}
 * @param withToken boolean, if Bearer token needs to be included in headers, default: true
 * @returns
 */
export async function post(
  apiRoute: string,
  body: object,
  withToken: boolean = true
): Promise<Response> {
  const token = await getToken();
  return fetch("https://leakchecker.mwalas.pl/api/v1/" + apiRoute, {
    method: "POST",
    headers: withToken
      ? {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        }
      : {
          "Content-Type": "application/json",
        },
    body: JSON.stringify(body),
  });
}

/**
 * Usage: const response = await get(route)
 * @param apiRoute string e.g. "auth/login"
 * @returns
 */
export async function get(apiRoute: string): Promise<Response> {
  const token = await getToken();
  return fetch("https://leakchecker.mwalas.pl/api/v1/" + apiRoute, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
}


/**
 * PUT request with auth token
 * @param apiRoute
 * @param body 
 * @returns 
 */
export async function put(apiRoute: string, body: any): Promise<Response> {
  const token = await getToken();
  return fetch("https://leakchecker.mwalas.pl/api/v1/" + apiRoute, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

/**
 * DELETE request with auth token
 * @param apiRoute 
 * @returns 
 */
export async function del(apiRoute: string): Promise<Response> {
  const token = await getToken();
  return fetch("https://leakchecker.mwalas.pl/api/v1/" + apiRoute, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
}