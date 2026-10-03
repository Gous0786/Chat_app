// 02 — Authentication capacity.
// Both endpoints run BCrypt (cost 10) on the request thread, which is
// deliberately slow CPU work. Expect this to be the lowest-capacity path and
// to saturate the backend's CPU rather than the database.
import http from 'k6/http';
import {
  BASE_URL, HTTP_TIMEOUT, data, pick, tags, parseList, httpStaircases, summarize, markSetupEnd,
} from '../lib/common.js';

const ENDPOINTS = [
  { name: 'login', exec: 'login', label: 'POST /auth/login',
    levels: parseList(__ENV.LOGIN_RATES, [2, 5, 10, 15, 20, 30, 45, 60]) },
  { name: 'signup', exec: 'signup', label: 'POST /auth/signup',
    levels: parseList(__ENV.SIGNUP_RATES, [2, 5, 10, 15, 20, 30, 45, 60]) },
];

const built = httpStaircases(ENDPOINTS);
export const options = built.options;
export const handleSummary = summarize('02-auth', built.plans);
export function setup() { return markSetupEnd(); }

const JSON_HDR = { 'Content-Type': 'application/json' };

export function login() {
  const u = pick(data().users);
  http.post(`${BASE_URL}/auth/login`, JSON.stringify({ email: u.email, password: 'Passw0rd!load' }),
    { headers: JSON_HDR, tags: tags('login'), timeout: HTTP_TIMEOUT });
}

export function signup() {
  const email = `su-${__VU}-${__ITER}-${Date.now()}@load.test`;
  http.post(`${BASE_URL}/auth/signup`, JSON.stringify({ email, full_name: 'Signup Load', password: 'x12345678' }),
    { headers: JSON_HDR, tags: tags('signup'), timeout: HTTP_TIMEOUT });
}
